from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    architecture_core_router,
    architecture_supporting_router,
    auth_router,
    departments_router,
    invites_router,
    strategy_router,
    workspaces_router,
)
from app.core.config import settings
from app.core.errors import install_exception_handlers


def create_app() -> FastAPI:
    settings.require_jwt_secret()
    app = FastAPI(title="Strategic Lifecycle AI Framework API")
    install_exception_handlers(app)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth_router)
    app.include_router(workspaces_router)
    app.include_router(invites_router)
    app.include_router(departments_router)
    app.include_router(architecture_core_router)
    app.include_router(architecture_supporting_router)
    app.include_router(strategy_router)
    return app


app = create_app()
