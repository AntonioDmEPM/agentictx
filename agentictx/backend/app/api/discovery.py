"""Discovery API — REST routes for file upload + JTD/cluster CRUD, and WebSocket handler.

All REST routes return ResponseEnvelope[T] except 204 DELETE endpoints.
WebSocket at WS /api/v1/use-cases/{uc_id}/ws
"""
import json
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
    CognitiveJTDRead,
    CognitiveJTDUpdate,
    CognitiveMapRead,
    DelegationClusterRead,
    DelegationClusterUpdate,
    LivedJTDRead,
    LivedJTDUpdate,
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


# ─── WebSocket ────────────────────────────────────────────────────────────────

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


async def _handle_ws_session(
    websocket: WebSocket,
    db: AsyncSession,
    uc_id: uuid.UUID,
) -> None:
    """Inner WS session handler — loads history and processes messages."""
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

        if msg_type == "user_message":
            user_text = msg.get("content", "").strip()
            if not user_text:
                continue

            # Load full conversation history
            history_msgs = await service.list_conversation_messages(db, uc_id)
            history, pending_tool_results = _build_anthropic_history(history_msgs)

            # Build user content block
            user_content = [{"type": "text", "text": user_text}]

            # Save user message to DB
            await service.save_message(db, uc_id, MessageRole.user, user_content)
            await db.commit()

            # Query confirmed JTD counts so the agent can evaluate the cluster gate.
            all_lived = await service.list_lived_jtds(db, uc_id)
            all_cognitive = await service.list_cognitive_jtds(db, uc_id)
            confirmed_lived = sum(1 for j in all_lived if j.status == "confirmed")
            confirmed_cognitive = sum(1 for j in all_cognitive if j.status == "confirmed")

            # Stream the agent response
            full_assistant_content: list = []
            message_id: str | None = None

            async for event in run_discovery_stream(
                uc_id, history, user_content,
                pending_tool_results, confirmed_lived, confirmed_cognitive,
            ):
                event_type = event["type"]

                if event_type == "text_delta":
                    await websocket.send_text(json.dumps(event))

                elif event_type == "lived_jtds_proposed":
                    # Persist each proposed JTD to DB
                    saved_jtds = []
                    for jtd_data in event["jtds"]:
                        saved = await service.create_lived_jtd(
                            db,
                            use_case_id=uc_id,
                            description=jtd_data["description"],
                            system_context=jtd_data.get("system_context"),
                            cognitive_load_score=jtd_data.get("cognitive_load_score"),
                        )
                        saved_jtds.append(saved.model_dump(mode="json"))
                    await db.commit()
                    await websocket.send_text(
                        json.dumps({"type": "lived_jtds_proposed", "jtds": saved_jtds})
                    )

                elif event_type == "cognitive_jtds_proposed":
                    saved_jtds = []
                    for jtd_data in event["jtds"]:
                        saved = await service.create_cognitive_jtd(
                            db,
                            use_case_id=uc_id,
                            description=jtd_data["description"],
                            cognitive_zone=jtd_data.get("cognitive_zone"),
                            load_intensity=jtd_data.get("load_intensity"),
                        )
                        saved_jtds.append(saved.model_dump(mode="json"))
                    await db.commit()
                    await websocket.send_text(
                        json.dumps({"type": "cognitive_jtds_proposed", "jtds": saved_jtds})
                    )

                elif event_type == "cluster_proposed":
                    cluster_data = event["cluster"]
                    saved_cluster = await service.create_delegation_cluster(
                        db,
                        use_case_id=uc_id,
                        name=cluster_data["name"],
                        purpose=cluster_data.get("purpose"),
                        cognitive_jtd_ids=cluster_data.get("cognitive_jtd_refs", []),
                        lived_jtd_ids=cluster_data.get("lived_jtd_refs"),
                    )
                    await db.commit()
                    await websocket.send_text(
                        json.dumps({"type": "cluster_proposed", "cluster": saved_cluster.model_dump(mode="json")})
                    )

                elif event_type == "message_complete":
                    full_assistant_content = event["full_content"]
                    # Save assistant message to DB
                    saved_msg = await service.save_message(
                        db, uc_id, MessageRole.assistant, full_assistant_content
                    )
                    await db.commit()
                    message_id = str(saved_msg.id)
                    await websocket.send_text(
                        json.dumps({"type": "message_complete", "message_id": message_id})
                    )

                elif event_type == "error":
                    await websocket.send_text(json.dumps(event))

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

            # Extract content from file and inject into conversation
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

            async for event in run_discovery_stream(
                uc_id, history, user_content,
                pending_tool_results, confirmed_lived, confirmed_cognitive,
            ):
                event_type = event["type"]
                if event_type in ("text_delta", "error"):
                    await websocket.send_text(json.dumps(event))
                elif event_type == "lived_jtds_proposed":
                    saved_jtds = []
                    for jtd_data in event["jtds"]:
                        saved = await service.create_lived_jtd(
                            db,
                            use_case_id=uc_id,
                            description=jtd_data["description"],
                            system_context=jtd_data.get("system_context"),
                            cognitive_load_score=jtd_data.get("cognitive_load_score"),
                        )
                        saved_jtds.append(saved.model_dump(mode="json"))
                    await db.commit()
                    await websocket.send_text(
                        json.dumps({"type": "lived_jtds_proposed", "jtds": saved_jtds})
                    )
                elif event_type == "cognitive_jtds_proposed":
                    saved_jtds = []
                    for jtd_data in event["jtds"]:
                        saved = await service.create_cognitive_jtd(
                            db,
                            use_case_id=uc_id,
                            description=jtd_data["description"],
                            cognitive_zone=jtd_data.get("cognitive_zone"),
                            load_intensity=jtd_data.get("load_intensity"),
                        )
                        saved_jtds.append(saved.model_dump(mode="json"))
                    await db.commit()
                    await websocket.send_text(
                        json.dumps({"type": "cognitive_jtds_proposed", "jtds": saved_jtds})
                    )
                elif event_type == "cluster_proposed":
                    cluster_data = event["cluster"]
                    saved_cluster = await service.create_delegation_cluster(
                        db,
                        use_case_id=uc_id,
                        name=cluster_data["name"],
                        purpose=cluster_data.get("purpose"),
                        cognitive_jtd_ids=cluster_data.get("cognitive_jtd_refs", []),
                        lived_jtd_ids=cluster_data.get("lived_jtd_refs"),
                    )
                    await db.commit()
                    await websocket.send_text(
                        json.dumps({"type": "cluster_proposed", "cluster": saved_cluster.model_dump(mode="json")})
                    )
                elif event_type == "message_complete":
                    full_assistant_content = event["full_content"]
                    saved_msg = await service.save_message(
                        db, uc_id, MessageRole.assistant, full_assistant_content
                    )
                    await db.commit()
                    await websocket.send_text(
                        json.dumps({"type": "message_complete", "message_id": str(saved_msg.id)})
                    )

        else:
            await websocket.send_text(
                json.dumps({"type": "error", "message": f"Unknown message type: {msg_type}"})
            )


