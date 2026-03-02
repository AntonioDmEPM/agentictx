"""Discovery Agent — streaming Anthropic integration with tool use.

Handles one WebSocket session per use case. Loads history from DB on connect,
streams text + structured tool events back to the client.
"""
import json
import uuid
from typing import Any, AsyncIterator

import anthropic

from app.agents.prompts.discovery_agent import DISCOVERY_SYSTEM_PROMPT
from app.services.llm_client import get_anthropic_client, reasoning_model

# ─── Tool definitions for structured extraction ───────────────────────────────

DISCOVERY_TOOLS: list[dict[str, Any]] = [
    {
        "name": "propose_lived_jtds",
        "description": (
            "Extract Lived JTDs — physical tasks, system interactions, and procedural steps "
            "that humans perform in their environment. Call this whenever you identify new "
            "task-level activity in the dialogue. Fully independent of Cognitive JTD extraction."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "jtds": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "description": {
                                "type": "string",
                                "description": "Clear description of the physical task or system interaction",
                            },
                            "system_context": {
                                "type": "string",
                                "description": "The system, tool, or environment where this task occurs (optional)",
                            },
                            "phase_name": {
                                "type": "string",
                                "description": "Name of the process phase this task belongs to. Must match an established phase name exactly.",
                            },
                        },
                        "required": ["description"],
                    },
                    "minItems": 1,
                }
            },
            "required": ["jtds"],
        },
    },
    {
        "name": "propose_cognitive_jtds",
        "description": (
            "Extract Cognitive JTDs — reasoning, judgment, interpretation, and decision-making "
            "that humans perform mentally. Call this whenever you identify cognitive activity "
            "in the dialogue. Fully independent of Lived JTD extraction."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "jtds": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "description": {
                                "type": "string",
                                "description": "Clear description of the reasoning or judgment activity",
                            },
                            "cognitive_zone": {
                                "type": "string",
                                "description": "The cognitive domain this falls into (e.g. 'risk assessment', 'data interpretation', 'exception triage')",
                            },
                            "load_intensity": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 3,
                                "description": "Cognitive load intensity: 0=pattern recognition, 1=analytical, 2=complex judgment, 3=expert synthesis",
                            },
                            "phase_name": {
                                "type": "string",
                                "description": "Name of the process phase this cognitive activity belongs to. Must match an established phase name exactly.",
                            },
                        },
                        "required": ["description", "load_intensity"],
                    },
                    "minItems": 1,
                }
            },
            "required": ["jtds"],
        },
    },
    {
        "name": "propose_process_phases",
        "description": (
            "Propose process phases — the major stages of the business process being analysed. "
            "Call this when you identify or confirm process phases from the conversation. Phases "
            "are the structural backbone that all JTDs and Cognitive Load items anchor to. "
            "You may call this multiple times as new phases emerge."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "phases": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "Short name for this process phase (e.g. 'Intake', 'Triage', 'Resolution')",
                            },
                            "description": {
                                "type": "string",
                                "description": "Brief description of what happens during this phase",
                            },
                            "sequence_order": {
                                "type": "integer",
                                "minimum": 0,
                                "description": "Position in the process sequence, starting from 0",
                            },
                        },
                        "required": ["name", "sequence_order"],
                    },
                    "minItems": 1,
                }
            },
            "required": ["phases"],
        },
    },
    {
        "name": "propose_delegation_cluster",
        "description": (
            "Propose a delegation cluster — a group of confirmed Cognitive JTDs that share "
            "sufficient purpose and context to be handled by a single agent. Call ONLY when "
            "enough confirmed material exists in both JTD streams. Cognitive JTDs are the "
            "primary clustering unit; Lived JTD references are optional context."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Short name for this delegation cluster (e.g. 'Claims Triage Agent')",
                },
                "purpose": {
                    "type": "string",
                    "description": "1-2 sentence statement of what this agent does and why",
                },
                "cognitive_jtd_refs": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Descriptions of the Cognitive JTDs included in this cluster",
                },
                "lived_jtd_refs": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional: descriptions of associated Lived JTDs for context",
                },
                "rationale": {
                    "type": "string",
                    "description": "Why these Cognitive JTDs belong together as a single delegation unit",
                },
            },
            "required": ["name", "purpose", "cognitive_jtd_refs", "rationale"],
        },
    },
]


