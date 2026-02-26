"""Agentic Design module service — all DB operations for agent specifications.

Follows the same pattern as discovery/service.py:
- Uses db.flush() not db.commit()
- Returns Pydantic Read schemas
- No business logic in route handlers
"""
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agentic_design import (
    AgentHandoff,
    AgentSpecification,
    AgentSpecStatus,
    AgenticDesignMessage,
    DesignMessageRole,
)
from app.schemas.agentic_design import (
    AgenticDesignMap,
    AgenticDesignMessageRead,
    AgentHandoffCreate,
    AgentHandoffRead,
    AgentHandoffUpdate,
    AgentSpecificationRead,
    AgentSpecificationUpdate,
    CrossAgentOpportunity,
)


# ─── Agentic Design Messages ──────────────────────────────────────────────────

async def list_design_messages(
    db: AsyncSession, use_case_id: uuid.UUID
) -> list[AgenticDesignMessageRead]:
    result = await db.execute(
        select(AgenticDesignMessage)
        .where(AgenticDesignMessage.use_case_id == use_case_id)
        .order_by(AgenticDesignMessage.created_at.asc())
    )
    msgs = result.scalars().all()
    return [AgenticDesignMessageRead.model_validate(m) for m in msgs]


async def save_design_message(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    role: DesignMessageRole,
    content: Any,
) -> AgenticDesignMessageRead:
    msg = AgenticDesignMessage(
        use_case_id=use_case_id,
        role=role,
        content=content,
    )
    db.add(msg)
    await db.flush()
    await db.refresh(msg)
    return AgenticDesignMessageRead.model_validate(msg)


# ─── Agent Specifications ─────────────────────────────────────────────────────

async def create_agent_spec(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    name: str,
    purpose: str | None = None,
    autonomy_level: str | None = None,
    delegation_cluster_id: uuid.UUID | None = None,
    activities: list[str] | None = None,
    supervised_activities: list[dict[str, Any]] | None = None,
    out_of_scope: list[str] | None = None,
    data_sources: list[dict[str, Any]] | None = None,
    mcp_servers: list[dict[str, Any]] | None = None,
    tools_apis: list[dict[str, Any]] | None = None,
    input_definition: dict[str, Any] | None = None,
    output_definition: dict[str, Any] | None = None,
    hitl_design: dict[str, Any] | None = None,
    compliance: dict[str, Any] | None = None,
    open_questions: list[str] | None = None,
    # Phase 5a: architecture diagram fields
    model: str | None = None,
    maturity_score: int | None = None,
    prompt_requirements: dict[str, Any] | None = None,
    input_channels: list[dict[str, Any]] | None = None,
    tool_stack: list[dict[str, Any]] | None = None,
    output_channels: list[dict[str, Any]] | None = None,
    assumptions: list[dict[str, Any]] | None = None,
) -> AgentSpecificationRead:
    spec = AgentSpecification(
        use_case_id=use_case_id,
        name=name,
        purpose=purpose,
        autonomy_level=autonomy_level,
        delegation_cluster_id=delegation_cluster_id,
        activities=activities or [],
        supervised_activities=supervised_activities or [],
        out_of_scope=out_of_scope or [],
        data_sources=data_sources or [],
        mcp_servers=mcp_servers or [],
        tools_apis=tools_apis or [],
        input_definition=input_definition or {},
        output_definition=output_definition or {},
        hitl_design=hitl_design or {},
        compliance=compliance or {},
        open_questions=open_questions or [],
        # Phase 5a
        model=model,
        maturity_score=maturity_score,
        prompt_requirements=prompt_requirements or {},
        input_channels=input_channels or [],
        tool_stack=tool_stack or [],
        output_channels=output_channels or [],
        assumptions=assumptions or [],
        status=AgentSpecStatus.draft,
    )
    db.add(spec)
    await db.flush()
    await db.refresh(spec)
    return AgentSpecificationRead.model_validate(spec)


async def list_agent_specs(
    db: AsyncSession, use_case_id: uuid.UUID
) -> list[AgentSpecificationRead]:
    result = await db.execute(
        select(AgentSpecification)
        .where(AgentSpecification.use_case_id == use_case_id)
        .order_by(AgentSpecification.created_at.asc())
    )
    specs = result.scalars().all()
    return [AgentSpecificationRead.model_validate(s) for s in specs]


