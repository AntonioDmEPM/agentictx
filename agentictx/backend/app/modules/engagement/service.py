import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.engagement import Engagement, EngagementStatus, UseCase
from app.schemas.engagement import (
    EngagementCreate,
    EngagementListRead,
    EngagementRead,
    EngagementUpdate,
    UseCaseCreate,
    UseCaseRead,
    UseCaseUpdate,
)


# ─── Engagement ──────────────────────────────────────────────────────────────

async def list_engagements(db: AsyncSession) -> list[EngagementListRead]:
    result = await db.execute(
        select(
            Engagement,
            func.count(UseCase.id).label("use_case_count"),
        )
        .outerjoin(UseCase, UseCase.engagement_id == Engagement.id)
        .group_by(Engagement.id)
        .order_by(Engagement.updated_at.desc())
    )
    rows = result.all()
    items: list[EngagementListRead] = []
    for engagement, count in rows:
        item = EngagementListRead.model_validate(engagement)
        item.use_case_count = count
        items.append(item)
    return items


async def get_engagement(db: AsyncSession, engagement_id: uuid.UUID) -> EngagementRead | None:
    result = await db.execute(
        select(Engagement)
        .options(selectinload(Engagement.use_cases))
        .where(Engagement.id == engagement_id)
    )
    engagement = result.scalar_one_or_none()
    if engagement is None:
        return None
    return EngagementRead.model_validate(engagement)


async def create_engagement(db: AsyncSession, payload: EngagementCreate) -> EngagementRead:
    engagement = Engagement(**payload.model_dump())
    db.add(engagement)
    await db.flush()
    await db.refresh(engagement, ["use_cases"])
    return EngagementRead.model_validate(engagement)


async def update_engagement(
    db: AsyncSession, engagement_id: uuid.UUID, payload: EngagementUpdate
) -> EngagementRead | None:
    result = await db.execute(
        select(Engagement)
        .options(selectinload(Engagement.use_cases))
        .where(Engagement.id == engagement_id)
    )
    engagement = result.scalar_one_or_none()
    if engagement is None:
        return None
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(engagement, field, value)
    await db.flush()
    await db.refresh(engagement)
    return EngagementRead.model_validate(engagement)


async def archive_engagement(
    db: AsyncSession, engagement_id: uuid.UUID
) -> EngagementRead | None:
    return await update_engagement(
        db, engagement_id, EngagementUpdate(status=EngagementStatus.archived)
    )


async def delete_engagement(db: AsyncSession, engagement_id: uuid.UUID) -> bool:
    result = await db.execute(select(Engagement).where(Engagement.id == engagement_id))
    engagement = result.scalar_one_or_none()
    if engagement is None:
        return False
    await db.delete(engagement)
    return True


# ─── Use Case ────────────────────────────────────────────────────────────────

async def list_use_cases(
    db: AsyncSession, engagement_id: uuid.UUID
) -> list[UseCaseRead]:
    result = await db.execute(
        select(UseCase)
        .where(UseCase.engagement_id == engagement_id)
        .order_by(UseCase.created_at.asc())
    )
    use_cases = result.scalars().all()
    return [UseCaseRead.model_validate(uc) for uc in use_cases]


async def get_use_case(
    db: AsyncSession, engagement_id: uuid.UUID, use_case_id: uuid.UUID
) -> UseCaseRead | None:
    result = await db.execute(
        select(UseCase).where(
            UseCase.id == use_case_id,
            UseCase.engagement_id == engagement_id,
        )
    )
    uc = result.scalar_one_or_none()
    return UseCaseRead.model_validate(uc) if uc else None


async def create_use_case(
    db: AsyncSession, engagement_id: uuid.UUID, payload: UseCaseCreate
) -> UseCaseRead:
    uc = UseCase(engagement_id=engagement_id, **payload.model_dump())
    db.add(uc)
    await db.flush()
    await db.refresh(uc)
    return UseCaseRead.model_validate(uc)


async def update_use_case(
    db: AsyncSession,
    engagement_id: uuid.UUID,
    use_case_id: uuid.UUID,
    payload: UseCaseUpdate,
) -> UseCaseRead | None:
    result = await db.execute(
        select(UseCase).where(
            UseCase.id == use_case_id,
            UseCase.engagement_id == engagement_id,
        )
    )
    uc = result.scalar_one_or_none()
    if uc is None:
        return None
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(uc, field, value)
    await db.flush()
    await db.refresh(uc)
    return UseCaseRead.model_validate(uc)


async def delete_use_case(
    db: AsyncSession, engagement_id: uuid.UUID, use_case_id: uuid.UUID
) -> bool:
    result = await db.execute(
        select(UseCase).where(
            UseCase.id == use_case_id,
            UseCase.engagement_id == engagement_id,
        )
    )
    uc = result.scalar_one_or_none()
    if uc is None:
        return False
    await db.delete(uc)
    return True
