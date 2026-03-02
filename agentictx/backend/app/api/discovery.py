"""Discovery API — REST routes for file upload + JTD/cluster CRUD, and WebSocket handler.

All REST routes return ResponseEnvelope[T] except 204 DELETE endpoints.
WebSocket at WS /api/v1/use-cases/{uc_id}/ws
"""
import asyncio
import json
import logging
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.discovery_agent import run_discovery_stream
from app.agents.suitability_agent import score_cluster
from app.core.database import AsyncSessionLocal, get_db
from app.models.discovery import MessageRole, RawInputType
from app.modules.discovery import service
from app.schemas.common import ResponseEnvelope
from app.schemas.discovery import (
    ClusterProcessStepRead,
    CognitiveJTDCreate,
    CognitiveJTDRead,
    CognitiveJTDUpdate,
    CognitiveMapRead,
    DelegationClusterRead,
    DelegationClusterUpdate,
    LivedJTDCreate,
    LivedJTDRead,
    LivedJTDUpdate,
    ProcessFlowRead,
    ProcessStepCreate,
    ProcessStepRead,
    ProcessStepUpdate,
    RawInputRead,
)
from app.services.file_storage import extract_text, is_image_mime, read_as_base64, save_upload

router = APIRouter(prefix="/use-cases", tags=["discovery"])


# ─── Raw Inputs — File Upload ─────────────────────────────────────────────────