async def get_agent_spec(
    db: AsyncSession, use_case_id: uuid.UUID, spec_id: uuid.UUID
) -> AgentSpecificationRead | None:
    result = await db.execute(
        select(AgentSpecification).where(
            AgentSpecification.id == spec_id,
            AgentSpecification.use_case_id == use_case_id,
        )
    )
    spec = result.scalar_one_or_none()
    return AgentSpecificationRead.model_validate(spec) if spec else None


async def update_agent_spec(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    spec_id: uuid.UUID,
    payload: AgentSpecificationUpdate,
) -> AgentSpecificationRead | None:
    result = await db.execute(
        select(AgentSpecification).where(
            AgentSpecification.id == spec_id,
            AgentSpecification.use_case_id == use_case_id,
        )
    )
    spec = result.scalar_one_or_none()
    if spec is None:
        return None
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(spec, field, value)
    await db.flush()
    await db.refresh(spec)
    return AgentSpecificationRead.model_validate(spec)


async def delete_agent_spec(
    db: AsyncSession, use_case_id: uuid.UUID, spec_id: uuid.UUID
) -> bool:
    result = await db.execute(
        select(AgentSpecification).where(
            AgentSpecification.id == spec_id,
            AgentSpecification.use_case_id == use_case_id,
        )
    )
    spec = result.scalar_one_or_none()
    if spec is None:
        return False
    await db.delete(spec)
    return True


async def approve_agent_spec(
    db: AsyncSession, use_case_id: uuid.UUID, spec_id: uuid.UUID
) -> AgentSpecificationRead | None:
    result = await db.execute(
        select(AgentSpecification).where(
            AgentSpecification.id == spec_id,
            AgentSpecification.use_case_id == use_case_id,
        )
    )
    spec = result.scalar_one_or_none()
    if spec is None:
        return None
    spec.status = AgentSpecStatus.approved
    await db.flush()
    await db.refresh(spec)
    return AgentSpecificationRead.model_validate(spec)


# ─── Cross-Agent Opportunities ────────────────────────────────────────────────

def detect_cross_agent_opportunities(
    specs: list[AgentSpecificationRead],
) -> list[CrossAgentOpportunity]:
    """Scan agent specs for shared resources and surface reuse opportunities."""
    opportunities: list[CrossAgentOpportunity] = []

    # Index: resource_type+name → [agent names]
    data_source_index: dict[str, list[str]] = {}
    mcp_index: dict[str, list[str]] = {}
    tool_index: dict[str, list[str]] = {}

    for spec in specs:
        for ds in spec.data_sources:
            key = ds.get("name", "")
            if key:
                data_source_index.setdefault(key, []).append(spec.name)
        for mcp in spec.mcp_servers:
            key = mcp.get("name", "")
            if key:
                mcp_index.setdefault(key, []).append(spec.name)
        for tool in spec.tools_apis:
            key = tool.get("name", "")
            if key:
                tool_index.setdefault(key, []).append(spec.name)

    for name, agents in data_source_index.items():
        if len(agents) > 1:
            opportunities.append(CrossAgentOpportunity(
                resource_type="data_source",
                resource_name=name,
                shared_by_agents=agents,
                reuse_recommendation=(
                    f"Data source '{name}' is referenced by {len(agents)} agents. "
                    "Consider a shared data access layer or unified MCP server."
                ),
            ))

    for name, agents in mcp_index.items():
        if len(agents) > 1:
            opportunities.append(CrossAgentOpportunity(
                resource_type="mcp_server",
                resource_name=name,
                shared_by_agents=agents,
                reuse_recommendation=(
                    f"MCP server '{name}' is used by {len(agents)} agents. "
                    "Shared MCP configuration reduces duplication and maintenance cost."
                ),
            ))

    for name, agents in tool_index.items():
        if len(agents) > 1:
            opportunities.append(CrossAgentOpportunity(
                resource_type="tool_api",
                resource_name=name,
                shared_by_agents=agents,
                reuse_recommendation=(
                    f"Tool/API '{name}' is referenced by {len(agents)} agents. "
                    "Centralise authentication and rate-limit management."
                ),
            ))

    return opportunities


