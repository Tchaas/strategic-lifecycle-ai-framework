from typing import Any, cast

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.types import ExceptionHandler


class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int, details: dict[str, Any] | None = None) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


def error_body(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "details": details or {}}}


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=error_body(exc.code, exc.message, exc.details))


async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    code = "invalid_token" if exc.status_code == 401 else "http_error"
    message = str(exc.detail) if exc.detail else "Request failed"
    return JSONResponse(status_code=exc.status_code, content=error_body(code, message))


async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    fields = []
    for error in exc.errors():
        safe_error = {key: value for key, value in error.items() if key != "input"}
        fields.append(safe_error)
    details = {"fields": fields}
    return JSONResponse(
        status_code=422,
        content=error_body("validation_error", "Request validation failed", details),
    )


async def unhandled_exception_handler(_: Request, __: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content=error_body("internal_error", "Internal server error"))


def install_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, cast(ExceptionHandler, app_error_handler))
    app.add_exception_handler(HTTPException, cast(ExceptionHandler, http_exception_handler))
    app.add_exception_handler(RequestValidationError, cast(ExceptionHandler, validation_exception_handler))
    app.add_exception_handler(Exception, unhandled_exception_handler)
