"""Agentic Design Agent — streaming Anthropic integration with tool use.

Handles one WebSocket session per use case. Loads history from DB on connect,
streams text + structured tool events back to the client.
"""
import json
import uuid
from typing import Any, AsyncIterator

import anthropic

from app.agents.prompts.agentic_design_agent import AGENTIC_DESIGN_SYSTEM_PROMPT
from app.services.llm_client import get_anthropic_client, reasoning_model

# ─── Tool definitions ─────────────────────────────────────────────────────────

AGENTIC_DESIGN_TOOLS: list[dict[str, Any]] = [
    {
        "name": "propose_agent_spec",
        "description": (
            "Propose a complete agent specification for a delegation cluster. "
            "Call this when you have gathered sufficient information through dialogue "
            "to populate all key sections of the agent requirements. "
            "Prefer a thorough spec over a partial one — ask more questions if needed."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "delegation_cluster_ref": {
                    "type": "string",
                    "description": "Name of the delegation cluster this spec is built from",
                },
                "name": {
                    "type": "string",
                    "description": "Agent name (e.g. 'Claims Triage Agent')",
                },
                "purpose": {
                    "type": "string",
                    "description": "1-2 sentence purpose statement for this agent",
                },
                "autonomy_level": {
                    "type": "string",
                    "enum": ["full_delegation", "supervised_execution", "assisted_mode"],
                    "description": "Agent autonomy level",
                },
                "activities": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Fully delegated activities (no human review needed)",
                },
                "supervised_activities": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "activity": {"type": "string"},
                            "hitl_trigger": {"type": "string"},
                            "human_action": {"type": "string"},
                        },
                        "required": ["activity"],
                    },
                    "description": "Activities where human review is required before action",
                },
                "out_of_scope": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Activities explicitly out of scope for this agent",
                },
                "data_sources": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "type": {"type": "string"},
                            "availability": {"type": "string"},
                            "access_method": {"type": "string"},
                        },
                        "required": ["name"],
                    },
                    "description": "Data sources the agent needs to access",
                },
                "mcp_servers": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "purpose": {"type": "string"},
                        },
                        "required": ["name"],
                    },
                    "description": "MCP servers required (indicative)",
                },
                "tools_apis": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "type": {"type": "string"},
                            "endpoint": {"type": "string"},
                        },
                        "required": ["name"],
                    },
                    "description": "Tools and APIs required",
                },
                "input_definition": {
                    "type": "object",
                    "properties": {
                        "trigger": {"type": "string"},
                        "format": {"type": "string"},
                        "variability": {"type": "string"},
                    },
                    "description": "How and when the agent is triggered and what it receives",
                },
                "output_definition": {
                    "type": "object",
                    "properties": {
                        "format": {"type": "string"},
                        "destination": {"type": "string"},
                        "success_criteria": {"type": "string"},
                    },
                    "description": "What the agent produces and where it goes",
                },
                "hitl_design": {
                    "type": "object",
                    "properties": {
                        "trigger_conditions": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "escalation_path": {"type": "string"},
                        "human_role": {"type": "string"},
                    },
                    "description": "Human-in-the-loop design",
                },
                "compliance": {
                    "type": "object",
                    "properties": {
                        "eu_ai_act_class": {
                            "type": "string",
                            "enum": ["Minimal Risk", "Limited Risk", "High Risk", "Prohibited"],
                        },
                        "gdpr_implications": {"type": "string"},
                        "audit_requirements": {"type": "string"},
                        "guardrails": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                    },
                    "description": "Compliance and regulatory assessment",
                },
                "open_questions": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Unresolved questions, data gaps, or blockers",
                },
            },
            "required": ["name", "purpose", "autonomy_level"],
        },
    },
    {
        "name": "flag_cross_agent_opportunity",
        "description": (
            "Flag a shared resource (data source, MCP server, or tool/API) that is used "
            "by two or more agents in this engagement. Call this proactively once you have "
            "2+ agent specs and identify overlap. Used to surface infrastructure reuse opportunities."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "resource_type": {
                    "type": "string",
                    "enum": ["data_source", "mcp_server", "tool_api"],
                    "description": "Category of the shared resource",
                },
                "resource_name": {
                    "type": "string",
                    "description": "Name of the shared resource",
                },
                "shared_by_agents": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Names of the agents that share this resource",
                },
                "reuse_recommendation": {
                    "type": "string",
                    "description": "Brief recommendation on how to handle the shared resource",
                },
            },
            "required": ["resource_type", "resource_name", "shared_by_agents", "reuse_recommendation"],
        },
    },
]


# ─── System prompt builder ────────────────────────────────────────────────────

