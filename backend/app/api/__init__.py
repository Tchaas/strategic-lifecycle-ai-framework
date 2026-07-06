from app.api.architecture_core import router as architecture_core_router
from app.api.architecture_supporting import router as architecture_supporting_router
from app.api.auth import router as auth_router
from app.api.departments import router as departments_router
from app.api.invites import router as invites_router
from app.api.workspaces import router as workspaces_router

__all__ = [
    "architecture_core_router",
    "architecture_supporting_router",
    "auth_router",
    "departments_router",
    "invites_router",
    "workspaces_router",
]