def _build_anthropic_history(
    messages: list,
) -> tuple[list[dict], list[dict]]:
    """Convert ConversationMessageRead list to Anthropic messages format.

    The Anthropic API requires that every tool_use block in an assistant message
    is answered by a matching tool_result block in the immediately following user
    message.  Because the workbench uses tool calls purely for structured
    extraction and never feeds results back into the conversation, those
    tool_result blocks are never stored in the DB.  This function repairs the
    gap by merging synthetic tool_result blocks into the next stored user message.

    Returns:
        (history, pending_tool_results)
        - history: well-formed message list ready to send to the API
        - pending_tool_results: tool_result blocks for the *last* assistant turn
          if that turn had tool_use blocks and no subsequent user message exists
          yet.  Callers must prepend these to the new user message before sending.
    """
    result: list[dict] = []
    pending_tool_results: list[dict] = []

    for msg in messages:
        content = msg.content
        if isinstance(content, str):
            content = [{"type": "text", "text": content}]

        role = msg.role.value if hasattr(msg.role, "value") else msg.role

        if role == "user" and pending_tool_results:
            # Merge synthetic tool_results at the front of this user turn so
            # we maintain strict alternation without inserting an extra message.
            content = pending_tool_results + list(content)
            pending_tool_results = []

        result.append({"role": role, "content": content})

        if role == "assistant":
            tool_uses = [b for b in content if isinstance(b, dict) and b.get("type") == "tool_use"]
            if tool_uses:
                pending_tool_results = [
                    {"type": "tool_result", "tool_use_id": b["id"], "content": "Saved."}
                    for b in tool_uses
                ]

    return result, pending_tool_results