# ─── Streaming agent runner ───────────────────────────────────────────────────

def _build_system_prompt(
    confirmed_lived_count: int,
    confirmed_cognitive_count: int,
    total_lived_count: int = 0,
    total_cognitive_count: int = 0,
    rejected_lived_count: int = 0,
    rejected_cognitive_count: int = 0,
    process_step_names: list[str] | None = None,
    active_clusters: list[dict[str, str]] | None = None,
) -> str:
    """Extend the static system prompt with live engagement state so the agent
    can evaluate completeness, phase awareness, and cluster gate/revision mode."""
    proposed_lived = total_lived_count - confirmed_lived_count - rejected_lived_count
    proposed_cognitive = total_cognitive_count - confirmed_cognitive_count - rejected_cognitive_count

    state = "\n\n## Engagement State\n"

    # 1. Extracted Material
    state += "\n### Extracted Material\n"
    state += (
        f"- JTDs: {confirmed_lived_count} confirmed, {proposed_lived} proposed, "
        f"{rejected_lived_count} rejected (total {total_lived_count})\n"
        f"- Cognitive Load: {confirmed_cognitive_count} confirmed, {proposed_cognitive} proposed, "
        f"{rejected_cognitive_count} rejected (total {total_cognitive_count})\n"
    )

    # 2. Process Phases
    state += "\n### Process Phases\n"
    if process_step_names:
        state += "Established phases: " + ", ".join(process_step_names) + "\n"
    else:
        state += (
            "None established yet. Identifying process phases should be your first "
            "priority — ask about the major stages of the process.\n"
        )

    # 3. Existing Delegation Clusters
    state += "\n### Existing Delegation Clusters\n"
    if active_clusters:
        for c in active_clusters:
            state += f"- {c['name']} (status: {c['status']})\n"
        state += (
            "\nYou are in REVISION MODE. The consultant may give feedback on these "
            "clusters — split, merge, rename, or reassign. Act on feedback directly "
            "and propose only the revised set.\n"
        )
    else:
        state += "None proposed yet.\n"

    # 4. Cluster Gate
    if (
        confirmed_lived_count >= 3
        and confirmed_cognitive_count >= 3
        and not active_clusters
    ):
        state += (
            "\n### Cluster Gate\n"
            "The gate condition is met — sufficient confirmed material exists in both "
            "streams. You should proactively suggest proposing delegation clusters "
            "in your next conversational response.\n"
        )

    return DISCOVERY_SYSTEM_PROMPT + state


