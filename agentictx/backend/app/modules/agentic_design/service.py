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
    AgentSpecification,
    AgentSpecStatus,
    AgenticDesignMessage,
    DesignMessageRole,
)
from app.schemas.agentic_design import (
    AgenticDesignMap,
    AgenticDesignMessageRead,
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


# ─── Full Agentic Design Map ──────────────────────────────────────────────────

async def get_agentic_design_map(
    db: AsyncSession, use_case_id: uuid.UUID
) -> AgenticDesignMap:
    specs = await list_agent_specs(db, use_case_id)
    messages = await list_design_messages(db, use_case_id)
    opportunities = detect_cross_agent_opportunities(specs)

    return AgenticDesignMap(
        use_case_id=use_case_id,
        agent_specifications=specs,
        messages=messages,
        cross_agent_opportunities=opportunities,
    )


# ─── ARD Document Generator ───────────────────────────────────────────────────

def generate_ard_markdown(
    specs: list[AgentSpecificationRead],
    use_case_name: str,
) -> str:
    """Generate a complete Agent Requirements Document in Markdown."""
    lines: list[str] = [
        f"# Agent Requirements Document — {use_case_name}",
        "",
        f"*Generated by the Agentic Transformation Workbench*",
        "",
        "---",
        "",
    ]

    for spec in specs:
        lines += [
            f"## {spec.name}",
            "",
            "### 1. Agent Overview",
            "",
            f"**Purpose**: {spec.purpose or '_Not specified_'}",
            "",
            f"**Delegation Cluster Reference**: {str(spec.delegation_cluster_id) if spec.delegation_cluster_id else '_Not linked_'}",
            "",
        ]

        autonomy_labels = {
            "full_delegation": "Full Delegation",
            "supervised_execution": "Supervised Execution",
            "assisted_mode": "Assisted Mode",
        }
        autonomy_display = autonomy_labels.get(spec.autonomy_level or "", spec.autonomy_level or "_Not specified_")
        lines += [
            f"**Autonomy Level**: {autonomy_display}",
            "",
        ]

        eu_class = spec.compliance.get("eu_ai_act_class", "_Not assessed_")
        lines += [
            f"**EU AI Act Classification**: {eu_class}",
            "",
            "---",
            "",
            "### 2. Activities",
            "",
        ]

        if spec.activities:
            lines.append("**Fully Delegated Activities**:")
            lines.append("")
            for act in spec.activities:
                lines.append(f"- {act}")
            lines.append("")
        else:
            lines.append("**Fully Delegated Activities**: _None specified_")
            lines.append("")

        if spec.supervised_activities:
            lines.append("**Supervised Activities (with HITL)**:")
            lines.append("")
            for sa in spec.supervised_activities:
                activity = sa.get("activity", "_Unnamed_")
                trigger = sa.get("hitl_trigger", "")
                action = sa.get("human_action", "")
                lines.append(f"- **{activity}**")
                if trigger:
                    lines.append(f"  - HITL Trigger: {trigger}")
                if action:
                    lines.append(f"  - Human Action: {action}")
            lines.append("")

        if spec.out_of_scope:
            lines.append("**Out of Scope**:")
            lines.append("")
            for oos in spec.out_of_scope:
                lines.append(f"- {oos}")
            lines.append("")

        lines += [
            "---",
            "",
            "### 3. Data & Knowledge Requirements",
            "",
        ]

        if spec.data_sources:
            lines.append("| Name | Type | Availability | Access Method |")
            lines.append("|------|------|--------------|---------------|")
            for ds in spec.data_sources:
                name = ds.get("name", "")
                dtype = ds.get("type", "")
                avail = ds.get("availability", "")
                access = ds.get("access_method", "")
                lines.append(f"| {name} | {dtype} | {avail} | {access} |")
            lines.append("")
        else:
            lines.append("_No data sources specified_")
            lines.append("")

        lines += [
            "---",
            "",
            "### 4. Integration Requirements",
            "",
        ]

        if spec.mcp_servers:
            lines.append("**MCP Servers**:")
            lines.append("")
            for mcp in spec.mcp_servers:
                mcp_name = mcp.get("name", "_Unnamed_")
                mcp_purpose = mcp.get("purpose", "")
                lines.append(f"- **{mcp_name}**: {mcp_purpose}")
            lines.append("")

        if spec.tools_apis:
            lines.append("**Tools & APIs**:")
            lines.append("")
            for tool in spec.tools_apis:
                tool_name = tool.get("name", "_Unnamed_")
                tool_type = tool.get("type", "")
                tool_endpoint = tool.get("endpoint", "")
                entry = f"- **{tool_name}**"
                if tool_type:
                    entry += f" ({tool_type})"
                if tool_endpoint:
                    entry += f" — `{tool_endpoint}`"
                lines.append(entry)
            lines.append("")

        if not spec.mcp_servers and not spec.tools_apis:
            lines.append("_No integrations specified_")
            lines.append("")

        lines += [
            "---",
            "",
            "### 5. Input Specification",
            "",
        ]
        if spec.input_definition:
            trigger = spec.input_definition.get("trigger", "")
            fmt = spec.input_definition.get("format", "")
            variability = spec.input_definition.get("variability", "")
            if trigger:
                lines.append(f"**Trigger / Entry Point**: {trigger}")
                lines.append("")
            if fmt:
                lines.append(f"**Input Format**: {fmt}")
                lines.append("")
            if variability:
                lines.append(f"**Expected Variability**: {variability}")
                lines.append("")
        else:
            lines.append("_Not specified_")
            lines.append("")

        lines += [
            "---",
            "",
            "### 6. Output Specification",
            "",
        ]
        if spec.output_definition:
            fmt = spec.output_definition.get("format", "")
            dest = spec.output_definition.get("destination", "")
            criteria = spec.output_definition.get("success_criteria", "")
            if fmt:
                lines.append(f"**Output Format**: {fmt}")
                lines.append("")
            if dest:
                lines.append(f"**Destination**: {dest}")
                lines.append("")
            if criteria:
                lines.append(f"**Success Criteria**: {criteria}")
                lines.append("")
        else:
            lines.append("_Not specified_")
            lines.append("")

        lines += [
            "---",
            "",
            "### 7. Human-in-the-Loop Design",
            "",
        ]
        if spec.hitl_design:
            triggers = spec.hitl_design.get("trigger_conditions", [])
            escalation = spec.hitl_design.get("escalation_path", "")
            human_role = spec.hitl_design.get("human_role", "")
            if triggers:
                lines.append("**HITL Trigger Conditions**:")
                lines.append("")
                for t in (triggers if isinstance(triggers, list) else [triggers]):
                    lines.append(f"- {t}")
                lines.append("")
            if escalation:
                lines.append(f"**Escalation Path**: {escalation}")
                lines.append("")
            if human_role:
                lines.append(f"**Human Role**: {human_role}")
                lines.append("")
        else:
            lines.append("_Not specified_")
            lines.append("")

        lines += [
            "---",
            "",
            "### 8. Compliance & Regulatory Requirements",
            "",
        ]
        if spec.compliance:
            eu_class = spec.compliance.get("eu_ai_act_class", "")
            gdpr = spec.compliance.get("gdpr_implications", "")
            audit = spec.compliance.get("audit_requirements", "")
            guardrails = spec.compliance.get("guardrails", [])
            if eu_class:
                lines.append(f"**EU AI Act Classification**: {eu_class}")
                lines.append("")
            if gdpr:
                lines.append(f"**GDPR Implications**: {gdpr}")
                lines.append("")
            if audit:
                lines.append(f"**Audit & Traceability Requirements**: {audit}")
                lines.append("")
            if guardrails:
                lines.append("**Behavioural Guardrails**:")
                lines.append("")
                for g in (guardrails if isinstance(guardrails, list) else [guardrails]):
                    lines.append(f"- {g}")
                lines.append("")
        else:
            lines.append("_Not assessed_")
            lines.append("")

        lines += [
            "---",
            "",
            "### 9. Open Questions & Blockers",
            "",
        ]
        if spec.open_questions:
            for q in spec.open_questions:
                lines.append(f"- {q}")
            lines.append("")
        else:
            lines.append("_None recorded_")
            lines.append("")

        lines += ["---", "", ""]

    return "\n".join(lines)
