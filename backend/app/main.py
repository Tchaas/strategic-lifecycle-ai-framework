from typing import cast

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.types import ExceptionHandler

from app.api import (
    architecture_core_router,
    architecture_supporting_router,
    auth_router,
    business_cases_router,
    departments_router,
    discovery_router,
    implementation_router,
    invites_router,
    solution_router,
    strategy_router,
    workspaces_router,
)
from app.core.config import settings
from app.core.errors import install_exception_handlers
from app.core.middleware import BodySizeLimitMiddleware
from app.core.rate_limit import RateLimited, rate_limited_handler


def create_app() -> FastAPI:
    settings.require_jwt_secret()
    app = FastAPI(title="Strategic Lifecycle AI Framework API")
    install_exception_handlers(app)
    app.add_exception_handler(RateLimited, cast(ExceptionHandler, rate_limited_handler))
    app.add_middleware(BodySizeLimitMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.include_router(auth_router)
    app.include_router(workspaces_router)
    app.include_router(invites_router)
    app.include_router(departments_router)
    app.include_router(architecture_core_router)
    app.include_router(architecture_supporting_router)
    app.include_router(strategy_router)
    app.include_router(business_cases_router)
    app.include_router(discovery_router)
    app.include_router(solution_router)
    app.include_router(implementation_router)
    return app


app = create_app()
