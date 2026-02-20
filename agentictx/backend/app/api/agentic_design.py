"""Agentic Design API — REST routes + WebSocket handler.

All REST routes return ResponseEnvelope[T] except 204 DELETE endpoints.
WebSocket at WS /api/v1/use-cases/{uc_id}/agentic-design/ws
"""
import json
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.agentic_design_agent import run_agentic_design_stream
from app.core.database import AsyncSessionLocal, get_db
from app.models.agentic_design import DesignMessageRole
from app.models.engagement import UseCase
from app.modules.agentic_design import service
from app.modules.discovery import service as discovery_service
from app.schemas.agentic_design import (
    AgenticDesignMap,
    AgentSpecificationRead,
    AgentSpecificationUpdate,
)
from app.schemas.common import ResponseEnvelope

router = APIRouter(prefix="/use-cases", tags=["agentic-design"])


# ─── Full Map GET ──────────────────────────────────────────────────────────────

@router.get(
    "/{uc_id}/agentic-design",
    response_model=ResponseEnvelope[AgenticDesignMap],
)
async def get_agentic_design(uc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Return all agent specs, design conversation, and cross-agent opportunities."""
    design_map = await service.get_agentic_design_map(db, uc_id)
    return ResponseEnvelope(data=design_map)


# ─── ARD Document — must come before /{spec_id} routes ───────────────────────

@router.get("/{uc_id}/agentic-design/document/ard")
async def generate_ard(
    uc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Generate and download the Agent Requirements Document as Markdown."""
    specs = await service.list_agent_specs(db, uc_id)
    approved = [s for s in specs if s.status == "approved"]
    if not approved:
        approved = specs  # preview with drafts if none approved yet

    uc_name = await _get_use_case_name(db, uc_id) or str(uc_id)
    markdown = service.generate_ard_markdown(approved, uc_name)
    filename = f"ARD_{uc_name.replace(' ', '_')}.md"
    return Response(
        content=markdown,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ─── Agent Specification CRUD ─────────────────────────────────────────────────

@router.get(
    "/{uc_id}/agentic-design/{spec_id}",
    response_model=ResponseEnvelope[AgentSpecificationRead],
)
async def get_agent_spec(
    uc_id: uuid.UUID,
    spec_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    spec = await service.get_agent_spec(db, uc_id, spec_id)
    if spec is None:
        raise HTTPException(status_code=404, detail="Agent specification not found")
    return ResponseEnvelope(data=spec)


@router.patch(
    "/{uc_id}/agentic-design/{spec_id}",
    response_model=ResponseEnvelope[AgentSpecificationRead],
)
async def update_agent_spec(
    uc_id: uuid.UUID,
    spec_id: uuid.UUID,
    payload: AgentSpecificationUpdate,
    db: AsyncSession = Depends(get_db),
):
    spec = await service.update_agent_spec(db, uc_id, spec_id, payload)
    if spec is None:
        raise HTTPException(status_code=404, detail="Agent specification not found")
    return ResponseEnvelope(data=spec)


@router.delete(
    "/{uc_id}/agentic-design/{spec_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_agent_spec(
    uc_id: uuid.UUID,
    spec_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    deleted = await service.delete_agent_spec(db, uc_id, spec_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Agent specification not found")


@router.post(
    "/{uc_id}/agentic-design/{spec_id}/approve",
    response_model=ResponseEnvelope[AgentSpecificationRead],
)
async def approve_agent_spec(
    uc_id: uuid.UUID,
    spec_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Lock an agent specification (status → approved)."""
    spec = await service.approve_agent_spec(db, uc_id, spec_id)
    if spec is None:
        raise HTTPException(status_code=404, detail="Agent specification not found")
    return ResponseEnvelope(data=spec)


# ─── WebSocket ────────────────────────────────────────────────────────────────

@router.websocket("/{uc_id}/agentic-design/ws")
async def agentic_design_websocket(
    uc_id: uuid.UUID,
    websocket: WebSocket,
):
    """
    WebSocket endpoint for the Agentic Design Agent conversation.

    Client → Server messages:
      {"type": "user_message", "content": "..."}

    Server → Client events:
      {"type": "text_delta", "delta": "..."}
      {"type": "agent_spec_proposed", "spec": {...}}
      {"type": "cross_agent_opportunity", "opportunity": {...}}
      {"type": "message_complete", "message_id": "..."}
      {"type": "error", "message": "..."}
    """
    await websocket.accept()

    async with AsyncSessionLocal() as db:
        try:
            await _handle_design_ws_session(websocket, db, uc_id)
        except WebSocketDisconnect:
            pass
        except Exception as e:
            try:
                await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
            except Exception:
                pass


async def _handle_design_ws_session(
    websocket: WebSocket,
    db: AsyncSession,
    uc_id: uuid.UUID,
) -> None:
    """Inner WS session handler for agentic design conversations."""
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

            history_msgs = await service.list_design_messages(db, uc_id)
            history, pending_tool_results = _build_anthropic_history(history_msgs)

            user_content = [{"type": "text", "text": user_text}]
            await service.save_design_message(db, uc_id, DesignMessageRole.user, user_content)
            await db.commit()

            clusters_context = await _build_cluster_context(db, uc_id)
            existing_specs = await service.list_agent_specs(db, uc_id)
            specs_context = [
                {"name": s.name, "purpose": s.purpose, "autonomy_level": s.autonomy_level}
                for s in existing_specs
            ]

            async for event in run_agentic_design_stream(
                uc_id, history, user_content,
                pending_tool_results,
                clusters=clusters_context,
                existing_specs=specs_context,
            ):
                event_type = event["type"]

                if event_type == "text_delta":
                    await websocket.send_text(json.dumps(event))

                elif event_type == "agent_spec_proposed":
                    spec_data = event["spec"]
                    saved_spec = await service.create_agent_spec(
                        db,
                        use_case_id=uc_id,
                        name=spec_data.get("name", "Unnamed Agent"),
                        purpose=spec_data.get("purpose"),
                        autonomy_level=spec_data.get("autonomy_level"),
                        activities=spec_data.get("activities", []),
                        supervised_activities=spec_data.get("supervised_activities", []),
                        out_of_scope=spec_data.get("out_of_scope", []),
                        data_sources=spec_data.get("data_sources", []),
                        mcp_servers=spec_data.get("mcp_servers", []),
                        tools_apis=spec_data.get("tools_apis", []),
                        input_definition=spec_data.get("input_definition", {}),
                        output_definition=spec_data.get("output_definition", {}),
                        hitl_design=spec_data.get("hitl_design", {}),
                        compliance=spec_data.get("compliance", {}),
                        open_questions=spec_data.get("open_questions", []),
                    )
                    await db.commit()
                    await websocket.send_text(
                        json.dumps({
                            "type": "agent_spec_proposed",
                            "spec": saved_spec.model_dump(mode="json"),
                        })
                    )

                elif event_type == "cross_agent_opportunity":
                    await websocket.send_text(json.dumps(event))

                elif event_type == "message_complete":
                    full_assistant_content = event["full_content"]
                    saved_msg = await service.save_design_message(
                        db, uc_id, DesignMessageRole.assistant, full_assistant_content
                    )
                    await db.commit()
                    await websocket.send_text(
                        json.dumps({"type": "message_complete", "message_id": str(saved_msg.id)})
                    )

                elif event_type == "error":
                    await websocket.send_text(json.dumps(event))

        else:
            await websocket.send_text(
                json.dumps({"type": "error", "message": f"Unknown message type: {msg_type}"})
            )


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _get_use_case_name(db: AsyncSession, uc_id: uuid.UUID) -> str | None:
    result = await db.execute(select(UseCase).where(UseCase.id == uc_id))
    uc = result.scalar_one_or_none()
    return uc.name if uc else None


async def _build_cluster_context(db: AsyncSession, uc_id: uuid.UUID) -> list[dict[str, Any]]:
    """Load delegation clusters enriched with their JTD descriptions."""
    clusters = await discovery_service.list_delegation_clusters(db, uc_id)
    lived_jtds = await discovery_service.list_lived_jtds(db, uc_id)
    cognitive_jtds = await discovery_service.list_cognitive_jtds(db, uc_id)

    lived_by_desc = {j.description: j for j in lived_jtds}
    cognitive_by_desc = {j.description: j for j in cognitive_jtds}

    result: list[dict[str, Any]] = []
    for cluster in clusters:
        cognitive_context: list[dict[str, Any]] = []
        for ref in (cluster.cognitive_jtd_ids or []):
            jtd = cognitive_by_desc.get(ref)
            if jtd:
                cognitive_context.append({
                    "description": jtd.description,
                    "cognitive_zone": jtd.cognitive_zone,
                    "load_intensity": jtd.load_intensity,
                })
            else:
                cognitive_context.append({"description": ref})

        lived_context: list[dict[str, Any]] = []
        for ref in (cluster.lived_jtd_ids or []):
            jtd = lived_by_desc.get(ref)
            if jtd:
                lived_context.append({
                    "description": jtd.description,
                    "system_context": jtd.system_context,
                })
            else:
                lived_context.append({"description": ref})

        result.append({
            "name": cluster.name,
            "purpose": cluster.purpose,
            "cognitive_jtds": cognitive_context,
            "lived_jtds": lived_context,
            "suitability_scores": cluster.suitability_scores,
        })

    return result


def _build_anthropic_history(
    messages: list,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Convert AgenticDesignMessageRead list to Anthropic messages format.

    Mirrors the exact same logic as discovery.py — synthesises tool_result
    blocks for any tool_use blocks in the last assistant turn.
    """
    result: list[dict[str, Any]] = []
    pending_tool_results: list[dict[str, Any]] = []

    for msg in messages:
        content = msg.content
        if isinstance(content, str):
            content = [{"type": "text", "text": content}]

        role = msg.role.value if hasattr(msg.role, "value") else msg.role

        if role == "user" and pending_tool_results:
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
