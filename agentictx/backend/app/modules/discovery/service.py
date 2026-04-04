"""Discovery module service — all DB operations for discovery entities.

Handles activities, cognitive load items, agent scopes,
process steps, and conversation messages.

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


# ─── Activities (Jobs To Be Done) ────────────────────────────────────────────

async def create_activity(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    description: str,
    system_context: str | None = None,
    process_phase_id: uuid.UUID | None = None,
    status: str | None = None,
    source_message_id: uuid.UUID | None = None,
) -> LivedJTDRead:
    activity = LivedJTD(
        use_case_id=use_case_id,
        description=description,
        system_context=system_context,
        process_phase_id=process_phase_id,
        status=JTDStatus(status) if status else JTDStatus.proposed,
        source_message_id=source_message_id,
    )
    db.add(activity)
    await db.flush()
    await db.refresh(activity)
    return LivedJTDRead.model_validate(activity)


# Keep old name as alias for backward compatibility
create_lived_jtd = create_activity


async def list_activities(
    db: AsyncSession, use_case_id: uuid.UUID
) -> list[LivedJTDRead]:
    result = await db.execute(
        select(LivedJTD)
        .where(LivedJTD.use_case_id == use_case_id)
        .order_by(LivedJTD.created_at.asc())
    )
    activities = result.scalars().all()
    return [LivedJTDRead.model_validate(a) for a in activities]


# Keep old name as alias for backward compatibility
list_lived_jtds = list_activities


async def update_activity(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    activity_id: uuid.UUID,
    payload: LivedJTDUpdate,
) -> LivedJTDRead | None:
    result = await db.execute(
        select(LivedJTD).where(
            LivedJTD.id == activity_id,
            LivedJTD.use_case_id == use_case_id,
        )
    )
    activity = result.scalar_one_or_none()
    if activity is None:
        return None
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(activity, field, value)
    await db.flush()
    await db.refresh(activity)
    return LivedJTDRead.model_validate(activity)


# Keep old name as alias for backward compatibility
update_lived_jtd = update_activity


async def delete_activity(
    db: AsyncSession, use_case_id: uuid.UUID, activity_id: uuid.UUID
) -> bool:
    result = await db.execute(
        select(LivedJTD).where(
            LivedJTD.id == activity_id,
            LivedJTD.use_case_id == use_case_id,
        )
    )
    activity = result.scalar_one_or_none()
    if activity is None:
        return False
    await db.delete(activity)
    return True


# Keep old name as alias for backward compatibility
delete_lived_jtd = delete_activity


# ─── Cognitive Load Items ────────────────────────────────────────────────────

async def create_cognitive_load(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    description: str,
    cognitive_zone: str | None = None,
    load_intensity: int | None = None,
    process_phase_id: uuid.UUID | None = None,
    status: str | None = None,
    source_message_id: uuid.UUID | None = None,
) -> CognitiveJTDRead:
    item = CognitiveJTD(
        use_case_id=use_case_id,
        description=description,
        cognitive_zone=cognitive_zone,
        load_intensity=load_intensity,
        process_phase_id=process_phase_id,
        status=JTDStatus(status) if status else JTDStatus.proposed,
        source_message_id=source_message_id,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return CognitiveJTDRead.model_validate(item)


# Keep old name as alias for backward compatibility
create_cognitive_jtd = create_cognitive_load


async def list_cognitive_load_items(
    db: AsyncSession, use_case_id: uuid.UUID
) -> list[CognitiveJTDRead]:
    result = await db.execute(
        select(CognitiveJTD)
        .where(CognitiveJTD.use_case_id == use_case_id)
        .order_by(CognitiveJTD.created_at.asc())
    )
    items = result.scalars().all()
    return [CognitiveJTDRead.model_validate(i) for i in items]


# Keep old name as alias for backward compatibility
list_cognitive_jtds = list_cognitive_load_items


async def update_cognitive_load(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    item_id: uuid.UUID,
    payload: CognitiveJTDUpdate,
) -> CognitiveJTDRead | None:
    result = await db.execute(
        select(CognitiveJTD).where(
            CognitiveJTD.id == item_id,
            CognitiveJTD.use_case_id == use_case_id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        return None
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    await db.flush()
    await db.refresh(item)
    return CognitiveJTDRead.model_validate(item)


# Keep old name as alias for backward compatibility
update_cognitive_jtd = update_cognitive_load


async def delete_cognitive_load(
    db: AsyncSession, use_case_id: uuid.UUID, item_id: uuid.UUID
) -> bool:
    result = await db.execute(
        select(CognitiveJTD).where(
            CognitiveJTD.id == item_id,
            CognitiveJTD.use_case_id == use_case_id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        return False
    await db.delete(item)
    return True


# Keep old name as alias for backward compatibility
delete_cognitive_jtd = delete_cognitive_load


# ─── Agent Scopes (Delegation Clusters) ──────────────────────────────────────

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


async def get_agent_scope(
    db: AsyncSession, use_case_id: uuid.UUID, scope_id: uuid.UUID
) -> DelegationClusterRead | None:
    """Load a single agent scope with its link table data."""
    result = await db.execute(
        select(DelegationCluster).where(
            DelegationCluster.id == scope_id,
            DelegationCluster.use_case_id == use_case_id,
        )
    )
    scope = result.scalar_one_or_none()
    if scope is None:
        return None

    activity_links = await db.execute(
        select(ClusterJTDLink).where(ClusterJTDLink.cluster_id == scope_id)
    )
    cognitive_links = await db.execute(
        select(ClusterCognitiveLink).where(ClusterCognitiveLink.cluster_id == scope_id)
    )
    return DelegationClusterRead(
        id=scope.id,
        use_case_id=scope.use_case_id,
        name=scope.name,
        purpose=scope.purpose,
        cognitive_jtd_ids=[l.cognitive_load_id for l in cognitive_links.scalars().all()],
        lived_jtd_ids=[l.jtd_id for l in activity_links.scalars().all()],
        suitability_scores=scope.suitability_scores,
        delegation_mode=scope.delegation_mode,
        status=scope.status,
        is_scored=scope.is_scored,
        created_at=scope.created_at,
        updated_at=scope.updated_at,
    )


# Keep old name as alias for backward compatibility
get_delegation_cluster = get_agent_scope


async def add_scope_activity_link(
    db: AsyncSession, scope_id: uuid.UUID, activity_id: uuid.UUID
) -> ClusterJTDLink:
    """Add an activity to an agent scope (idempotent — skips if link exists)."""
    existing = await db.execute(
        select(ClusterJTDLink).where(
            ClusterJTDLink.cluster_id == scope_id,
            ClusterJTDLink.jtd_id == activity_id,
        )
    )
    link = existing.scalar_one_or_none()
    if link:
        return link
    link = ClusterJTDLink(cluster_id=scope_id, jtd_id=activity_id)
    db.add(link)
    await db.flush()
    await db.refresh(link)
    return link


# Keep old name as alias for backward compatibility
add_cluster_jtd_link = add_scope_activity_link


async def remove_scope_activity_link(
    db: AsyncSession, scope_id: uuid.UUID, activity_id: uuid.UUID
) -> bool:
    """Remove an activity from an agent scope. Returns True if deleted, False if not found."""
    result = await db.execute(
        select(ClusterJTDLink).where(
            ClusterJTDLink.cluster_id == scope_id,
            ClusterJTDLink.jtd_id == activity_id,
        )
    )
    link = result.scalar_one_or_none()
    if link is None:
        return False
    await db.delete(link)
    await db.flush()
    return True


# Keep old name as alias for backward compatibility
remove_cluster_jtd_link = remove_scope_activity_link


async def add_scope_cognitive_link(
    db: AsyncSession, scope_id: uuid.UUID, cognitive_load_id: uuid.UUID
) -> ClusterCognitiveLink:
    """Add a Cognitive Load item to an agent scope (idempotent)."""
    existing = await db.execute(
        select(ClusterCognitiveLink).where(
            ClusterCognitiveLink.cluster_id == scope_id,
            ClusterCognitiveLink.cognitive_load_id == cognitive_load_id,
        )
    )
    link = existing.scalar_one_or_none()
    if link:
        return link
    link = ClusterCognitiveLink(cluster_id=scope_id, cognitive_load_id=cognitive_load_id)
    db.add(link)
    await db.flush()
    await db.refresh(link)
    return link


# Keep old name as alias for backward compatibility
add_cluster_cognitive_link = add_scope_cognitive_link


async def remove_scope_cognitive_link(
    db: AsyncSession, scope_id: uuid.UUID, cognitive_load_id: uuid.UUID
) -> bool:
    """Remove a Cognitive Load item from an agent scope."""
    result = await db.execute(
        select(ClusterCognitiveLink).where(
            ClusterCognitiveLink.cluster_id == scope_id,
            ClusterCognitiveLink.cognitive_load_id == cognitive_load_id,
        )
    )
    link = result.scalar_one_or_none()
    if link is None:
        return False
    await db.delete(link)
    await db.flush()
    return True


# Keep old name as alias for backward compatibility
remove_cluster_cognitive_link = remove_scope_cognitive_link


async def create_agent_scope(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    name: str,
    purpose: str | None = None,
    cognitive_jtd_refs: list[str] | None = None,
    lived_jtd_refs: list[str] | None = None,
) -> DelegationClusterRead:
    scope = DelegationCluster(
        use_case_id=use_case_id,
        name=name,
        purpose=purpose,
        status=ClusterStatus.proposed,
    )
    db.add(scope)
    await db.flush()
    await db.refresh(scope)

    cognitive_ids: list[uuid.UUID] = []
    activity_ids: list[uuid.UUID] = []

    # Resolve cognitive load refs (descriptions) to UUIDs and create link records
    if cognitive_jtd_refs:
        all_cognitive = await db.execute(
            select(CognitiveJTD).where(CognitiveJTD.use_case_id == use_case_id)
        )
        cognitive_by_desc = {
            item.description.lower(): item.id for item in all_cognitive.scalars().all()
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
                    cluster_id=scope.id, cognitive_load_id=matched_id
                )
                db.add(link)
                cognitive_ids.append(matched_id)

    # Resolve activity refs (descriptions) to UUIDs and create link records
    if lived_jtd_refs:
        all_activities = await db.execute(
            select(LivedJTD).where(LivedJTD.use_case_id == use_case_id)
        )
        activity_by_desc = {
            a.description.lower(): a.id for a in all_activities.scalars().all()
        }
        for ref in lived_jtd_refs:
            if not ref:
                continue
            # Exact match first, then fuzzy fallback
            matched_id = activity_by_desc.get(ref.lower())
            if not matched_id:
                matched_id = _best_match(ref, activity_by_desc)
            if matched_id:
                link = ClusterJTDLink(
                    cluster_id=scope.id, jtd_id=matched_id
                )
                db.add(link)
                activity_ids.append(matched_id)

    await db.flush()

    return DelegationClusterRead(
        id=scope.id,
        use_case_id=scope.use_case_id,
        name=scope.name,
        purpose=scope.purpose,
        cognitive_jtd_ids=cognitive_ids,
        lived_jtd_ids=activity_ids,
        suitability_scores=scope.suitability_scores,
        delegation_mode=scope.delegation_mode,
        status=scope.status,
        is_scored=scope.is_scored,
        created_at=scope.created_at,
        updated_at=scope.updated_at,
    )


# Keep old name as alias for backward compatibility
create_delegation_cluster = create_agent_scope


async def list_agent_scopes(
    db: AsyncSession, use_case_id: uuid.UUID
) -> list[DelegationClusterRead]:
    result = await db.execute(
        select(DelegationCluster)
        .where(DelegationCluster.use_case_id == use_case_id)
        .order_by(DelegationCluster.created_at.asc())
    )
    scopes = result.scalars().all()
    scope_ids = [s.id for s in scopes]

    # Batch-load link tables
    activity_links_map: dict[uuid.UUID, list[uuid.UUID]] = {sid: [] for sid in scope_ids}
    cognitive_links_map: dict[uuid.UUID, list[uuid.UUID]] = {sid: [] for sid in scope_ids}

    if scope_ids:
        activity_links_result = await db.execute(
            select(ClusterJTDLink).where(ClusterJTDLink.cluster_id.in_(scope_ids))
        )
        for link in activity_links_result.scalars().all():
            activity_links_map[link.cluster_id].append(link.jtd_id)

        cognitive_links_result = await db.execute(
            select(ClusterCognitiveLink).where(ClusterCognitiveLink.cluster_id.in_(scope_ids))
        )
        for link in cognitive_links_result.scalars().all():
            cognitive_links_map[link.cluster_id].append(link.cognitive_load_id)

    return [
        DelegationClusterRead(
            id=s.id,
            use_case_id=s.use_case_id,
            name=s.name,
            purpose=s.purpose,
            cognitive_jtd_ids=cognitive_links_map.get(s.id, []),
            lived_jtd_ids=activity_links_map.get(s.id, []),
            suitability_scores=s.suitability_scores,
            delegation_mode=s.delegation_mode,
            status=s.status,
            is_scored=s.is_scored,
            created_at=s.created_at,
            updated_at=s.updated_at,
        )
        for s in scopes
    ]


# Keep old name as alias for backward compatibility
list_delegation_clusters = list_agent_scopes


async def update_agent_scope(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    scope_id: uuid.UUID,
    payload: DelegationClusterUpdate,
) -> DelegationClusterRead | None:
    result = await db.execute(
        select(DelegationCluster).where(
            DelegationCluster.id == scope_id,
            DelegationCluster.use_case_id == use_case_id,
        )
    )
    scope = result.scalar_one_or_none()
    if scope is None:
        return None
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(scope, field, value)
    await db.flush()
    await db.refresh(scope)

    # Load link table data
    activity_links = await db.execute(
        select(ClusterJTDLink).where(ClusterJTDLink.cluster_id == scope_id)
    )
    cognitive_links = await db.execute(
        select(ClusterCognitiveLink).where(ClusterCognitiveLink.cluster_id == scope_id)
    )
    return DelegationClusterRead(
        id=scope.id,
        use_case_id=scope.use_case_id,
        name=scope.name,
        purpose=scope.purpose,
        cognitive_jtd_ids=[l.cognitive_load_id for l in cognitive_links.scalars().all()],
        lived_jtd_ids=[l.jtd_id for l in activity_links.scalars().all()],
        suitability_scores=scope.suitability_scores,
        delegation_mode=scope.delegation_mode,
        status=scope.status,
        is_scored=scope.is_scored,
        created_at=scope.created_at,
        updated_at=scope.updated_at,
    )


# Keep old name as alias for backward compatibility
update_delegation_cluster = update_agent_scope


async def delete_agent_scope(
    db: AsyncSession, use_case_id: uuid.UUID, scope_id: uuid.UUID
) -> bool:
    result = await db.execute(
        select(DelegationCluster).where(
            DelegationCluster.id == scope_id,
            DelegationCluster.use_case_id == use_case_id,
        )
    )
    scope = result.scalar_one_or_none()
    if scope is None:
        return False
    await db.delete(scope)
    return True


# Keep old name as alias for backward compatibility
delete_delegation_cluster = delete_agent_scope


async def reset_discovery_data(
    db: AsyncSession, use_case_id: uuid.UUID
) -> dict[str, int]:
    """Bulk-delete all Discovery data for a use case, preserving the engagement and use case shell.

    Deletes in FK-safe order. Caller must commit.
    """
    counts: dict[str, int] = {}

    # 1. Agent scopes (cascades to link tables and cluster_process_steps)
    r = await db.execute(
        delete(DelegationCluster).where(DelegationCluster.use_case_id == use_case_id)
    )
    counts["agent_scopes"] = r.rowcount  # type: ignore[assignment]

    # 2. Activities (Jobs To Be Done)
    r = await db.execute(
        delete(LivedJTD).where(LivedJTD.use_case_id == use_case_id)
    )
    counts["activities"] = r.rowcount  # type: ignore[assignment]

    # 3. Cognitive Load items
    r = await db.execute(
        delete(CognitiveJTD).where(CognitiveJTD.use_case_id == use_case_id)
    )
    counts["cognitive_load_items"] = r.rowcount  # type: ignore[assignment]

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


async def apply_readiness_scores(
    db: AsyncSession,
    use_case_id: uuid.UUID,
    scope_id: uuid.UUID,
    scores: SuitabilityScores,
) -> DelegationClusterRead | None:
    result = await db.execute(
        select(DelegationCluster).where(
            DelegationCluster.id == scope_id,
            DelegationCluster.use_case_id == use_case_id,
        )
    )
    scope = result.scalar_one_or_none()
    if scope is None:
        return None
    scope.suitability_scores = scores.model_dump()
    scope.is_scored = True
    await db.flush()
    await db.refresh(scope)

    # Load link table data
    activity_links = await db.execute(
        select(ClusterJTDLink).where(ClusterJTDLink.cluster_id == scope_id)
    )
    cognitive_links = await db.execute(
        select(ClusterCognitiveLink).where(ClusterCognitiveLink.cluster_id == scope_id)
    )
    return DelegationClusterRead(
        id=scope.id,
        use_case_id=scope.use_case_id,
        name=scope.name,
        purpose=scope.purpose,
        cognitive_jtd_ids=[l.cognitive_load_id for l in cognitive_links.scalars().all()],
        lived_jtd_ids=[l.jtd_id for l in activity_links.scalars().all()],
        suitability_scores=scope.suitability_scores,
        delegation_mode=scope.delegation_mode,
        status=scope.status,
        is_scored=scope.is_scored,
        created_at=scope.created_at,
        updated_at=scope.updated_at,
    )


# Keep old name as alias for backward compatibility
apply_suitability_scores = apply_readiness_scores


# ─── Provenance & Scope Superseding ──────────────────────────────────────────

async def backfill_source_message(
    db: AsyncSession,
    activity_ids: list[uuid.UUID],
    cognitive_load_ids: list[uuid.UUID],
    message_id: uuid.UUID,
) -> None:
    """Set source_message_id on activities/cognitive load items created during this stream (two-phase provenance)."""
    if activity_ids:
        await db.execute(
            update(LivedJTD)
            .where(LivedJTD.id.in_(activity_ids))
            .values(source_message_id=message_id)
        )
    if cognitive_load_ids:
        await db.execute(
            update(CognitiveJTD)
            .where(CognitiveJTD.id.in_(cognitive_load_ids))
            .values(source_message_id=message_id)
        )


# Keep old name as alias for backward compatibility
backfill_jtd_source_message = backfill_source_message


async def mark_scopes_replaced(
    db: AsyncSession, use_case_id: uuid.UUID
) -> int:
    """Mark all proposed/confirmed agent scopes as 'replaced'. Returns count."""
    result = await db.execute(
        select(DelegationCluster).where(
            DelegationCluster.use_case_id == use_case_id,
            DelegationCluster.status.in_([
                ClusterStatus.proposed,
                ClusterStatus.confirmed,
            ]),
        )
    )
    scopes = result.scalars().all()
    for s in scopes:
        s.status = ClusterStatus.replaced
    await db.flush()
    return len(scopes)


# Keep old name as alias for backward compatibility
mark_clusters_replaced = mark_scopes_replaced


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
    activities = await list_activities(db, use_case_id)
    cognitive_items = await list_cognitive_load_items(db, use_case_id)
    scopes = await list_agent_scopes(db, use_case_id)

    return CognitiveMapRead(
        use_case_id=use_case_id,
        raw_inputs=raw_inputs,
        conversation_messages=messages,
        lived_jtds=activities,
        cognitive_jtds=cognitive_items,
        delegation_clusters=scopes,
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


async def assign_step_to_scope(
    db: AsyncSession, scope_id: uuid.UUID, step_id: uuid.UUID
) -> ClusterProcessStepRead:
    # Upsert — if assignment already exists return it
    result = await db.execute(
        select(ClusterProcessStep).where(
            ClusterProcessStep.cluster_id == scope_id,
            ClusterProcessStep.process_step_id == step_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return ClusterProcessStepRead.model_validate(existing)
    cs = ClusterProcessStep(cluster_id=scope_id, process_step_id=step_id)
    db.add(cs)
    await db.flush()
    await db.refresh(cs)
    return ClusterProcessStepRead.model_validate(cs)


# Keep old name as alias for backward compatibility
assign_step_to_cluster = assign_step_to_scope


async def remove_step_from_scope(
    db: AsyncSession, scope_id: uuid.UUID, step_id: uuid.UUID
) -> bool:
    result = await db.execute(
        select(ClusterProcessStep).where(
            ClusterProcessStep.cluster_id == scope_id,
            ClusterProcessStep.process_step_id == step_id,
        )
    )
    cs = result.scalar_one_or_none()
    if cs is None:
        return False
    await db.delete(cs)
    return True


# Keep old name as alias for backward compatibility
remove_step_from_cluster = remove_step_from_scope
