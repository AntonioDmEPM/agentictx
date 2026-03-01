"""Discovery module service — all DB operations for discovery entities.

Follows the same pattern as engagement/service.py:
- Uses db.flush() not db.commit()
- Returns Pydantic Read schemas
- No business logic in route handlers
"""
import uuid
from typing import Any

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.discovery import (
    ClusterCognitiveLink,
    ClusterJTDLink,
    ClusterProcessStep,
    ClusterStatus,
    CognitiveJTD,
    ConversationMessage,
    DelegationCluster,
    JTDStatus,
    LivedJTD,
    MessageRole,
    ProcessStep,
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
    process_phase_id: uuid.UUID | None = None,
    status: str | None = None,
    source_message_id: uuid.UUID | None = None,
) -> LivedJTDRead:
    jtd = LivedJTD(
        use_case_id=use_case_id,
        description=description,
        system_context=system_context,
        process_phase_id=process_phase_id,
        status=JTDStatus(status) if status else JTDStatus.proposed,
        source_message_id=source_message_id,
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
    process_phase_id: uuid.UUID | None = None,
    status: str | None = None,
    source_message_id: uuid.UUID | None = None,
) -> CognitiveJTDRead:
    jtd = CognitiveJTD(
        use_case_id=use_case_id,
        description=description,
        cognitive_zone=cognitive_zone,
        load_intensity=load_intensity,
        process_phase_id=process_phase_id,
        status=JTDStatus(status) if status else JTDStatus.proposed,
        source_message_id=source_message_id,
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

def _best_match(ref: str, candidates: dict[str, uuid.UUID], threshold: float = 0.6) -> uuid.UUID | None:
    """Find the best matching candidate description for a reference string.

    Uses token overlap (Jaccard similarity) — no external dependencies.
    """
    ref_tokens = set(ref.lower().split())
    best_id: uuid.UUID | None = None
    best_score = 0.0
    for desc, cid in candidates.items():
        desc_tokens = set(desc.split())
        if not ref_tokens or not desc_tokens:
            continue
        overlap = len(ref_tokens & desc_tokens) / len(ref_tokens | desc_tokens)
        if overlap > best_score and overlap >= threshold:
            best_score = overlap
            best_id = cid
    return best_id


async def get_delegation_cluster(
    db: AsyncSession, use_case_id: uuid.UUID, cluster_id: uuid.UUID
) -> DelegationClusterRead | None:
    """Load a single delegation cluster with its link table data."""
    result = await db.execute(
        select(DelegationCluster).where(
            DelegationCluster.id == cluster_id,
            DelegationCluster.use_case_id == use_case_id,
        )
    )
    cluster = result.scalar_one_or_none()
    if cluster is None:
        return None

    jtd_links = await db.execute(
        select(ClusterJTDLink).where(ClusterJTDLink.cluster_id == cluster_id)
    )
    cognitive_links = await db.execute(
        select(ClusterCognitiveLink).where(ClusterCognitiveLink.cluster_id == cluster_id)
    )
    return DelegationClusterRead(
        id=cluster.id,
        use_case_id=cluster.use_case_id,
        name=cluster.name,
        purpose=cluster.purpose,
        cognitive_jtd_ids=[l.cognitive_load_id for l in cognitive_links.scalars().all()],
        lived_jtd_ids=[l.jtd_id for l in jtd_links.scalars().all()],
        suitability_scores=cluster.suitability_scores,
        delegation_mode=cluster.delegation_mode,
        status=cluster.status,
        is_scored=cluster.is_scored,
        created_at=cluster.created_at,
        updated_at=cluster.updated_at,
    )


async def add_cluster_jtd_link(
    db: AsyncSession, cluster_id: uuid.UUID, jtd_id: uuid.UUID
) -> ClusterJTDLink:
    """Add a JTD to a cluster (idempotent — skips if link exists)."""
    existing = await db.execute(
        select(ClusterJTDLink).where(
            ClusterJTDLink.cluster_id == cluster_id,
            ClusterJTDLink.jtd_id == jtd_id,
        )
    )
    link = existing.scalar_one_or_none()
    if link:
        return link
    link = ClusterJTDLink(cluster_id=cluster_id, jtd_id=jtd_id)
    db.add(link)
    await db.flush()
    await db.refresh(link)
    return link


async def remove_cluster_jtd_link(
    db: AsyncSession, cluster_id: uuid.UUID, jtd_id: uuid.UUID
) -> bool:
    """Remove a JTD from a cluster. Returns True if deleted, False if not found."""
    result = await db.execute(
        select(ClusterJTDLink).where(
            ClusterJTDLink.cluster_id == cluster_id,
            ClusterJTDLink.jtd_id == jtd_id,
        )
    )
    link = result.scalar_one_or_none()
    if link is None:
        return False
    await db.delete(link)
    await db.flush()
    return True


async def add_cluster_cognitive_link(
    db: AsyncSession, cluster_id: uuid.UUID, cognitive_load_id: uuid.UUID
) -> ClusterCognitiveLink:
    """Add a Cognitive Load item to a cluster (idempotent)."""
    existing = await db.execute(
        select(ClusterCognitiveLink).where(
            ClusterCognitiveLink.cluster_id == cluster_id,
            ClusterCognitiveLink.cognitive_load_id == cognitive_load_id,
        )
    )
    link = existing.scalar_one_or_none()
    if link:
        return link
    link = ClusterCognitiveLink(cluster_id=cluster_id, cognitive_load_id=cognitive_load_id)
    db.add(link)
    await db.flush()
    await db.refresh(link)
    return link


async def remove_cluster_cognitive_link(
    db: AsyncSession, cluster_id: uuid.UUID, cognitive_load_id: uuid.UUID
) -> bool:
    """Remove a Cognitive Load item from a cluster."""
    result = await db.execute(
        select(ClusterCognitiveLink).where(
            ClusterCognitiveLink.cluster_id == cluster_id,
            ClusterCognitiveLink.cognitive_load_id == cognitive_load_id,
        )
    )
    link = result.scalar_one_or_none()
    if link is None:
        return False
    await db.delete(link)
    await db.flush()
    return True


async def create_delegation_cluster(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    name: str,
    purpose: str | None = None,
    cognitive_jtd_refs: list[str] | None = None,
    lived_jtd_refs: list[str] | None = None,
) -> DelegationClusterRead:
    cluster = DelegationCluster(
        use_case_id=use_case_id,
        name=name,
        purpose=purpose,
        status=ClusterStatus.proposed,
    )
    db.add(cluster)
    await db.flush()
    await db.refresh(cluster)

    cognitive_ids: list[uuid.UUID] = []
    lived_ids: list[uuid.UUID] = []

    # Resolve cognitive JTD refs (descriptions) to UUIDs and create link records
    if cognitive_jtd_refs:
        all_cognitive = await db.execute(
            select(CognitiveJTD).where(CognitiveJTD.use_case_id == use_case_id)
        )
        cognitive_by_desc = {
            j.description.lower(): j.id for j in all_cognitive.scalars().all()
        }
        for ref in cognitive_jtd_refs:
            if not ref:
                continue
            # Exact match first, then fuzzy fallback
            matched_id = cognitive_by_desc.get(ref.lower())
            if not matched_id:
                matched_id = _best_match(ref, cognitive_by_desc)
            if matched_id:
                link = ClusterCognitiveLink(
                    cluster_id=cluster.id, cognitive_load_id=matched_id
                )
                db.add(link)
                cognitive_ids.append(matched_id)

    # Resolve lived JTD refs (descriptions) to UUIDs and create link records
    if lived_jtd_refs:
        all_lived = await db.execute(
            select(LivedJTD).where(LivedJTD.use_case_id == use_case_id)
        )
        lived_by_desc = {
            j.description.lower(): j.id for j in all_lived.scalars().all()
        }
        for ref in lived_jtd_refs:
            if not ref:
                continue
            # Exact match first, then fuzzy fallback
            matched_id = lived_by_desc.get(ref.lower())
            if not matched_id:
                matched_id = _best_match(ref, lived_by_desc)
            if matched_id:
                link = ClusterJTDLink(
                    cluster_id=cluster.id, jtd_id=matched_id
                )
                db.add(link)
                lived_ids.append(matched_id)

    await db.flush()

    return DelegationClusterRead(
        id=cluster.id,
        use_case_id=cluster.use_case_id,
        name=cluster.name,
        purpose=cluster.purpose,
        cognitive_jtd_ids=cognitive_ids,
        lived_jtd_ids=lived_ids,
        suitability_scores=cluster.suitability_scores,
        delegation_mode=cluster.delegation_mode,
        status=cluster.status,
        is_scored=cluster.is_scored,
        created_at=cluster.created_at,
        updated_at=cluster.updated_at,
    )


async def list_delegation_clusters(
    db: AsyncSession, use_case_id: uuid.UUID
) -> list[DelegationClusterRead]:
    result = await db.execute(
        select(DelegationCluster)
        .where(DelegationCluster.use_case_id == use_case_id)
        .order_by(DelegationCluster.created_at.asc())
    )
    clusters = result.scalars().all()
    cluster_ids = [c.id for c in clusters]

    # Batch-load link tables
    jtd_links_map: dict[uuid.UUID, list[uuid.UUID]] = {cid: [] for cid in cluster_ids}
    cognitive_links_map: dict[uuid.UUID, list[uuid.UUID]] = {cid: [] for cid in cluster_ids}

    if cluster_ids:
        jtd_links_result = await db.execute(
            select(ClusterJTDLink).where(ClusterJTDLink.cluster_id.in_(cluster_ids))
        )
        for link in jtd_links_result.scalars().all():
            jtd_links_map[link.cluster_id].append(link.jtd_id)

        cognitive_links_result = await db.execute(
            select(ClusterCognitiveLink).where(ClusterCognitiveLink.cluster_id.in_(cluster_ids))
        )
        for link in cognitive_links_result.scalars().all():
            cognitive_links_map[link.cluster_id].append(link.cognitive_load_id)

    return [
        DelegationClusterRead(
            id=c.id,
            use_case_id=c.use_case_id,
            name=c.name,
            purpose=c.purpose,
            cognitive_jtd_ids=cognitive_links_map.get(c.id, []),
            lived_jtd_ids=jtd_links_map.get(c.id, []),
            suitability_scores=c.suitability_scores,
            delegation_mode=c.delegation_mode,
            status=c.status,
            is_scored=c.is_scored,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in clusters
    ]


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

    # Load link table data
    jtd_links = await db.execute(
        select(ClusterJTDLink).where(ClusterJTDLink.cluster_id == cluster_id)
    )
    cognitive_links = await db.execute(
        select(ClusterCognitiveLink).where(ClusterCognitiveLink.cluster_id == cluster_id)
    )
    return DelegationClusterRead(
        id=cluster.id,
        use_case_id=cluster.use_case_id,
        name=cluster.name,
        purpose=cluster.purpose,
        cognitive_jtd_ids=[l.cognitive_load_id for l in cognitive_links.scalars().all()],
        lived_jtd_ids=[l.jtd_id for l in jtd_links.scalars().all()],
        suitability_scores=cluster.suitability_scores,
        delegation_mode=cluster.delegation_mode,
        status=cluster.status,
        is_scored=cluster.is_scored,
        created_at=cluster.created_at,
        updated_at=cluster.updated_at,
    )


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


async def reset_discovery_data(
    db: AsyncSession, use_case_id: uuid.UUID
) -> dict[str, int]:
    """Bulk-delete all Discovery data for a use case, preserving the engagement and use case shell.

    Deletes in FK-safe order. Caller must commit.
    """
    counts: dict[str, int] = {}

    # 1. Clusters (cascades to cluster_jtd_links, cluster_cognitive_links, cluster_process_steps)
    r = await db.execute(
        delete(DelegationCluster).where(DelegationCluster.use_case_id == use_case_id)
    )
    counts["clusters"] = r.rowcount  # type: ignore[assignment]

    # 2. Lived JTDs
    r = await db.execute(
        delete(LivedJTD).where(LivedJTD.use_case_id == use_case_id)
    )
    counts["lived_jtds"] = r.rowcount  # type: ignore[assignment]

    # 3. Cognitive JTDs
    r = await db.execute(
        delete(CognitiveJTD).where(CognitiveJTD.use_case_id == use_case_id)
    )
    counts["cognitive_jtds"] = r.rowcount  # type: ignore[assignment]

    # 4. Process Steps
    r = await db.execute(
        delete(ProcessStep).where(ProcessStep.use_case_id == use_case_id)
    )
    counts["process_steps"] = r.rowcount  # type: ignore[assignment]

    # 5. Conversation Messages
    r = await db.execute(
        delete(ConversationMessage).where(ConversationMessage.use_case_id == use_case_id)
    )
    counts["messages"] = r.rowcount  # type: ignore[assignment]

    return counts


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
    cluster.is_scored = True
    await db.flush()
    await db.refresh(cluster)

    # Load link table data
    jtd_links = await db.execute(
        select(ClusterJTDLink).where(ClusterJTDLink.cluster_id == cluster_id)
    )
    cognitive_links = await db.execute(
        select(ClusterCognitiveLink).where(ClusterCognitiveLink.cluster_id == cluster_id)
    )
    return DelegationClusterRead(
        id=cluster.id,
        use_case_id=cluster.use_case_id,
        name=cluster.name,
        purpose=cluster.purpose,
        cognitive_jtd_ids=[l.cognitive_load_id for l in cognitive_links.scalars().all()],
        lived_jtd_ids=[l.jtd_id for l in jtd_links.scalars().all()],
        suitability_scores=cluster.suitability_scores,
        delegation_mode=cluster.delegation_mode,
        status=cluster.status,
        is_scored=cluster.is_scored,
        created_at=cluster.created_at,
        updated_at=cluster.updated_at,
    )


# ─── Provenance & Cluster Superseding ────────────────────────────────────────

async def backfill_jtd_source_message(
    db: AsyncSession,
    lived_jtd_ids: list[uuid.UUID],
    cognitive_jtd_ids: list[uuid.UUID],
    message_id: uuid.UUID,
) -> None:
    """Set source_message_id on JTDs created during this stream (two-phase provenance)."""
    if lived_jtd_ids:
        await db.execute(
            update(LivedJTD)
            .where(LivedJTD.id.in_(lived_jtd_ids))
            .values(source_message_id=message_id)
        )
    if cognitive_jtd_ids:
        await db.execute(
            update(CognitiveJTD)
            .where(CognitiveJTD.id.in_(cognitive_jtd_ids))
            .values(source_message_id=message_id)
        )


async def mark_clusters_replaced(
    db: AsyncSession, use_case_id: uuid.UUID
) -> int:
    """Mark all proposed/confirmed clusters as 'replaced'. Returns count."""
    result = await db.execute(
        select(DelegationCluster).where(
            DelegationCluster.use_case_id == use_case_id,
            DelegationCluster.status.in_([
                ClusterStatus.proposed,
                ClusterStatus.confirmed,
            ]),
        )
    )
    clusters = result.scalars().all()
    for c in clusters:
        c.status = ClusterStatus.replaced
    await db.flush()
    return len(clusters)


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

    cluster_steps_list: list[ClusterProcessStep] = []

    if step_ids:
        cs_result = await db.execute(
            select(ClusterProcessStep)
            .where(ClusterProcessStep.process_step_id.in_(step_ids))
        )
        cluster_steps_list = list(cs_result.scalars().all())

    return ProcessFlowRead(
        use_case_id=use_case_id,
        steps=[ProcessStepRead.model_validate(s) for s in steps],
        cluster_steps=[ClusterProcessStepRead.model_validate(c) for c in cluster_steps_list],
    )


async def create_process_step(
    db: AsyncSession, use_case_id: uuid.UUID, payload: ProcessStepCreate
) -> ProcessStepRead:
    step = ProcessStep(
        use_case_id=use_case_id,
        name=payload.name,
        description=payload.description,
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
