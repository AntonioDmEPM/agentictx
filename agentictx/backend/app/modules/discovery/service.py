"""Discovery module service — all DB operations for discovery entities.

Follows the same pattern as engagement/service.py:
- Uses db.flush() not db.commit()
- Returns Pydantic Read schemas
- No business logic in route handlers
"""
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.discovery import (
    ClusterProcessStep,
    ClusterStatus,
    CognitiveJTD,
    ConversationMessage,
    DelegationCluster,
    JTDStatus,
    LivedJTD,
    MessageRole,
    ProcessStep,
    ProcessStepJTDLink,
    RawInput,
    RawInputType,
)
from app.schemas.discovery import (
    ClusterProcessStepRead,
    CognitiveJTDRead,
    CognitiveJTDUpdate,
    CognitiveMapRead,
    DelegationClusterRead,
    DelegationClusterUpdate,
    LivedJTDRead,
    LivedJTDUpdate,
    ProcessFlowRead,
    ProcessStepCreate,
    ProcessStepJTDLinkCreate,
    ProcessStepJTDLinkRead,
    ProcessStepRead,
    ProcessStepUpdate,
    RawInputRead,
    SuitabilityScores,
    ConversationMessageRead,
)


# ─── Raw Inputs ───────────────────────────────────────────────────────────────

async def create_raw_input(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    input_type: RawInputType,
    content: str | None = None,
    file_path: str | None = None,
    file_name: str | None = None,
    mime_type: str | None = None,
) -> RawInputRead:
    raw = RawInput(
        use_case_id=use_case_id,
        type=input_type,
        content=content,
        file_path=file_path,
        file_name=file_name,
        mime_type=mime_type,
        processed=False,
    )
    db.add(raw)
    await db.flush()
    await db.refresh(raw)
    return RawInputRead.model_validate(raw)


async def mark_raw_input_processed(
    db: AsyncSession, raw_input_id: uuid.UUID, content: str
) -> RawInputRead | None:
    result = await db.execute(select(RawInput).where(RawInput.id == raw_input_id))
    raw = result.scalar_one_or_none()
    if raw is None:
        return None
    raw.processed = True
    raw.content = content
    await db.flush()
    await db.refresh(raw)
    return RawInputRead.model_validate(raw)


async def get_raw_input(
    db: AsyncSession, raw_input_id: uuid.UUID
) -> RawInputRead | None:
    result = await db.execute(select(RawInput).where(RawInput.id == raw_input_id))
    raw = result.scalar_one_or_none()
    return RawInputRead.model_validate(raw) if raw else None


# ─── Conversation Messages ────────────────────────────────────────────────────

async def list_conversation_messages(
    db: AsyncSession, use_case_id: uuid.UUID
) -> list[ConversationMessageRead]:
    result = await db.execute(
        select(ConversationMessage)
        .where(ConversationMessage.use_case_id == use_case_id)
        .order_by(ConversationMessage.created_at.asc())
    )
    msgs = result.scalars().all()
    return [ConversationMessageRead.model_validate(m) for m in msgs]


async def save_message(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    role: MessageRole,
    content: Any,
) -> ConversationMessageRead:
    msg = ConversationMessage(
        use_case_id=use_case_id,
        role=role,
        content=content,
    )
    db.add(msg)
    await db.flush()
    await db.refresh(msg)
    return ConversationMessageRead.model_validate(msg)


# ─── Lived JTDs ──────────────────────────────────────────────────────────────

async def create_lived_jtd(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    description: str,
    system_context: str | None = None,
    cognitive_load_score: int | None = None,
    status: str | None = None,
) -> LivedJTDRead:
    jtd = LivedJTD(
        use_case_id=use_case_id,
        description=description,
        system_context=system_context,
        cognitive_load_score=cognitive_load_score,
        status=JTDStatus(status) if status else JTDStatus.proposed,
    )
    db.add(jtd)
    await db.flush()
    await db.refresh(jtd)
    return LivedJTDRead.model_validate(jtd)


