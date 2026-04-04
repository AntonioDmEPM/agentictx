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
            "Propose a complete agent specification for an agent scope (delegation cluster). "
            "Call this when you have gathered sufficient information through dialogue "
            "to populate all key sections of the agent requirements. "
            "Prefer a thorough spec over a partial one — ask more questions if needed."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "delegation_cluster_ref": {
                    "type": "string",
                    "description": "Name of the agent scope (delegation cluster) this spec is built from",
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
                # ── Phase 5a: Architecture diagram fields ──────────────────
                "model": {
                    "type": "string",
                    "description": (
                        "LLM model identifier. Default: 'claude-sonnet-4-6'. "
                        "Use 'claude-opus-4-6' only for very high-complexity reasoning tasks. "
                        "Use 'claude-haiku-4-5-20251001' for high-volume, low-complexity tasks."
                    ),
                },
                "maturity_score": {
                    "type": "integer",
                    "description": (
                        "Specification completeness 0–100. Self-assess based on: "
                        "all activities defined (+20), integrations mapped (+20), "
                        "input/output channels specified (+20), compliance assessed (+20), "
                        "open questions < 3 (+20). Deduct for each gap."
                    ),
                },
                "prompt_requirements": {
                    "type": "object",
                    "properties": {
                        "system_prompt": {
                            "type": "object",
                            "properties": {
                                "description": {"type": "string"},
                                "estimated_tokens": {"type": "integer"},
                                "cache_hit_pct": {"type": "integer"},
                                "engineering_effort": {"type": "string"},
                            },
                            "required": ["description", "estimated_tokens", "cache_hit_pct"],
                        },
                        "dynamic_context": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "source": {"type": "string"},
                                    "estimated_tokens_per_call": {"type": "integer"},
                                    "cache_hit_pct": {"type": "integer"},
                                    "fetch_frequency": {"type": "string"},
                                },
                                "required": ["name", "source", "estimated_tokens_per_call", "cache_hit_pct"],
                            },
                        },
                        "few_shot_examples": {
                            "type": "object",
                            "properties": {
                                "description": {"type": "string"},
                                "estimated_tokens": {"type": "integer"},
                                "cache_hit_pct": {"type": "integer"},
                                "update_frequency": {"type": "string"},
                            },
                            "required": ["description", "estimated_tokens", "cache_hit_pct"],
                        },
                        "guardrails": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "description": {"type": "string"},
                                    "type": {
                                        "type": "string",
                                        "enum": ["safety", "compliance", "scope"],
                                    },
                                    "estimated_tokens": {"type": "integer"},
                                    "cache_hit_pct": {"type": "integer"},
                                },
                                "required": ["description", "type", "estimated_tokens", "cache_hit_pct"],
                            },
                        },
                    },
                    "description": (
                        "Prompt architecture. system_prompt: the static instruction layer (~300–800t, ~95% cached). "
                        "dynamic_context: data fetched per call from integrations (CRM record, KB results — variable, low cache). "
                        "few_shot_examples: example input/output pairs that stay in prompt (~200–500t, ~90% cached). "
                        "guardrails: safety/compliance/scope constraints appended to prompt (~50–200t each, ~95% cached). "
                        "Token estimates: use 1 token ≈ 4 chars of English text as a rough guide."
                    ),
                },
                "input_channels": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "type": {
                                "type": "string",
                                "enum": ["voice", "form", "system_event", "agent_handoff"],
                            },
                            "estimated_tokens_per_call": {"type": "integer"},
                            "description": {"type": "string"},
                        },
                        "required": ["name", "type", "estimated_tokens_per_call"],
                    },
                    "description": (
                        "Distinct input sources. One entry per channel. "
                        "voice: phone/audio (~600–1200t transcribed). "
                        "form: structured web/UI submission (~200–600t). "
                        "system_event: automated trigger from a backend system (~100–400t). "
                        "agent_handoff: structured JSON payload from upstream agent (~300–800t). "
                        "No caching on input channels — content is variable."
                    ),
                },
                "tool_stack": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "node_prefix": {
                                "type": "string",
                                "enum": ["T", "KB"],
                                "description": "T = Tool/MCP Server (active logic). KB = Knowledge Base (retrieval).",
                            },
                            "type": {
                                "type": "string",
                                "enum": ["mcp_server", "knowledge_base"],
                            },
                            "status": {
                                "type": "string",
                                "enum": ["existing", "new", "pending", "blocked"],
                                "description": "existing = already built, zero marginal cost. new = must be built. pending = not yet confirmed. blocked = dependency unavailable.",
                            },
                            "build_effort": {
                                "type": "string",
                                "description": "Estimated build effort for new tools, e.g. '1w', '2w', '3d'",
                            },
                            "input_tokens_per_call": {
                                "type": "integer",
                                "description": "Tokens sent TO the tool (query + parameters)",
                            },
                            "output_tokens_per_call": {
                                "type": "integer",
                                "description": "Tokens returned FROM the tool (data payload, retrieved content)",
                            },
                            "output_cache_hit_pct": {
                                "type": "integer",
                                "description": "% of output tokens likely served from cache. KB results ~20-40%. Write APIs ~0%.",
                            },
                            "connected_systems": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {"type": "string"},
                                        "node_prefix": {
                                            "type": "string",
                                            "enum": ["S", "KB"],
                                        },
                                        "type": {"type": "string"},
                                        "status": {
                                            "type": "string",
                                            "enum": ["existing", "new", "pending", "blocked"],
                                        },
                                    },
                                    "required": ["name", "node_prefix", "type", "status"],
                                },
                                "description": "Backend systems/KBs this tool reads from or writes to. The agent never connects to systems directly — always through this tool layer.",
                            },
                        },
                        "required": ["name", "node_prefix", "type", "status", "input_tokens_per_call", "output_tokens_per_call", "output_cache_hit_pct"],
                    },
                    "description": (
                        "Integration layer. Every data source and system the agent needs access to "
                        "must be represented as a Tool (T:) or Knowledge Base (KB) node, "
                        "with the actual system behind it in connected_systems. "
                        "Never list a raw system — always wrap it in a tool abstraction."
                    ),
                },
                "output_channels": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {
                                "type": "string",
                                "enum": ["system_write", "text_response", "agent_handoff", "audit_log"],
                            },
                            "name": {"type": "string"},
                            "destination": {"type": "string"},
                            "format": {"type": "string"},
                            "estimated_tokens": {
                                "type": "integer",
                                "description": "Token cost for text outputs. 0 for system_write and audit_log.",
                            },
                            "latency_requirement_ms": {
                                "type": "integer",
                                "description": "Maximum acceptable latency in ms. Null if no hard requirement.",
                            },
                        },
                        "required": ["type", "name", "estimated_tokens"],
                    },
                    "description": (
                        "Distinct outputs. system_write: writes a record to a backend system (0t, no latency req). "
                        "text_response: natural language to a human or voice channel (~100–400t, latency-sensitive if voice). "
                        "agent_handoff: structured JSON payload to a downstream agent (~200–600t). "
                        "audit_log: compliance/traceability entry (~50–150t)."
                    ),
                },
                "assumptions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "description": {"type": "string"},
                            "linked_to": {"type": "string"},
                            "risk_level": {
                                "type": "string",
                                "enum": ["low", "medium", "high"],
                            },
                            "owner": {"type": "string"},
                            "resolution_status": {
                                "type": "string",
                                "enum": ["open", "resolved", "escalated"],
                            },
                        },
                        "required": ["id", "description", "risk_level", "resolution_status"],
                    },
                    "description": (
                        "Assumptions underlying this specification. "
                        "Capture every dependency on an API existing, data being available, "
                        "or a system behaviour not yet confirmed. "
                        "Each tool with status 'new' or 'pending' should have at least one assumption. "
                        "These become the implementation risk register."
                    ),
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
        state_parts.append("### Agent Scopes (validated and scored)\n")
        for c in clusters:
            state_parts.append(f"**{c['name']}**")
            if c.get("purpose"):
                state_parts.append(f"Purpose: {c['purpose']}")

            cognitive_items = c.get("cognitive_jtds", [])
            if cognitive_items:
                state_parts.append("Cognitive Load Items:")
                for item in cognitive_items:
                    zone = f" [{item.get('cognitive_zone', '')}]" if item.get("cognitive_zone") else ""
                    intensity = f" (load: {item.get('load_intensity', '?')}/3)" if item.get("load_intensity") is not None else ""
                    state_parts.append(f"  - {item['description']}{zone}{intensity}")

            activities = c.get("lived_jtds", [])
            if activities:
                state_parts.append("Associated Activities:")
                for activity in activities:
                    sys_ctx = f" [{activity.get('system_context', '')}]" if activity.get("system_context") else ""
                    state_parts.append(f"  - {activity['description']}{sys_ctx}")

            scores = c.get("suitability_scores")
            if scores:
                avg = sum(scores.values()) / len(scores) if scores else 0
                state_parts.append(f"Readiness: {avg:.1f}/3 average across 9 dimensions")

            state_parts.append("")
    else:
        state_parts.append("No agent scopes available yet. Wait for the consultant to complete discovery.")
        state_parts.append("")

    if existing_specs:
        state_parts.append("### Existing Agent Specifications\n")
        for s in existing_specs:
            state_parts.append(f"- **{s['name']}** ({s.get('autonomy_level', 'unset')}) — {s.get('purpose', '')[:80]}")
        state_parts.append("")

    state_parts.append(
        "Use the agent scope context above — including both cognitive load items and activities — "
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