# ─── Agent Handoffs ───────────────────────────────────────────────────────────

async def create_handoff(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    payload: AgentHandoffCreate,
) -> AgentHandoffRead:
    handoff = AgentHandoff(
        use_case_id=use_case_id,
        from_agent_id=payload.from_agent_id,
        to_agent_id=payload.to_agent_id,
        trigger_condition=payload.trigger_condition,
        payload_description=payload.payload_description,
        estimated_tokens=payload.estimated_tokens,
        handoff_type=payload.handoff_type,
    )
    db.add(handoff)
    await db.flush()
    await db.refresh(handoff)
    return AgentHandoffRead.model_validate(handoff)


async def list_handoffs(
    db: AsyncSession, use_case_id: uuid.UUID
) -> list[AgentHandoffRead]:
    result = await db.execute(
        select(AgentHandoff)
        .where(AgentHandoff.use_case_id == use_case_id)
        .order_by(AgentHandoff.created_at.asc())
    )
    rows = result.scalars().all()
    return [AgentHandoffRead.model_validate(r) for r in rows]


async def update_handoff(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    handoff_id: uuid.UUID,
    payload: AgentHandoffUpdate,
) -> AgentHandoffRead | None:
    result = await db.execute(
        select(AgentHandoff).where(
            AgentHandoff.id == handoff_id,
            AgentHandoff.use_case_id == use_case_id,
        )
    )
    handoff = result.scalar_one_or_none()
    if handoff is None:
        return None
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(handoff, field, value)
    await db.flush()
    await db.refresh(handoff)
    return AgentHandoffRead.model_validate(handoff)


async def delete_handoff(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    handoff_id: uuid.UUID,
) -> bool:
    result = await db.execute(
        select(AgentHandoff).where(
            AgentHandoff.id == handoff_id,
            AgentHandoff.use_case_id == use_case_id,
        )
    )
    handoff = result.scalar_one_or_none()
    if handoff is None:
        return False
    await db.delete(handoff)
    return True


# ─── Full Agentic Design Map ──────────────────────────────────────────────────

async def get_agentic_design_map(
    db: AsyncSession, use_case_id: uuid.UUID
) -> AgenticDesignMap:
    specs = await list_agent_specs(db, use_case_id)
    messages = await list_design_messages(db, use_case_id)
    opportunities = detect_cross_agent_opportunities(specs)
    handoffs = await list_handoffs(db, use_case_id)

    return AgenticDesignMap(
        use_case_id=use_case_id,
        agent_specifications=specs,
        messages=messages,
        cross_agent_opportunities=opportunities,
        handoffs=handoffs,
    )


# ─── ARD Document Generator ───────────────────────────────────────────────────

def _cell(value: object) -> str:
    """Escape pipe characters so they don't break markdown table cells."""
    return str(value).replace("|", "\\|") if value is not None else "—"


