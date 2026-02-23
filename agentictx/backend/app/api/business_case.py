"""Business Case API — REST routes.

All routes return ResponseEnvelope[T] except 204 DELETE and the Excel export.
Base prefix: /api/v1/use-cases/{uc_id}/business-case
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.business_case import service
from app.schemas.business_case import (
    AssumptionsUpdate,
    BusinessCaseRead,
    BusinessCaseScenarioCreate,
    BusinessCaseScenarioRead,
    BusinessCaseScenarioUpdate,
    ModalityUpdate,
)
from app.schemas.common import ResponseEnvelope

router = APIRouter(prefix="/use-cases", tags=["business-case"])


# ── GET /business-case — get or auto-create ───────────────────────────────────

@router.get(
    "/{uc_id}/business-case",
    response_model=ResponseEnvelope[BusinessCaseRead],
)
async def get_business_case(uc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get or auto-create the business case for a use case."""
    bc = await service.get_or_create_business_case(db, uc_id)
    return ResponseEnvelope(data=bc)


# ── PATCH /business-case/assumptions ─────────────────────────────────────────

@router.patch(
    "/{uc_id}/business-case/assumptions",
    response_model=ResponseEnvelope[BusinessCaseRead],
)
async def patch_assumptions(
    uc_id: uuid.UUID,
    payload: AssumptionsUpdate,
    db: AsyncSession = Depends(get_db),
):
    bc = await service.update_assumptions(db, uc_id, payload)
    if bc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business case not found")
    return ResponseEnvelope(data=bc)


# ── PATCH /business-case/modality ─────────────────────────────────────────────

@router.patch(
    "/{uc_id}/business-case/modality",
    response_model=ResponseEnvelope[BusinessCaseRead],
)
async def patch_modality(
    uc_id: uuid.UUID,
    payload: ModalityUpdate,
    db: AsyncSession = Depends(get_db),
):
    bc = await service.update_modality(db, uc_id, payload)
    if bc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business case not found")
    return ResponseEnvelope(data=bc)


# ── POST /business-case/scenarios ─────────────────────────────────────────────

@router.post(
    "/{uc_id}/business-case/scenarios",
    response_model=ResponseEnvelope[BusinessCaseScenarioRead],
    status_code=status.HTTP_201_CREATED,
)
async def create_scenario(
    uc_id: uuid.UUID,
    payload: BusinessCaseScenarioCreate,
    db: AsyncSession = Depends(get_db),
):
    scenario = await service.create_scenario(db, uc_id, payload)
    if scenario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business case not found")
    return ResponseEnvelope(data=scenario)


# ── PATCH /business-case/scenarios/{sid} ──────────────────────────────────────

@router.patch(
    "/{uc_id}/business-case/scenarios/{sid}",
    response_model=ResponseEnvelope[BusinessCaseScenarioRead],
)
async def patch_scenario(
    uc_id: uuid.UUID,
    sid: uuid.UUID,
    payload: BusinessCaseScenarioUpdate,
    db: AsyncSession = Depends(get_db),
):
    scenario = await service.update_scenario(db, uc_id, sid, payload)
    if scenario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    return ResponseEnvelope(data=scenario)


# ── DELETE /business-case/scenarios/{sid} ─────────────────────────────────────

@router.delete(
    "/{uc_id}/business-case/scenarios/{sid}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_scenario(
    uc_id: uuid.UUID,
    sid: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    deleted = await service.delete_scenario(db, uc_id, sid)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── POST /business-case/calculate ─────────────────────────────────────────────

@router.post(
    "/{uc_id}/business-case/calculate",
    response_model=ResponseEnvelope[BusinessCaseRead],
)
async def calculate(uc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Run 48-month financial model for all scenarios and persist results."""
    bc = await service.calculate_business_case(db, uc_id)
    if bc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business case not found")
    return ResponseEnvelope(data=bc)


# ── GET /business-case/export/excel ───────────────────────────────────────────

@router.get("/{uc_id}/business-case/export/excel")
async def export_excel(uc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Generate and download the business case as an Excel workbook."""
    bc = await service.get_or_create_business_case(db, uc_id)

    try:
        xlsx_bytes = service.generate_excel(bc)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    filename = f"business_case_{uc_id}.xlsx"
    return StreamingResponse(
        iter([xlsx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