async def run_discovery_stream(
    use_case_id: uuid.UUID,
    conversation_history: list[dict[str, Any]],
    new_user_content: list[dict[str, Any]],
    pending_tool_results: list[dict[str, Any]] | None = None,
    confirmed_lived_count: int = 0,
    confirmed_cognitive_count: int = 0,
    total_lived_count: int = 0,
    total_cognitive_count: int = 0,
    rejected_lived_count: int = 0,
    rejected_cognitive_count: int = 0,
    process_step_names: list[str] | None = None,
    active_clusters: list[dict[str, str]] | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """
    Stream discovery agent responses as WebSocket events.

    pending_tool_results — synthetic tool_result blocks produced by
    _build_anthropic_history that must be prepended to the new user message
    to satisfy the Anthropic API's alternating-role / tool-result pairing
    requirement.

    Yields dicts with 'type' and associated fields:
    - {"type": "text_delta", "delta": str}
    - {"type": "lived_jtds_proposed", "jtds": list}
    - {"type": "cognitive_jtds_proposed", "jtds": list}
    - {"type": "process_phases_proposed", "phases": list}
    - {"type": "cluster_proposed", "cluster": dict}
    - {"type": "message_complete", "full_content": list}
    - {"type": "error", "message": str}
    """
    client = get_anthropic_client()
    system_prompt = _build_system_prompt(
        confirmed_lived_count=confirmed_lived_count,
        confirmed_cognitive_count=confirmed_cognitive_count,
        total_lived_count=total_lived_count,
        total_cognitive_count=total_cognitive_count,
        rejected_lived_count=rejected_lived_count,
        rejected_cognitive_count=rejected_cognitive_count,
        process_step_names=process_step_names,
        active_clusters=active_clusters,
    )

    messages = list(conversation_history)
    # Prepend any tool_result blocks that close out the last assistant turn so
    # the API sees a well-formed alternating conversation before the new text.
    user_content: list[dict[str, Any]] = list(pending_tool_results or []) + list(new_user_content)
    # Merge into last message if it is already a user turn — avoids consecutive
    # user messages which the Anthropic API rejects with 400.
    if messages and messages[-1]["role"] == "user":
        messages[-1] = {
            "role": "user",
            "content": list(messages[-1]["content"]) + user_content,
        }
    else:
        messages.append({"role": "user", "content": user_content})

    full_content: list[dict[str, Any]] = []

    # Tool-use continuation: when Claude responds with only tool_use blocks
    # (stop_reason="tool_use"), we must send synthetic tool_result blocks back
    # and call the API again so it produces a text response.  Without this the
    # agent can end a turn silently — no text streamed to the conversation panel.
    MAX_TOOL_ROUNDS = 5

    try:
        for _round in range(MAX_TOOL_ROUNDS + 1):
            current_text = ""
            current_tool_use: dict[str, Any] | None = None
            current_tool_input_str = ""
            round_content: list[dict[str, Any]] = []
            stop_reason: str | None = None

            async with client.messages.stream(
                model=reasoning_model(),
                max_tokens=4096,
                system=system_prompt,
                tools=DISCOVERY_TOOLS,  # type: ignore[arg-type]
                messages=messages,  # type: ignore[arg-type]
            ) as stream:
                async for event in stream:
                    event_type = event.type

                    if event_type == "content_block_start":
                        block = event.content_block
                        if block.type == "text":
                            current_text = ""
                        elif block.type == "tool_use":
                            current_tool_use = {
                                "type": "tool_use",
                                "id": block.id,
                                "name": block.name,
                                "input": {},
                            }
                            current_tool_input_str = ""
                            yield {"type": "tool_call_started", "tool_name": block.name}

                    elif event_type == "content_block_delta":
                        delta = event.delta
                        if delta.type == "text_delta":
                            current_text += delta.text
                            yield {"type": "text_delta", "delta": delta.text}
                        elif delta.type == "input_json_delta":
                            current_tool_input_str += delta.partial_json

                    elif event_type == "content_block_stop":
                        if current_text:
                            round_content.append({"type": "text", "text": current_text})
                            current_text = ""
                        elif current_tool_use is not None:
                            # Parse accumulated tool input JSON
                            try:
                                tool_input = json.loads(current_tool_input_str) if current_tool_input_str else {}
                            except json.JSONDecodeError:
                                tool_input = {}

                            current_tool_use["input"] = tool_input
                            round_content.append(current_tool_use)

                            # Emit structured events per tool
                            tool_name = current_tool_use["name"]
                            if tool_name == "propose_lived_jtds":
                                yield {
                                    "type": "lived_jtds_proposed",
                                    "jtds": tool_input.get("jtds", []),
                                }
                            elif tool_name == "propose_cognitive_jtds":
                                yield {
                                    "type": "cognitive_jtds_proposed",
                                    "jtds": tool_input.get("jtds", []),
                                }
                            elif tool_name == "propose_process_phases":
                                yield {
                                    "type": "process_phases_proposed",
                                    "phases": tool_input.get("phases", []),
                                }
                            elif tool_name == "propose_delegation_cluster":
                                yield {
                                    "type": "cluster_proposed",
                                    "cluster": tool_input,
                                }

                            current_tool_use = None
                            current_tool_input_str = ""

                    elif event_type == "message_delta":
                        if hasattr(event.delta, "stop_reason"):
                            stop_reason = event.delta.stop_reason

            full_content.extend(round_content)

            # Only continue when Claude explicitly signals it expects tool results
            if stop_reason != "tool_use":
                break

            # Append the tool-only assistant turn and synthetic results so the
            # next API call sees a well-formed conversation and can produce text.
            messages.append({"role": "assistant", "content": round_content})
            tool_results: list[dict[str, Any]] = [
                {
                    "type": "tool_result",
                    "tool_use_id": block["id"],
                    "content": "Saved.",
                }
                for block in round_content
                if block.get("type") == "tool_use"
            ]
            messages.append({"role": "user", "content": tool_results})

        yield {"type": "message_complete", "full_content": full_content}

    except anthropic.APIError as e:
        yield {"type": "error", "message": str(e)}
    except Exception as e:
        yield {"type": "error", "message": f"Unexpected error: {e}"}