async def list_lived_jtds(
    db: AsyncSession, use_case_id: uuid.UUID
) -> list[LivedJTDRead]:
    result = await db.execute(
        select(LivedJTD)
        .where(LivedJTD.use_case_id == use_case_id)
        .order_by(LivedJTD.created_at.asc())
    )
    jtds = result.scalars().all()
    return [LivedJTDRead.model_validate(j) for j in jtds]


async def update_lived_jtd(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    jtd_id: uuid.UUID,
    payload: LivedJTDUpdate,
) -> LivedJTDRead | None:
    result = await db.execute(
        select(LivedJTD).where(
            LivedJTD.id == jtd_id,
            LivedJTD.use_case_id == use_case_id,
        )
    )
    jtd = result.scalar_one_or_none()
    if jtd is None:
        return None
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(jtd, field, value)
    await db.flush()
    await db.refresh(jtd)
    return LivedJTDRead.model_validate(jtd)


async def delete_lived_jtd(
    db: AsyncSession, use_case_id: uuid.UUID, jtd_id: uuid.UUID
) -> bool:
    result = await db.execute(
        select(LivedJTD).where(
            LivedJTD.id == jtd_id,
            LivedJTD.use_case_id == use_case_id,
        )
    )
    jtd = result.scalar_one_or_none()
    if jtd is None:
        return False
    await db.delete(jtd)
    return True


# ─── Cognitive JTDs ──────────────────────────────────────────────────────────

async def create_cognitive_jtd(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    description: str,
    cognitive_zone: str | None = None,
    load_intensity: int | None = None,
    status: str | None = None,
) -> CognitiveJTDRead:
    jtd = CognitiveJTD(
        use_case_id=use_case_id,
        description=description,
        cognitive_zone=cognitive_zone,
        load_intensity=load_intensity,
        status=JTDStatus(status) if status else JTDStatus.proposed,
    )
    db.add(jtd)
    await db.flush()
    await db.refresh(jtd)
    return CognitiveJTDRead.model_validate(jtd)


async def list_cognitive_jtds(
    db: AsyncSession, use_case_id: uuid.UUID
) -> list[CognitiveJTDRead]:
    result = await db.execute(
        select(CognitiveJTD)
        .where(CognitiveJTD.use_case_id == use_case_id)
        .order_by(CognitiveJTD.created_at.asc())
    )
    jtds = result.scalars().all()
    return [CognitiveJTDRead.model_validate(j) for j in jtds]


async def update_cognitive_jtd(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    jtd_id: uuid.UUID,
    payload: CognitiveJTDUpdate,
) -> CognitiveJTDRead | None:
    result = await db.execute(
        select(CognitiveJTD).where(
            CognitiveJTD.id == jtd_id,
            CognitiveJTD.use_case_id == use_case_id,
        )
    )
    jtd = result.scalar_one_or_none()
    if jtd is None:
        return None
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(jtd, field, value)
    await db.flush()
    await db.refresh(jtd)
    return CognitiveJTDRead.model_validate(jtd)


async def delete_cognitive_jtd(
    db: AsyncSession, use_case_id: uuid.UUID, jtd_id: uuid.UUID
) -> bool:
    result = await db.execute(
        select(CognitiveJTD).where(
            CognitiveJTD.id == jtd_id,
            CognitiveJTD.use_case_id == use_case_id,
        )
    )
    jtd = result.scalar_one_or_none()
    if jtd is None:
        return False
    await db.delete(jtd)
    return True


# ─── Delegation Clusters ──────────────────────────────────────────────────────

async def create_delegation_cluster(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    name: str,
    purpose: str | None = None,
    cognitive_jtd_ids: list[str] | None = None,
    lived_jtd_ids: list[str] | None = None,
) -> DelegationClusterRead:
    cluster = DelegationCluster(
        use_case_id=use_case_id,
        name=name,
        purpose=purpose,
        cognitive_jtd_ids=cognitive_jtd_ids or [],
        lived_jtd_ids=lived_jtd_ids,
        status=ClusterStatus.proposed,
    )
    db.add(cluster)
    await db.flush()
    await db.refresh(cluster)
    return DelegationClusterRead.model_validate(cluster)