@router.post(
    "/{uc_id}/raw-inputs",
    response_model=ResponseEnvelope[RawInputRead],
    status_code=status.HTTP_201_CREATED,
)
async def upload_raw_input(
    uc_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a file (transcript, document, or image) for a use case."""
    saved = await save_upload(file, str(uc_id))

    mime = saved["mime_type"]
    if is_image_mime(mime):
        input_type = RawInputType.image
    elif mime in (
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
    ):
        input_type = RawInputType.document
    else:
        input_type = RawInputType.transcript

    raw = await service.create_raw_input(
        db,
        use_case_id=uc_id,
        input_type=input_type,
        file_path=saved["file_path"],
        file_name=saved["file_name"],
        mime_type=mime,
    )
    return ResponseEnvelope(data=raw)


# ─── Cognitive Map — Full GET ─────────────────────────────────────────────────

@router.get("/{uc_id}/discovery", response_model=ResponseEnvelope[CognitiveMapRead])
async def get_discovery(uc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Return the full cognitive map + conversation history for a use case."""
    cognitive_map = await service.get_cognitive_map(db, uc_id)
    return ResponseEnvelope(data=cognitive_map)


# ─── Lived JTDs ──────────────────────────────────────────────────────────────

@router.post(
    "/{uc_id}/lived-jtds",
    response_model=ResponseEnvelope[LivedJTDRead],
    status_code=status.HTTP_201_CREATED,
)
async def create_lived_jtd(
    uc_id: uuid.UUID,
    payload: LivedJTDCreate,
    db: AsyncSession = Depends(get_db),
):
    """Manually create a Lived JTD (consultant direct edit, bypasses agent)."""
    jtd = await service.create_lived_jtd(
        db,
        use_case_id=uc_id,
        description=payload.description,
        system_context=payload.system_context,
        process_phase_id=payload.process_phase_id,
        status="confirmed",
    )
    await db.commit()
    return ResponseEnvelope(data=jtd)


@router.patch(
    "/{uc_id}/lived-jtds/{jtd_id}",
    response_model=ResponseEnvelope[LivedJTDRead],
)
async def update_lived_jtd(
    uc_id: uuid.UUID,
    jtd_id: uuid.UUID,
    payload: LivedJTDUpdate,
    db: AsyncSession = Depends(get_db),
):
    jtd = await service.update_lived_jtd(db, uc_id, jtd_id, payload)
    if jtd is None:
        raise HTTPException(status_code=404, detail="Lived JTD not found")
    return ResponseEnvelope(data=jtd)


@router.delete("/{uc_id}/lived-jtds/{jtd_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lived_jtd(
    uc_id: uuid.UUID,
    jtd_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    deleted = await service.delete_lived_jtd(db, uc_id, jtd_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Lived JTD not found")


# ─── Cognitive JTDs ──────────────────────────────────────────────────────────

@router.post(
    "/{uc_id}/cognitive-jtds",
    response_model=ResponseEnvelope[CognitiveJTDRead],
    status_code=status.HTTP_201_CREATED,
)
async def create_cognitive_jtd(
    uc_id: uuid.UUID,
    payload: CognitiveJTDCreate,
    db: AsyncSession = Depends(get_db),
):
    """Manually create a Cognitive JTD (consultant direct edit, bypasses agent)."""
    jtd = await service.create_cognitive_jtd(
        db,
        use_case_id=uc_id,
        description=payload.description,
        cognitive_zone=payload.cognitive_zone,
        load_intensity=payload.load_intensity,
        status="confirmed",
    )
    await db.commit()
    return ResponseEnvelope(data=jtd)


@router.patch(
    "/{uc_id}/cognitive-jtds/{jtd_id}",
    response_model=ResponseEnvelope[CognitiveJTDRead],
)
async def update_cognitive_jtd(
    uc_id: uuid.UUID,
    jtd_id: uuid.UUID,
    payload: CognitiveJTDUpdate,
    db: AsyncSession = Depends(get_db),
):
    jtd = await service.update_cognitive_jtd(db, uc_id, jtd_id, payload)
    if jtd is None:
        raise HTTPException(status_code=404, detail="Cognitive JTD not found")
    return ResponseEnvelope(data=jtd)


@router.delete("/{uc_id}/cognitive-jtds/{jtd_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cognitive_jtd(
    uc_id: uuid.UUID,
    jtd_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    deleted = await service.delete_cognitive_jtd(db, uc_id, jtd_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Cognitive JTD not found")


# ─── Delegation Clusters ──────────────────────────────────────────────────────

@router.patch(
    "/{uc_id}/clusters/{cluster_id}",
    response_model=ResponseEnvelope[DelegationClusterRead],
)
async def update_cluster(
    uc_id: uuid.UUID,
    cluster_id: uuid.UUID,
    payload: DelegationClusterUpdate,
    db: AsyncSession = Depends(get_db),
):
    cluster = await service.update_delegation_cluster(db, uc_id, cluster_id, payload)
    if cluster is None:
        raise HTTPException(status_code=404, detail="Delegation cluster not found")
    return ResponseEnvelope(data=cluster)


@router.delete("/{uc_id}/clusters/{cluster_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cluster(
    uc_id: uuid.UUID,
    cluster_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    deleted = await service.delete_delegation_cluster(db, uc_id, cluster_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Delegation cluster not found")


# ─── Auto-rescore helper ─────────────────────────────────────────────────────

async def _auto_rescore_cluster(
    db: AsyncSession,
    uc_id: uuid.UUID,
    cluster_id: uuid.UUID,
) -> None:
    """Re-run suitability scoring for a cluster that has already been scored.

    Called automatically after membership edits. Silently skips if the cluster
    is not yet scored (is_scored=False) or if the scoring agent fails.
    """
    cluster = await service.get_delegation_cluster(db, uc_id, cluster_id)
    if cluster is None or not cluster.is_scored:
        return

    all_cognitive = await service.list_cognitive_jtds(db, uc_id)
    all_lived = await service.list_lived_jtds(db, uc_id)

    cognitive_context = [
        {"description": j.description, "cognitive_zone": j.cognitive_zone, "load_intensity": j.load_intensity}
        for j in all_cognitive
        if j.status in ("confirmed", "proposed")
    ]
    lived_context = [
        {"description": j.description, "system_context": j.system_context}
        for j in all_lived
        if j.status in ("confirmed", "proposed")
    ]

    try:
        scores = await score_cluster(
            cluster_id=cluster_id,
            cluster_name=cluster.name,
            cluster_purpose=cluster.purpose,
            cognitive_jtds=cognitive_context,
            lived_jtds=lived_context,
        )
        await service.apply_suitability_scores(db, uc_id, cluster_id, scores)
    except (ValueError, Exception):
        # Scoring failure should not block membership edits
        pass


# ─── Cluster Membership Editing ──────────────────────────────────────────────

@router.put(
    "/{uc_id}/clusters/{cluster_id}/lived-jtds/{jtd_id}",
    response_model=ResponseEnvelope[DelegationClusterRead],
)
async def add_cluster_lived_jtd(
    uc_id: uuid.UUID,
    cluster_id: uuid.UUID,
    jtd_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Add a Lived JTD to a delegation cluster."""
    await service.add_cluster_jtd_link(db, cluster_id, jtd_id)
    await _auto_rescore_cluster(db, uc_id, cluster_id)
    cluster = await service.get_delegation_cluster(db, uc_id, cluster_id)
    if cluster is None:
        raise HTTPException(status_code=404, detail="Delegation cluster not found")
    await db.commit()
    return ResponseEnvelope(data=cluster)


@router.delete(
    "/{uc_id}/clusters/{cluster_id}/lived-jtds/{jtd_id}",
    response_model=ResponseEnvelope[DelegationClusterRead],
)
async def remove_cluster_lived_jtd(
    uc_id: uuid.UUID,
    cluster_id: uuid.UUID,
    jtd_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Remove a Lived JTD from a delegation cluster."""
    removed = await service.remove_cluster_jtd_link(db, cluster_id, jtd_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Link not found")
    await _auto_rescore_cluster(db, uc_id, cluster_id)
    cluster = await service.get_delegation_cluster(db, uc_id, cluster_id)
    if cluster is None:
        raise HTTPException(status_code=404, detail="Delegation cluster not found")
    await db.commit()
    return ResponseEnvelope(data=cluster)


@router.put(
    "/{uc_id}/clusters/{cluster_id}/cognitive-jtds/{jtd_id}",
    response_model=ResponseEnvelope[DelegationClusterRead],
)
async def add_cluster_cognitive_jtd(
    uc_id: uuid.UUID,
    cluster_id: uuid.UUID,
    jtd_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Add a Cognitive Load item to a delegation cluster."""
    await service.add_cluster_cognitive_link(db, cluster_id, jtd_id)
    await _auto_rescore_cluster(db, uc_id, cluster_id)
    cluster = await service.get_delegation_cluster(db, uc_id, cluster_id)
    if cluster is None:
        raise HTTPException(status_code=404, detail="Delegation cluster not found")
    await db.commit()
    return ResponseEnvelope(data=cluster)


@router.delete(
    "/{uc_id}/clusters/{cluster_id}/cognitive-jtds/{jtd_id}",
    response_model=ResponseEnvelope[DelegationClusterRead],
)
async def remove_cluster_cognitive_jtd(
    uc_id: uuid.UUID,
    cluster_id: uuid.UUID,
    jtd_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Remove a Cognitive Load item from a delegation cluster."""
    removed = await service.remove_cluster_cognitive_link(db, cluster_id, jtd_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Link not found")
    await _auto_rescore_cluster(db, uc_id, cluster_id)
    cluster = await service.get_delegation_cluster(db, uc_id, cluster_id)
    if cluster is None:
        raise HTTPException(status_code=404, detail="Delegation cluster not found")
    await db.commit()
    return ResponseEnvelope(data=cluster)


@router.post(
    "/{uc_id}/clusters/{cluster_id}/score",
    response_model=ResponseEnvelope[DelegationClusterRead],
)
async def score_delegation_cluster(
    uc_id: uuid.UUID,
    cluster_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Trigger suitability scoring for a delegation cluster."""
    # Load cluster
    clusters = await service.list_delegation_clusters(db, uc_id)
    cluster = next((c for c in clusters if c.id == cluster_id), None)
    if cluster is None:
        raise HTTPException(status_code=404, detail="Delegation cluster not found")

    # Load all confirmed JTDs as scoring context.
    # cognitive_jtd_ids may hold descriptions (from agent output) or UUIDs (after consultant linking).
    # We pass all confirmed JTDs — the scoring agent uses cluster name/purpose to identify scope.
    all_cognitive = await service.list_cognitive_jtds(db, uc_id)
    all_lived = await service.list_lived_jtds(db, uc_id)

    cognitive_context = [
        {"description": j.description, "cognitive_zone": j.cognitive_zone, "load_intensity": j.load_intensity}
        for j in all_cognitive
        if j.status in ("confirmed", "proposed")
    ]
    lived_context = [
        {"description": j.description, "system_context": j.system_context}
        for j in all_lived
        if j.status in ("confirmed", "proposed")
    ]

    try:
        scores = await score_cluster(
            cluster_id=cluster_id,
            cluster_name=cluster.name,
            cluster_purpose=cluster.purpose,
            cognitive_jtds=cognitive_context,
            lived_jtds=lived_context,
        )
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))

    updated = await service.apply_suitability_scores(db, uc_id, cluster_id, scores)
    return ResponseEnvelope(data=updated)


# ─── Process Flow ────────────────────────────────────────────────────────────

@router.get(
    "/{uc_id}/process-flow",
    response_model=ResponseEnvelope[ProcessFlowRead],
)
async def get_process_flow(uc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Return the full process flow (steps, JTD links, cluster assignments) for a use case."""
    flow = await service.get_process_flow(db, uc_id)
    return ResponseEnvelope(data=flow)


@router.post(
    "/{uc_id}/process-flow/steps",
    response_model=ResponseEnvelope[ProcessStepRead],
    status_code=status.HTTP_201_CREATED,
)
async def create_process_step(
    uc_id: uuid.UUID,
    payload: ProcessStepCreate,
    db: AsyncSession = Depends(get_db),
):
    step = await service.create_process_step(db, uc_id, payload)
    await db.commit()
    return ResponseEnvelope(data=step)


@router.patch(
    "/{uc_id}/process-flow/steps/{step_id}",
    response_model=ResponseEnvelope[ProcessStepRead],
)
async def update_process_step(
    uc_id: uuid.UUID,
    step_id: uuid.UUID,
    payload: ProcessStepUpdate,
    db: AsyncSession = Depends(get_db),
):
    step = await service.update_process_step(db, uc_id, step_id, payload)
    if step is None:
        raise HTTPException(status_code=404, detail="Process step not found")
    await db.commit()
    return ResponseEnvelope(data=step)


@router.delete(
    "/{uc_id}/process-flow/steps/{step_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_process_step(
    uc_id: uuid.UUID,
    step_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    deleted = await service.delete_process_step(db, uc_id, step_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Process step not found")
    await db.commit()


@router.post(
    "/{uc_id}/process-flow/clusters/{cluster_id}/steps/{step_id}",
    response_model=ResponseEnvelope[ClusterProcessStepRead],
    status_code=status.HTTP_201_CREATED,
)
async def assign_step_to_cluster(
    uc_id: uuid.UUID,
    cluster_id: uuid.UUID,
    step_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    cs = await service.assign_step_to_cluster(db, cluster_id, step_id)
    await db.commit()
    return ResponseEnvelope(data=cs)


@router.delete(
    "/{uc_id}/process-flow/clusters/{cluster_id}/steps/{step_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_step_from_cluster(
    uc_id: uuid.UUID,
    cluster_id: uuid.UUID,
    step_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    deleted = await service.remove_step_from_cluster(db, cluster_id, step_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Cluster step assignment not found")
    await db.commit()


# ─── Discovery Reset (dev utility — development only) ────────────────────────

@router.post(
    "/{uc_id}/discovery/reset",
    response_model=ResponseEnvelope[dict],
)
async def reset_discovery(
    uc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Reset all Discovery data for a use case — clusters, JTDs, phases, messages.

    Preserves the engagement and use case shell. Developer utility for rapid iteration.
    Only available when APP_ENV=development.
    """
    from app.core.config import settings

    if settings.app_env != "development":
        raise HTTPException(status_code=403, detail="Discovery reset is only available in development")

    counts = await service.reset_discovery_data(db, uc_id)
    await db.commit()
    return ResponseEnvelope(data=counts)


# ─── Conversation Messages — persist client-side system messages ──────────────

@router.post(
    "/{uc_id}/messages",
    response_model=ResponseEnvelope[dict],
    status_code=status.HTTP_201_CREATED,
)
async def create_message(
    uc_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """Persist a client-side system message so it survives navigation."""
    role_str = body.get("role", "system")
    text = body.get("text", "")
    if role_str != "system" or not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only system messages with text are accepted",
        )
    msg = await service.save_message(
        db, uc_id, MessageRole.system,
        [{"type": "text", "text": text}]
    )
    await db.commit()
    return ResponseEnvelope(data={"id": str(msg.id), "role": "system", "text": text})


# ─── WebSocket ────────────────────────────────────────────────────────────────

# Per-use-case lock — prevents concurrent agent requests across WS connections
# for the same use case from corrupting conversation history.
_uc_locks: dict[uuid.UUID, asyncio.Lock] = {}


def _get_uc_lock(uc_id: uuid.UUID) -> asyncio.Lock:
    if uc_id not in _uc_locks:
        _uc_locks[uc_id] = asyncio.Lock()
    return _uc_locks[uc_id]


@router.websocket("/{uc_id}/ws")
async def discovery_websocket(
    uc_id: uuid.UUID,
    websocket: WebSocket,
):
    """
    WebSocket endpoint for the Discovery Agent conversation.

    Client → Server messages:
      {"type": "user_message", "content": "..."}
      {"type": "file_processed", "raw_input_id": "..."}

    Server → Client events:
      {"type": "text_delta", "delta": "..."}
      {"type": "lived_jtds_proposed", "jtds": [...]}
      {"type": "cognitive_jtds_proposed", "jtds": [...]}
      {"type": "process_phases_proposed", "phases": [...]}
      {"type": "cluster_proposed", "cluster": {...}}
      {"type": "message_complete", "message_id": "..."}
      {"type": "error", "message": "..."}
    """
    await websocket.accept()

    # Open a fresh DB session for the lifetime of this WS connection
    async with AsyncSessionLocal() as db:
        try:
            await _handle_ws_session(websocket, db, uc_id)
        except WebSocketDisconnect:
            pass
        except Exception as e:
            try:
                await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
            except Exception:
                pass


async def _process_agent_stream(
    websocket: WebSocket,
    db: AsyncSession,
    uc_id: uuid.UUID,
    history: list[dict],
    user_content: list,
    pending_tool_results: list[dict],
    confirmed_lived: int,
    confirmed_cognitive: int,
    total_lived: int = 0,
    total_cognitive: int = 0,
    rejected_lived: int = 0,
    rejected_cognitive: int = 0,
    process_step_names: list[str] | None = None,
    active_clusters: list[dict[str, str]] | None = None,
) -> None:
    """Shared stream processor for user_message and file_processed flows.

    Handles provenance tracking (two-phase: collect JTD IDs mid-stream, backfill
    source_message_id after message_complete) and cluster superseding (mark
    existing clusters as 'replaced' before first new cluster in a stream).

    Also handles phase auto-linking: when the agent includes phase_name on a JTD
    extraction, the handler looks up the matching process step and creates a
    ProcessStepJTDLink record automatically.
    """
    created_lived_ids: list[uuid.UUID] = []
    created_cognitive_ids: list[uuid.UUID] = []
    clusters_replaced = False
    clusters_proposed_count = 0

    # Phase name → step ID lookup for auto-linking.
    # Seeded from existing steps; updated if new phases arrive mid-stream.
    process_flow = await service.get_process_flow(db, uc_id)
    phase_name_to_id: dict[str, uuid.UUID] = {
        s.name.lower(): uuid.UUID(str(s.id)) for s in process_flow.steps
    }

    def _resolve_phase_id(phase_name: str | None) -> uuid.UUID | None:
        """Look up the process step ID for a given phase name."""
        if not phase_name:
            return None
        return phase_name_to_id.get(phase_name.lower())

    async for event in run_discovery_stream(
        uc_id, history, user_content,
        pending_tool_results, confirmed_lived, confirmed_cognitive,
        total_lived, total_cognitive,
        rejected_lived, rejected_cognitive,
        process_step_names, active_clusters,
    ):
        event_type = event["type"]

        if event_type == "tool_call_started":
            await websocket.send_text(json.dumps(event))

        elif event_type == "text_delta":
            await websocket.send_text(json.dumps(event))

        elif event_type == "lived_jtds_proposed":
            saved_jtds = []
            for jtd_data in event["jtds"]:
                phase_id = _resolve_phase_id(jtd_data.get("phase_name"))
                saved = await service.create_lived_jtd(
                    db,
                    use_case_id=uc_id,
                    description=jtd_data["description"],
                    system_context=jtd_data.get("system_context"),
                    process_phase_id=phase_id,
                )
                created_lived_ids.append(saved.id)
                saved_jtds.append(saved.model_dump(mode="json"))
            await db.commit()
            await websocket.send_text(json.dumps({"type": "lived_jtds_proposed", "jtds": saved_jtds}))
            await websocket.send_text(json.dumps({
                "type": "tool_call_completed",
                "tool_name": "propose_lived_jtds",
                "summary": f"{len(saved_jtds)} JTD{'s' if len(saved_jtds) != 1 else ''} added to cognitive map",
            }))

        elif event_type == "cognitive_jtds_proposed":
            saved_jtds = []
            for jtd_data in event["jtds"]:
                phase_id = _resolve_phase_id(jtd_data.get("phase_name"))
                saved = await service.create_cognitive_jtd(
                    db,
                    use_case_id=uc_id,
                    description=jtd_data["description"],
                    cognitive_zone=jtd_data.get("cognitive_zone"),
                    load_intensity=jtd_data.get("load_intensity"),
                    process_phase_id=phase_id,
                )
                created_cognitive_ids.append(saved.id)
                saved_jtds.append(saved.model_dump(mode="json"))
            await db.commit()
            await websocket.send_text(json.dumps({"type": "cognitive_jtds_proposed", "jtds": saved_jtds}))
            await websocket.send_text(json.dumps({
                "type": "tool_call_completed",
                "tool_name": "propose_cognitive_jtds",
                "summary": f"{len(saved_jtds)} cognitive load item{'s' if len(saved_jtds) != 1 else ''} added",
            }))

        elif event_type == "process_phases_proposed":
            saved_phases = []
            for phase_data in event["phases"]:
                payload = ProcessStepCreate(
                    name=phase_data["name"],
                    description=phase_data.get("description"),
                    sequence_order=phase_data["sequence_order"],
                )
                saved = await service.create_process_step(db, uc_id, payload)
                saved_phases.append(saved.model_dump(mode="json"))
                # Update lookup so JTDs proposed later in this stream can link
                phase_name_to_id[phase_data["name"].lower()] = saved.id
            await db.commit()
            await websocket.send_text(
                json.dumps({"type": "process_phases_proposed", "phases": saved_phases})
            )
            await websocket.send_text(json.dumps({
                "type": "tool_call_completed",
                "tool_name": "propose_process_phases",
                "summary": f"{len(saved_phases)} phase{'s' if len(saved_phases) != 1 else ''} established",
            }))

        elif event_type == "cluster_proposed":
            # Mark existing clusters as replaced before creating the first new one
            if not clusters_replaced:
                replaced_count = await service.mark_clusters_replaced(db, uc_id)
                await db.commit()
                if replaced_count > 0:
                    await websocket.send_text(json.dumps({
                        "type": "clusters_replaced",
                        "count": replaced_count,
                    }))
                clusters_replaced = True

            cluster_data = event["cluster"]
            saved_cluster = await service.create_delegation_cluster(
                db,
                use_case_id=uc_id,
                name=cluster_data["name"],
                purpose=cluster_data.get("purpose"),
                cognitive_jtd_refs=cluster_data.get("cognitive_jtd_refs", []),
                lived_jtd_refs=cluster_data.get("lived_jtd_refs"),
            )
            await db.commit()
            clusters_proposed_count += 1
            await websocket.send_text(
                json.dumps({"type": "cluster_proposed", "cluster": saved_cluster.model_dump(mode="json")})
            )
            await websocket.send_text(json.dumps({
                "type": "tool_call_completed",
                "tool_name": "propose_delegation_cluster",
                "summary": f"Cluster \"{saved_cluster.name}\" proposed",
            }))

        elif event_type == "message_complete":
            full_assistant_content = event["full_content"]
            # Strip tool_use blocks before saving — only persist text for
            # conversation display.  Tool outputs (JTDs, phases, clusters)
            # are already saved to their own domain tables.  Keeping
            # tool_use blocks in the DB creates a fragile tool_use /
            # tool_result pairing requirement that causes Anthropic API 400
            # errors on history reconstruction.
            text_only_content = [
                b for b in full_assistant_content
                if not (isinstance(b, dict) and b.get("type") == "tool_use")
            ]
            saved_msg = await service.save_message(
                db, uc_id, MessageRole.assistant, text_only_content
            )
            # Backfill provenance on all JTDs created during this stream
            if created_lived_ids or created_cognitive_ids:
                await service.backfill_jtd_source_message(
                    db, created_lived_ids, created_cognitive_ids, saved_msg.id
                )

            await db.commit()
            await websocket.send_text(
                json.dumps({"type": "message_complete", "message_id": str(saved_msg.id)})
            )
            # Send system notification if clusters were proposed
            if clusters_proposed_count > 0:
                notification_text = f"{clusters_proposed_count} cluster{'s' if clusters_proposed_count != 1 else ''} proposed"
                await websocket.send_text(json.dumps({
                    "type": "system_notification",
                    "text": notification_text,
                    "highlight": "clusters",
                }))
                # Persist system notification so it survives navigation
                await service.save_message(
                    db, uc_id, MessageRole.system,
                    [{"type": "text", "text": notification_text}]
                )
                await db.commit()

        elif event_type == "error":
            await websocket.send_text(json.dumps(event))


async def _handle_ws_session(
    websocket: WebSocket,
    db: AsyncSession,
    uc_id: uuid.UUID,
) -> None:
    """Inner WS session handler — loads history and processes messages.

    Uses a per-use-case lock to prevent concurrent agent requests (across
    WS connections for the same use case) from corrupting conversation history.
    If a request is already in flight, subsequent requests are rejected with an
    error event so the client can retry after the first completes.
    """
    lock = _get_uc_lock(uc_id)

    while True:
        try:
            raw = await websocket.receive_text()
        except WebSocketDisconnect:
            return

        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            await websocket.send_text(json.dumps({"type": "error", "message": "Invalid JSON"}))
            continue

        msg_type = msg.get("type")

        # Gate: reject if another request is already in flight for this use case
        if msg_type in ("user_message", "file_processed") and lock.locked():
            user_text = msg.get("content", "") if msg_type == "user_message" else ""
            if isinstance(user_text, str) and "propose delegation clusters" in user_text.lower():
                error_msg = "Cluster generation already in progress."
            else:
                error_msg = "A request is already in progress. Please wait."
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": error_msg,
            }))
            continue

        if msg_type == "user_message":
            user_text = msg.get("content", "").strip()
            if not user_text:
                continue

            async with lock:
                history_msgs = await service.list_conversation_messages(db, uc_id)
                history, pending_tool_results = _build_anthropic_history(history_msgs)

                user_content = [{"type": "text", "text": user_text}]
                await service.save_message(db, uc_id, MessageRole.user, user_content)
                await db.commit()

                all_lived = await service.list_lived_jtds(db, uc_id)
                all_cognitive = await service.list_cognitive_jtds(db, uc_id)
                confirmed_lived = sum(1 for j in all_lived if j.status == "confirmed")
                confirmed_cognitive = sum(1 for j in all_cognitive if j.status == "confirmed")

                total_lived = len(all_lived)
                total_cognitive = len(all_cognitive)
                rejected_lived = sum(1 for j in all_lived if j.status == "rejected")
                rejected_cognitive = sum(1 for j in all_cognitive if j.status == "rejected")

                process_flow = await service.get_process_flow(db, uc_id)
                process_step_names = [s.name for s in process_flow.steps]

                all_clusters = await service.list_delegation_clusters(db, uc_id)
                active_clusters = [
                    {"name": c.name, "status": c.status}
                    for c in all_clusters
                    if c.status in ("proposed", "confirmed")
                ]

                await _process_agent_stream(
                    websocket, db, uc_id, history, user_content,
                    pending_tool_results, confirmed_lived, confirmed_cognitive,
                    total_lived, total_cognitive,
                    rejected_lived, rejected_cognitive,
                    process_step_names, active_clusters,
                )

        elif msg_type == "file_processed":
            raw_input_id_str = msg.get("raw_input_id", "")
            if not raw_input_id_str:
                continue

            try:
                raw_input_id = uuid.UUID(raw_input_id_str)
            except ValueError:
                await websocket.send_text(
                    json.dumps({"type": "error", "message": "Invalid raw_input_id"})
                )
                continue

            raw_input = await service.get_raw_input(db, raw_input_id)
            if raw_input is None:
                await websocket.send_text(
                    json.dumps({"type": "error", "message": "Raw input not found"})
                )
                continue

            async with lock:
                user_content: list = []
                if is_image_mime(raw_input.mime_type or ""):
                    b64 = await read_as_base64(raw_input.file_path or "")
                    user_content = [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": raw_input.mime_type,
                                "data": b64,
                            },
                        },
                        {
                            "type": "text",
                            "text": (
                                f"I've uploaded an image file: {raw_input.file_name}. "
                                "Please analyse it and extract relevant process information, tasks, and cognitive activities."
                            ),
                        },
                    ]
                else:
                    extracted_text = await extract_text(
                        raw_input.file_path or "", raw_input.mime_type or "text/plain"
                    )
                    await service.mark_raw_input_processed(db, raw_input_id, extracted_text)
                    await db.commit()
                    user_content = [
                        {
                            "type": "text",
                            "text": (
                                f"I've uploaded a document: {raw_input.file_name}\n\n"
                                f"--- BEGIN DOCUMENT ---\n{extracted_text}\n--- END DOCUMENT ---\n\n"
                                "Please analyse this document and extract relevant process information, "
                                "tasks, cognitive activities, and any notable patterns or gaps."
                            ),
                        }
                    ]

                history_msgs = await service.list_conversation_messages(db, uc_id)
                history, pending_tool_results = _build_anthropic_history(history_msgs)

                await service.save_message(db, uc_id, MessageRole.user, user_content)
                await db.commit()

                all_lived = await service.list_lived_jtds(db, uc_id)
                all_cognitive = await service.list_cognitive_jtds(db, uc_id)
                confirmed_lived = sum(1 for j in all_lived if j.status == "confirmed")
                confirmed_cognitive = sum(1 for j in all_cognitive if j.status == "confirmed")

                total_lived = len(all_lived)
                total_cognitive = len(all_cognitive)
                rejected_lived = sum(1 for j in all_lived if j.status == "rejected")
                rejected_cognitive = sum(1 for j in all_cognitive if j.status == "rejected")

                process_flow = await service.get_process_flow(db, uc_id)
                process_step_names = [s.name for s in process_flow.steps]

                all_clusters = await service.list_delegation_clusters(db, uc_id)
                active_clusters = [
                    {"name": c.name, "status": c.status}
                    for c in all_clusters
                    if c.status in ("proposed", "confirmed")
                ]

                await _process_agent_stream(
                    websocket, db, uc_id, history, user_content,
                    pending_tool_results, confirmed_lived, confirmed_cognitive,
                    total_lived, total_cognitive,
                    rejected_lived, rejected_cognitive,
                    process_step_names, active_clusters,
                )

        else:
            await websocket.send_text(
                json.dumps({"type": "error", "message": f"Unknown message type: {msg_type}"})
            )


_log = logging.getLogger(__name__)


def _sanitize_history(messages: list[dict]) -> list[dict]:
    """Hard validation pass — runs before every API call.

    Guarantees the Anthropic API will not reject the history by enforcing:
    1. Consecutive same-role messages are merged.
    2. Every tool_use block in an assistant message has a matching tool_result
       in the immediately following user message — injects synthetic ones if
       missing (preserves context better than stripping).
    3. Every tool_result references a valid tool_use — strips orphaned ones.
    4. Strict user/assistant alternation — injects synthetic turns if needed.
    5. Conversation starts with a user message.
    6. No message has empty content.

    Logs all repairs for debugging.
    """
    if not messages:
        return []

    repairs = 0

    # Deep copy so we never mutate the caller's data.
    sanitized: list[dict] = [
        {"role": m["role"], "content": list(m["content"])} for m in messages
    ]

    # ── Pass 1: Merge consecutive same-role messages ───────────────────────
    merged: list[dict] = []
    for msg in sanitized:
        if merged and merged[-1]["role"] == msg["role"]:
            merged[-1]["content"] = list(merged[-1]["content"]) + list(msg["content"])
            repairs += 1
        else:
            merged.append(msg)
    sanitized = merged

    # ── Pass 2: Ensure every tool_use has a matching tool_result ───────────
    # Walk forward.  For each assistant message with tool_use blocks, check
    # the immediately following message.  If it is a user message, inject any
    # missing tool_result blocks.  If it is another assistant message (should
    # not happen after merging, but be safe), inject a synthetic user message
    # with tool_results between them.
    # Skip the very last assistant message — its tool_use blocks are pending
    # and will be answered by the new user message the caller appends.
    i = 0
    while i < len(sanitized):
        msg = sanitized[i]
        if msg["role"] == "assistant":
            tool_use_ids = [
                b["id"]
                for b in msg["content"]
                if isinstance(b, dict) and b.get("type") == "tool_use"
            ]
            if tool_use_ids and i + 1 < len(sanitized):
                next_msg = sanitized[i + 1]
                if next_msg["role"] == "user":
                    answered = {
                        b["tool_use_id"]
                        for b in next_msg["content"]
                        if isinstance(b, dict) and b.get("type") == "tool_result"
                    }
                    missing = [tid for tid in tool_use_ids if tid not in answered]
                    if missing:
                        synthetic = [
                            {"type": "tool_result", "tool_use_id": tid, "content": "Saved."}
                            for tid in missing
                        ]
                        next_msg["content"] = synthetic + list(next_msg["content"])
                        repairs += len(missing)
                elif next_msg["role"] == "assistant":
                    # No user turn between assistants — inject one.
                    synthetic_user = {
                        "role": "user",
                        "content": [
                            {"type": "tool_result", "tool_use_id": tid, "content": "Saved."}
                            for tid in tool_use_ids
                        ],
                    }
                    sanitized.insert(i + 1, synthetic_user)
                    repairs += len(tool_use_ids)
        i += 1

    # ── Pass 3: Strip orphaned tool_result blocks ─────────────────────────
    for i, msg in enumerate(sanitized):
        if msg["role"] != "user":
            continue
        result_refs = {
            b.get("tool_use_id")
            for b in msg["content"]
            if isinstance(b, dict) and b.get("type") == "tool_result"
        }
        if not result_refs:
            continue
        prev_tool_ids: set = set()
        if i > 0 and sanitized[i - 1]["role"] == "assistant":
            prev_tool_ids = {
                b["id"]
                for b in sanitized[i - 1]["content"]
                if isinstance(b, dict) and b.get("type") == "tool_use"
            }
        orphaned = result_refs - prev_tool_ids
        if orphaned:
            msg["content"] = [
                b for b in msg["content"]
                if not (
                    isinstance(b, dict)
                    and b.get("type") == "tool_result"
                    and b.get("tool_use_id") in orphaned
                )
            ]
            repairs += len(orphaned)

    # ── Pass 4: Final alternation enforcement + empty removal ─────────────
    final: list[dict] = []
    for msg in sanitized:
        if not msg["content"]:
            repairs += 1
            continue
        if final and final[-1]["role"] == msg["role"]:
            if msg["role"] == "user":
                final[-1]["content"] = list(final[-1]["content"]) + list(msg["content"])
            else:
                final.append({
                    "role": "user",
                    "content": [{"type": "text", "text": "Continue."}],
                })
                final.append(msg)
            repairs += 1
        else:
            final.append(msg)

    # Ensure conversation starts with user.
    if final and final[0]["role"] != "user":
        final.insert(0, {"role": "user", "content": [{"type": "text", "text": "Begin."}]})
        repairs += 1

    if repairs > 0:
        _log.warning(
            "History sanitisation: %d repair(s) applied (%d msgs → %d msgs)",
            repairs, len(messages), len(final),
        )

    return final


def _build_anthropic_history(
    messages: list,
) -> tuple[list[dict], list[dict]]:
    """Convert ConversationMessageRead list to Anthropic messages format.

    All tool_use and tool_result blocks are stripped during reconstruction.
    Tool outputs (JTDs, phases, clusters) are persisted in their own domain
    tables — keeping tool artifacts in the conversation history creates a
    fragile pairing requirement that causes Anthropic API 400 errors.

    New assistant messages are saved text-only (tool_use stripped at write
    time in _process_agent_stream).  This function also handles legacy data
    that may still contain tool_use / tool_result blocks.

    Returns:
        (history, pending_tool_results)
        - history: fully validated message list ready to send to the API
        - pending_tool_results: always empty — no tool artifacts remain
    """
    result: list[dict] = []

    for msg in messages:
        content = msg.content
        if isinstance(content, str):
            content = [{"type": "text", "text": content}]

        role = msg.role.value if hasattr(msg.role, "value") else msg.role

        # Strip all tool_use and tool_result blocks — they served their
        # purpose during the original stream and are not needed in history.
        content = [
            b for b in content
            if not (
                isinstance(b, dict)
                and b.get("type") in ("tool_use", "tool_result")
            )
        ]

        # Skip messages that are now empty (e.g. tool_result-only user msgs)
        if not content:
            continue

        # Merge consecutive same-role messages
        if result and result[-1]["role"] == role:
            result[-1]["content"] = list(result[-1]["content"]) + list(content)
        else:
            result.append({"role": role, "content": content})

    # Hard validation pass — enforces alternation, strips empties
    result = _sanitize_history(result)

    return result, []
