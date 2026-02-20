import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.engagement import EngagementStatus, UseCaseStatus


# ─── Use Case ────────────────────────────────────────────────────────────────

class UseCaseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None


class UseCaseUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: UseCaseStatus | None = None


class UseCaseRead(BaseModel):
    id: uuid.UUID
    engagement_id: uuid.UUID
    name: str
    description: str | None
    status: UseCaseStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Engagement ──────────────────────────────────────────────────────────────

class EngagementCreate(BaseModel):
    client_name: str = Field(..., min_length=1, max_length=255)
    industry: str | None = Field(None, max_length=255)
    engagement_type: str | None = Field(None, max_length=255)


class EngagementUpdate(BaseModel):
    client_name: str | None = Field(None, min_length=1, max_length=255)
    industry: str | None = Field(None, max_length=255)
    engagement_type: str | None = Field(None, max_length=255)
    status: EngagementStatus | None = None


class EngagementRead(BaseModel):
    id: uuid.UUID
    client_name: str
    industry: str | None
    engagement_type: str | None
    status: EngagementStatus
    created_at: datetime
    updated_at: datetime
    use_cases: list[UseCaseRead] = []

    model_config = {"from_attributes": True}


class EngagementListRead(BaseModel):
    id: uuid.UUID
    client_name: str
    industry: str | None
    engagement_type: str | None
    status: EngagementStatus
    created_at: datetime
    updated_at: datetime
    use_case_count: int = 0

    model_config = {"from_attributes": True}