async def list_delegation_clusters(
    db: AsyncSession, use_case_id: uuid.UUID
) -> list[DelegationClusterRead]:
    result = await db.execute(
        select(DelegationCluster)
        .where(DelegationCluster.use_case_id == use_case_id)
        .order_by(DelegationCluster.created_at.asc())
    )
    clusters = result.scalars().all()
    return [DelegationClusterRead.model_validate(c) for c in clusters]


async def update_delegation_cluster(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    cluster_id: uuid.UUID,
    payload: DelegationClusterUpdate,
) -> DelegationClusterRead | None:
    result = await db.execute(
        select(DelegationCluster).where(
            DelegationCluster.id == cluster_id,
            DelegationCluster.use_case_id == use_case_id,
        )
    )
    cluster = result.scalar_one_or_none()
    if cluster is None:
        return None
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(cluster, field, value)
    await db.flush()
    await db.refresh(cluster)
    return DelegationClusterRead.model_validate(cluster)


async def delete_delegation_cluster(
    db: AsyncSession, use_case_id: uuid.UUID, cluster_id: uuid.UUID
) -> bool:
    result = await db.execute(
        select(DelegationCluster).where(
            DelegationCluster.id == cluster_id,
            DelegationCluster.use_case_id == use_case_id,
        )
    )
    cluster = result.scalar_one_or_none()
    if cluster is None:
        return False
    await db.delete(cluster)
    return True


async def apply_suitability_scores(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    cluster_id: uuid.UUID,
    scores: SuitabilityScores,
) -> DelegationClusterRead | None:
    result = await db.execute(
        select(DelegationCluster).where(
            DelegationCluster.id == cluster_id,
            DelegationCluster.use_case_id == use_case_id,
        )
    )
    cluster = result.scalar_one_or_none()
    if cluster is None:
        return None
    cluster.suitability_scores = scores.model_dump()
    cluster.status = ClusterStatus.scored
    await db.flush()
    await db.refresh(cluster)
    return DelegationClusterRead.model_validate(cluster)


# ─── Full Cognitive Map ───────────────────────────────────────────────────────

async def get_cognitive_map(
    db: AsyncSession, use_case_id: uuid.UUID
) -> CognitiveMapRead:
    raw_inputs_result = await db.execute(
        select(RawInput)
        .where(RawInput.use_case_id == use_case_id)
        .order_by(RawInput.created_at.asc())
    )
    raw_inputs = [RawInputRead.model_validate(r) for r in raw_inputs_result.scalars().all()]

    messages = await list_conversation_messages(db, use_case_id)
    lived = await list_lived_jtds(db, use_case_id)
    cognitive = await list_cognitive_jtds(db, use_case_id)
    clusters = await list_delegation_clusters(db, use_case_id)

    return CognitiveMapRead(
        use_case_id=use_case_id,
        raw_inputs=raw_inputs,
        conversation_messages=messages,
        lived_jtds=lived,
        cognitive_jtds=cognitive,
        delegation_clusters=clusters,
    )


# ─── Process Flow ─────────────────────────────────────────────────────────────

async def get_process_flow(
    db: AsyncSession, use_case_id: uuid.UUID
) -> ProcessFlowRead:
    steps_result = await db.execute(
        select(ProcessStep)
        .where(ProcessStep.use_case_id == use_case_id)
        .order_by(ProcessStep.sequence_order.asc())
    )
    steps = steps_result.scalars().all()
    step_ids = [s.id for s in steps]

    jtd_links: list[ProcessStepJTDLink] = []
    cluster_steps_list: list[ClusterProcessStep] = []

    if step_ids:
        links_result = await db.execute(
            select(ProcessStepJTDLink)
            .where(ProcessStepJTDLink.process_step_id.in_(step_ids))
            .order_by(ProcessStepJTDLink.sequence_within_step.asc())
        )
        jtd_links = list(links_result.scalars().all())

        cs_result = await db.execute(
            select(ClusterProcessStep)
            .where(ClusterProcessStep.process_step_id.in_(step_ids))
        )
        cluster_steps_list = list(cs_result.scalars().all())

    return ProcessFlowRead(
        use_case_id=use_case_id,
        steps=[ProcessStepRead.model_validate(s) for s in steps],
        jtd_links=[ProcessStepJTDLinkRead.model_validate(l) for l in jtd_links],
        cluster_steps=[ClusterProcessStepRead.model_validate(c) for c in cluster_steps_list],
    )


