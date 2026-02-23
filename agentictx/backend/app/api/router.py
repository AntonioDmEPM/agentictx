from fastapi import APIRouter

from app.api.engagements import router as engagements_router
from app.api.discovery import router as discovery_router
from app.api.agentic_design import router as agentic_design_router
from app.api.business_case import router as business_case_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(engagements_router)
api_router.include_router(discovery_router)
api_router.include_router(agentic_design_router)
api_router.include_router(business_case_router)
