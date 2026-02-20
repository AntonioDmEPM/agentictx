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
    ClusterStatus,
    CognitiveJTD,
    ConversationMessage,
    DelegationCluster,
    JTDStatus,
    LivedJTD,
    MessageRole,
    RawInput,
    RawInputType,
)
from app.schemas.discovery import (
    CognitiveJTDRead,
    CognitiveJTDUpdate,
    CognitiveMapRead,
    DelegationClusterRead,
    DelegationClusterUpdate,
    LivedJTDRead,
    LivedJTDUpdate,
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
) -> LivedJTDRead:
    jtd = LivedJTD(
        use_case_id=use_case_id,
        description=description,
        system_context=system_context,
        cognitive_load_score=cognitive_load_score,
        status=JTDStatus.proposed,
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
) -> CognitiveJTDRead:
    jtd = CognitiveJTD(
        use_case_id=use_case_id,
        description=description,
        cognitive_zone=cognitive_zone,
        load_intensity=load_intensity,
        status=JTDStatus.proposed,
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