async def create_process_step(
    db: AsyncSession, use_case_id: uuid.UUID, payload: ProcessStepCreate
) -> ProcessStepRead:
    step = ProcessStep(
        use_case_id=use_case_id,
        name=payload.name,
        sequence_order=payload.sequence_order,
        is_breakpoint=payload.is_breakpoint,
        cognitive_load_intensity=payload.cognitive_load_intensity,
    )
    db.add(step)
    await db.flush()
    await db.refresh(step)
    return ProcessStepRead.model_validate(step)


async def update_process_step(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    step_id: uuid.UUID,
    payload: ProcessStepUpdate,
) -> ProcessStepRead | None:
    result = await db.execute(
        select(ProcessStep).where(
            ProcessStep.id == step_id,
            ProcessStep.use_case_id == use_case_id,
        )
    )
    step = result.scalar_one_or_none()
    if step is None:
        return None
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(step, field, value)
    await db.flush()
    await db.refresh(step)
    return ProcessStepRead.model_validate(step)


async def delete_process_step(
    db: AsyncSession, use_case_id: uuid.UUID, step_id: uuid.UUID
) -> bool:
    result = await db.execute(
        select(ProcessStep).where(
            ProcessStep.id == step_id,
            ProcessStep.use_case_id == use_case_id,
        )
    )
    step = result.scalar_one_or_none()
    if step is None:
        return False
    await db.delete(step)
    return True


async def add_jtd_link(
    db: AsyncSession, step_id: uuid.UUID, payload: ProcessStepJTDLinkCreate
) -> ProcessStepJTDLinkRead:
    link = ProcessStepJTDLink(
        process_step_id=step_id,
        jtd_type=payload.jtd_type,
        jtd_id=payload.jtd_id,
        sequence_within_step=payload.sequence_within_step,
    )
    db.add(link)
    await db.flush()
    await db.refresh(link)
    return ProcessStepJTDLinkRead.model_validate(link)


async def remove_jtd_link(db: AsyncSession, link_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(ProcessStepJTDLink).where(ProcessStepJTDLink.id == link_id)
    )
    link = result.scalar_one_or_none()
    if link is None:
        return False
    await db.delete(link)
    return True


async def assign_step_to_cluster(
    db: AsyncSession, cluster_id: uuid.UUID, step_id: uuid.UUID
) -> ClusterProcessStepRead:
    # Upsert — if assignment already exists return it
    result = await db.execute(
        select(ClusterProcessStep).where(
            ClusterProcessStep.cluster_id == cluster_id,
            ClusterProcessStep.process_step_id == step_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return ClusterProcessStepRead.model_validate(existing)
    cs = ClusterProcessStep(cluster_id=cluster_id, process_step_id=step_id)
    db.add(cs)
    await db.flush()
    await db.refresh(cs)
    return ClusterProcessStepRead.model_validate(cs)


async def remove_step_from_cluster(
    db: AsyncSession, cluster_id: uuid.UUID, step_id: uuid.UUID
) -> bool:
    result = await db.execute(
        select(ClusterProcessStep).where(
            ClusterProcessStep.cluster_id == cluster_id,
            ClusterProcessStep.process_step_id == step_id,
        )
    )
    cs = result.scalar_one_or_none()
    if cs is None:
        return False
    await db.delete(cs)
    return True
