from app.api.architecture_core import router as architecture_core_router
from app.api.architecture_supporting import router as architecture_supporting_router
from app.api.auth import router as auth_router
from app.api.business_cases import router as business_cases_router
from app.api.departments import router as departments_router
from app.api.discovery import router as discovery_router
from app.api.implementation import router as implementation_router
from app.api.invites import router as invites_router
from app.api.solution import router as solution_router
from app.api.strategy import router as strategy_router
from app.api.workspaces import router as workspaces_router

__all__ = [
    "architecture_core_router",
    "architecture_supporting_router",
    "auth_router",
    "business_cases_router",
    "departments_router",
    "discovery_router",
    "implementation_router",
    "invites_router",
    "solution_router",
    "strategy_router",
    "workspaces_router",
]