def generate_ard_markdown(
    specs: list[AgentSpecificationRead],
    use_case_name: str,
) -> str:
    """Generate ARD following the canonical table structure in CLAUDE.md Section 7.

    All sections render as structured tables. Every field is sourced from the
    Phase 5a structured spec fields (input_channels, tool_stack, output_channels,
    prompt_requirements, model, autonomy_level, maturity_score, assumptions).
    """
    autonomy_labels = {
        "full_delegation": "Full Delegation",
        "supervised_execution": "Supervised Execution",
        "assisted_mode": "Assisted Mode",
    }

    lines: list[str] = [
        f"# Agent Requirements Document — {use_case_name}",
        "",
        "_Generated by the Agentic Transformation Workbench_",
        "",
        "---",
        "",
    ]

    for spec in specs:
        autonomy_display = autonomy_labels.get(
            spec.autonomy_level or "", spec.autonomy_level or "Not specified"
        )
        compliance = spec.compliance or {}
        eu_class = compliance.get("eu_ai_act_class") or "Not assessed"
        maturity = f"{spec.maturity_score}/100" if spec.maturity_score is not None else "Not assessed"
        pr = spec.prompt_requirements or {}
        input_channels = spec.input_channels or []
        tool_stack = spec.tool_stack or []
        output_channels = spec.output_channels or []
        assumptions = spec.assumptions or []

        # ── Agent header ──────────────────────────────────────────────────────
        lines += [
            f"## {spec.name}",
            "",
            f"> Purpose: {spec.purpose or 'Not specified'}",
            f"> Model: {spec.model or 'Not specified'}",
            f"> Autonomy Level: {autonomy_display}",
            f"> EU AI Act Classification: {eu_class}",
            f"> Maturity Score: {maturity}",
            "",
        ]

        # ── Activities ────────────────────────────────────────────────────────
        lines += [
            "### Activities",
            "",
            "| Activity | Delegation | HITL Trigger |",
            "|---|---|---|",
        ]
        for act in (spec.activities or []):
            lines.append(f"| {_cell(act)} | Full Delegation | — |")
        for sa in (spec.supervised_activities or []):
            act = _cell(sa.get("activity", ""))
            trigger = _cell(sa.get("hitl_trigger") or "—")
            lines.append(f"| {act} | Supervised Execution | {trigger} |")
        if not spec.activities and not spec.supervised_activities:
            lines.append("| — | — | — |")
        lines.append("")

        # ── Input Channels ────────────────────────────────────────────────────
        lines += [
            "### Input Channels",
            "",
            "| Channel | Type | Token Load/Call |",
            "|---|---|---|",
        ]
        if input_channels:
            for ch in input_channels:
                lines.append(
                    f"| {_cell(ch.get('name'))} | {_cell(ch.get('type'))} "
                    f"| {_cell(ch.get('estimated_tokens_per_call', 0))} |"
                )
        else:
            lines.append("| — | — | — |")
        lines.append("")

        # ── Prompt Components ─────────────────────────────────────────────────
        prompt_rows: list[tuple[str, int, int]] = []
        if pr.get("system_prompt"):
            sp = pr["system_prompt"]
            prompt_rows.append((
                "System Prompt",
                sp.get("estimated_tokens", 0),
                sp.get("cache_hit_pct", 95),
            ))
        for dc in (pr.get("dynamic_context") or []):
            prompt_rows.append((
                dc.get("name") or "Dynamic Context",
                dc.get("estimated_tokens_per_call", 0),
                dc.get("cache_hit_pct", 15),
            ))
        if pr.get("few_shot_examples"):
            fs = pr["few_shot_examples"]
            prompt_rows.append((
                "Few-Shot Examples",
                fs.get("estimated_tokens", 0),
                fs.get("cache_hit_pct", 90),
            ))
        for g in (pr.get("guardrails") or []):
            prompt_rows.append((
                f"Guardrail: {g.get('type', '')}",
                g.get("estimated_tokens", 0),
                g.get("cache_hit_pct", 95),
            ))

        lines += [
            "### Prompt Components",
            "",
            "| Component | Tokens | Cache Hit % |",
            "|---|---|---|",
        ]
        if prompt_rows:
            for comp, tokens, cache in prompt_rows:
                lines.append(f"| {_cell(comp)} | {tokens} | {cache}% |")
        else:
            lines.append("| — | — | — |")
        lines.append("")

        # ── Integration Requirements ──────────────────────────────────────────
        lines += [
            "### Integration Requirements",
            "",
            "| Node | Type | Status | Build Effort | Input Tokens | Output Tokens | Cache Hit % |",
            "|---|---|---|---|---|---|---|",
        ]
        if tool_stack:
            for tool in tool_stack:
                prefix = tool.get("node_prefix", "T")
                t_name = _cell(tool.get("name", ""))
                t_type = _cell(tool.get("type", ""))
                status = _cell(tool.get("status", ""))
                effort = _cell(tool.get("build_effort") or "—")
                in_tok = tool.get("input_tokens_per_call", 0)
                out_tok = tool.get("output_tokens_per_call", 0)
                cache_pct = tool.get("output_cache_hit_pct", 0)
                lines.append(
                    f"| {prefix}: {t_name} | {t_type} | {status} | {effort} "
                    f"| {in_tok} | {out_tok} | {cache_pct}% |"
                )
                for sys in (tool.get("connected_systems") or []):
                    s_prefix = sys.get("node_prefix", "S")
                    s_name = _cell(sys.get("name", ""))
                    s_type = _cell(sys.get("type", "system"))
                    s_status = _cell(sys.get("status", ""))
                    lines.append(
                        f"| {s_prefix}: {s_name} | {s_type} | {s_status} | — | — | — | — |"
                    )
        else:
            lines.append("| — | — | — | — | — | — | — |")
        lines.append("")

        # ── Output Channels ───────────────────────────────────────────────────
        lines += [
            "### Output Channels",
            "",
            "| Output | Type | Destination | Token Est. | Latency |",
            "|---|---|---|---|---|",
        ]
        if output_channels:
            for ch in output_channels:
                dest = _cell(ch.get("destination") or "—")
                tokens = ch.get("estimated_tokens", 0)
                latency = ch.get("latency_requirement_ms")
                latency_str = f"{latency}ms" if latency is not None else "—"
                lines.append(
                    f"| {_cell(ch.get('name'))} | {_cell(ch.get('type'))} "
                    f"| {dest} | {tokens} | {latency_str} |"
                )
        else:
            lines.append("| — | — | — | — | — |")
        lines.append("")

        # ── Human-in-the-Loop Design ──────────────────────────────────────────
        hitl = spec.hitl_design or {}
        hitl_triggers = hitl.get("trigger_conditions") or []
        escalation = _cell(hitl.get("escalation_path") or "—")
        human_role = _cell(hitl.get("human_role") or "—")

        lines += [
            "### Human-in-the-Loop Design",
            "",
            "| Trigger | Escalation Path | Human Role |",
            "|---|---|---|",
        ]
        if hitl_triggers:
            for trigger in (hitl_triggers if isinstance(hitl_triggers, list) else [hitl_triggers]):
                lines.append(f"| {_cell(trigger)} | {escalation} | {human_role} |")
        else:
            lines.append(f"| — | {escalation} | {human_role} |")
        lines.append("")

        # ── Compliance & Regulatory ───────────────────────────────────────────
        compliance_rows: list[tuple[str, str]] = []
        if compliance.get("eu_ai_act_class"):
            compliance_rows.append(("EU AI Act", compliance["eu_ai_act_class"]))
        if compliance.get("gdpr_implications"):
            compliance_rows.append(("GDPR", compliance["gdpr_implications"]))
        if compliance.get("audit_requirements"):
            compliance_rows.append(("Audit & Traceability", compliance["audit_requirements"]))
        for g in (compliance.get("guardrails") or []):
            if g:
                compliance_rows.append(("Guardrail", g))

        lines += [
            "### Compliance & Regulatory",
            "",
            "| Area | Requirement |",
            "|---|---|",
        ]
        if compliance_rows:
            for area, req in compliance_rows:
                lines.append(f"| {_cell(area)} | {_cell(req)} |")
        else:
            lines.append("| — | — |")
        lines.append("")

        # ── Assumptions ───────────────────────────────────────────────────────
        lines += [
            "### Assumptions",
            "",
            "| # | Description | Linked To | Risk | Status |",
            "|---|---|---|---|---|",
        ]
        if assumptions:
            for a in assumptions:
                a_id = _cell(a.get("id", "—"))
                desc = _cell(a.get("description", ""))
                linked = _cell(a.get("linked_to") or "—")
                risk = _cell(a.get("risk_level") or "—")
                status = _cell(a.get("resolution_status") or "—")
                lines.append(f"| {a_id} | {desc} | {linked} | {risk} | {status} |")
        else:
            lines.append("| — | — | — | — | — |")
        lines.append("")

        # ── Open Questions ────────────────────────────────────────────────────
        lines += [
            "### Open Questions",
            "",
            "| # | Category | Question |",
            "|---|---|---|",
        ]
        if spec.open_questions:
            for i, q in enumerate(spec.open_questions, 1):
                lines.append(f"| {i} | — | {_cell(q)} |")
        else:
            lines.append("| — | — | — |")

        lines += ["", "---", "", ""]

    return "\n".join(lines)
