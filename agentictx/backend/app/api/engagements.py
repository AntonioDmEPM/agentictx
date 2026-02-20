import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.engagement import service
from app.schemas.common import ResponseEnvelope
from app.schemas.engagement import (
    EngagementCreate,
    EngagementListRead,
    EngagementRead,
    EngagementUpdate,
    UseCaseCreate,
    UseCaseRead,
    UseCaseUpdate,
)

router = APIRouter(prefix="/engagements", tags=["engagements"])


# ─── Engagements ─────────────────────────────────────────────────────────────

@router.get("", response_model=ResponseEnvelope[list[EngagementListRead]])
async def list_engagements(db: AsyncSession = Depends(get_db)):
    items = await service.list_engagements(db)
    return ResponseEnvelope(data=items)


@router.post("", response_model=ResponseEnvelope[EngagementRead], status_code=status.HTTP_201_CREATED)
async def create_engagement(
    payload: EngagementCreate, db: AsyncSession = Depends(get_db)
):
    engagement = await service.create_engagement(db, payload)
    return ResponseEnvelope(data=engagement)


@router.get("/{engagement_id}", response_model=ResponseEnvelope[EngagementRead])
async def get_engagement(engagement_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    engagement = await service.get_engagement(db, engagement_id)
    if engagement is None:
        raise HTTPException(status_code=404, detail="Engagement not found")
    return ResponseEnvelope(data=engagement)


@router.patch("/{engagement_id}", response_model=ResponseEnvelope[EngagementRead])
async def update_engagement(
    engagement_id: uuid.UUID,
    payload: EngagementUpdate,
    db: AsyncSession = Depends(get_db),
):
    engagement = await service.update_engagement(db, engagement_id, payload)
    if engagement is None:
        raise HTTPException(status_code=404, detail="Engagement not found")
    return ResponseEnvelope(data=engagement)


@router.post("/{engagement_id}/archive", response_model=ResponseEnvelope[EngagementRead])
async def archive_engagement(
    engagement_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    engagement = await service.archive_engagement(db, engagement_id)
    if engagement is None:
        raise HTTPException(status_code=404, detail="Engagement not found")
    return ResponseEnvelope(data=engagement)


@router.delete("/{engagement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_engagement(
    engagement_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    deleted = await service.delete_engagement(db, engagement_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Engagement not found")


# ─── Use Cases ────────────────────────────────────────────────────────────────

@router.get("/{engagement_id}/use-cases", response_model=ResponseEnvelope[list[UseCaseRead]])
async def list_use_cases(
    engagement_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    items = await service.list_use_cases(db, engagement_id)
    return ResponseEnvelope(data=items)


@router.post(
    "/{engagement_id}/use-cases",
    response_model=ResponseEnvelope[UseCaseRead],
    status_code=status.HTTP_201_CREATED,
)
async def create_use_case(
    engagement_id: uuid.UUID,
    payload: UseCaseCreate,
    db: AsyncSession = Depends(get_db),
):
    engagement = await service.get_engagement(db, engagement_id)
    if engagement is None:
        raise HTTPException(status_code=404, detail="Engagement not found")
    uc = await service.create_use_case(db, engagement_id, payload)
    return ResponseEnvelope(data=uc)


@router.get(
    "/{engagement_id}/use-cases/{use_case_id}",
    response_model=ResponseEnvelope[UseCaseRead],
)
async def get_use_case(
    engagement_id: uuid.UUID,
    use_case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    uc = await service.get_use_case(db, engagement_id, use_case_id)
    if uc is None:
        raise HTTPException(status_code=404, detail="Use case not found")
    return ResponseEnvelope(data=uc)


@router.patch(
    "/{engagement_id}/use-cases/{use_case_id}",
    response_model=ResponseEnvelope[UseCaseRead],
)
async def update_use_case(
    engagement_id: uuid.UUID,
    use_case_id: uuid.UUID,
    payload: UseCaseUpdate,
    db: AsyncSession = Depends(get_db),
):
    uc = await service.update_use_case(db, engagement_id, use_case_id, payload)
    if uc is None:
        raise HTTPException(status_code=404, detail="Use case not found")
    return ResponseEnvelope(data=uc)


@router.delete(
    "/{engagement_id}/use-cases/{use_case_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_use_case(
    engagement_id: uuid.UUID,
    use_case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    deleted = await service.delete_use_case(db, engagement_id, use_case_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Use case not found")