def _build_system_prompt(
    clusters: list[dict[str, Any]],
    existing_specs: list[dict[str, Any]],
) -> str:
    """Extend static prompt with current engagement state injected as context."""
    state_parts: list[str] = [
        "\n\n## Current Engagement State",
        "",
    ]

    if clusters:
        state_parts.append("### Delegation Clusters (validated and scored)\n")
        for c in clusters:
            state_parts.append(f"**{c['name']}**")
            if c.get("purpose"):
                state_parts.append(f"Purpose: {c['purpose']}")

            cognitive_jtds = c.get("cognitive_jtds", [])
            if cognitive_jtds:
                state_parts.append("Cognitive JTDs:")
                for jtd in cognitive_jtds:
                    zone = f" [{jtd.get('cognitive_zone', '')}]" if jtd.get("cognitive_zone") else ""
                    intensity = f" (load: {jtd.get('load_intensity', '?')}/3)" if jtd.get("load_intensity") is not None else ""
                    state_parts.append(f"  - {jtd['description']}{zone}{intensity}")

            lived_jtds = c.get("lived_jtds", [])
            if lived_jtds:
                state_parts.append("Associated Lived JTDs:")
                for jtd in lived_jtds:
                    sys_ctx = f" [{jtd.get('system_context', '')}]" if jtd.get("system_context") else ""
                    state_parts.append(f"  - {jtd['description']}{sys_ctx}")

            scores = c.get("suitability_scores")
            if scores:
                avg = sum(scores.values()) / len(scores) if scores else 0
                state_parts.append(f"Suitability: {avg:.1f}/3 average across 9 dimensions")

            state_parts.append("")
    else:
        state_parts.append("No delegation clusters available yet. Wait for the consultant to complete discovery.")
        state_parts.append("")

    if existing_specs:
        state_parts.append("### Existing Agent Specifications\n")
        for s in existing_specs:
            state_parts.append(f"- **{s['name']}** ({s.get('autonomy_level', 'unset')}) — {s.get('purpose', '')[:80]}")
        state_parts.append("")

    state_parts.append(
        "Use the cluster context above — including both Cognitive JTDs and Lived JTDs — "
        "to ask targeted questions about integrations, data sources, compliance, and HITL requirements. "
        "Never ask generic questions that ignore this context."
    )

    return AGENTIC_DESIGN_SYSTEM_PROMPT + "\n".join(state_parts)


# ─── Streaming agent runner ───────────────────────────────────────────────────

async def run_agentic_design_stream(
    use_case_id: uuid.UUID,
    conversation_history: list[dict[str, Any]],
    new_user_content: list[dict[str, Any]],
    pending_tool_results: list[dict[str, Any]] | None = None,
    clusters: list[dict[str, Any]] | None = None,
    existing_specs: list[dict[str, Any]] | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """
    Stream agentic design agent responses as WebSocket events.

    Yields dicts with 'type' and associated fields:
    - {"type": "text_delta", "delta": str}
    - {"type": "agent_spec_proposed", "spec": dict}
    - {"type": "cross_agent_opportunity", "opportunity": dict}
    - {"type": "message_complete", "full_content": list}
    - {"type": "error", "message": str}
    """
    client = get_anthropic_client()
    system_prompt = _build_system_prompt(
        clusters=clusters or [],
        existing_specs=existing_specs or [],
    )

    messages = list(conversation_history)
    user_content: list[dict[str, Any]] = list(pending_tool_results or []) + list(new_user_content)
    messages.append({"role": "user", "content": user_content})

    full_content: list[dict[str, Any]] = []
    current_text = ""
    current_tool_use: dict[str, Any] | None = None
    current_tool_input_str = ""

    try:
        async with client.messages.stream(
            model=reasoning_model(),
            max_tokens=4096,
            system=system_prompt,
            tools=AGENTIC_DESIGN_TOOLS,  # type: ignore[arg-type]
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

                elif event_type == "content_block_delta":
                    delta = event.delta
                    if delta.type == "text_delta":
                        current_text += delta.text
                        yield {"type": "text_delta", "delta": delta.text}
                    elif delta.type == "input_json_delta":
                        current_tool_input_str += delta.partial_json

                elif event_type == "content_block_stop":
                    if current_text:
                        full_content.append({"type": "text", "text": current_text})
                        current_text = ""
                    elif current_tool_use is not None:
                        try:
                            tool_input = json.loads(current_tool_input_str) if current_tool_input_str else {}
                        except json.JSONDecodeError:
                            tool_input = {}

                        current_tool_use["input"] = tool_input
                        full_content.append(current_tool_use)

                        tool_name = current_tool_use["name"]
                        if tool_name == "propose_agent_spec":
                            yield {
                                "type": "agent_spec_proposed",
                                "spec": tool_input,
                            }
                        elif tool_name == "flag_cross_agent_opportunity":
                            yield {
                                "type": "cross_agent_opportunity",
                                "opportunity": tool_input,
                            }

                        current_tool_use = None
                        current_tool_input_str = ""

        yield {"type": "message_complete", "full_content": full_content}

    except anthropic.APIError as e:
        yield {"type": "error", "message": str(e)}
    except Exception as e:
        yield {"type": "error", "message": f"Unexpected error: {e}"}
