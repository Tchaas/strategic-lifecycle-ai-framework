from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass

from fastapi import Request
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.errors import error_body

Clock = Callable[[], float]


@dataclass
class RateLimit:
    name: str
    limit: int
    window_seconds: int = 60


class InMemoryRateLimiter:
    """Single-process, direct-client-IP limiter. Do not trust X-Forwarded-For without trusted proxy config."""

    def __init__(self, clock: Clock | None = None) -> None:
        self.clock = clock or time.time
        self._buckets: dict[tuple[str, str], tuple[int, float]] = {}

    def check(self, key: str, limit: RateLimit) -> int | None:
        now = self.clock()
        bucket_key = (limit.name, key)
        count, reset_at = self._buckets.get(bucket_key, (0, now + limit.window_seconds))
        if now >= reset_at:
            count, reset_at = 0, now + limit.window_seconds
        if count >= limit.limit:
            return max(1, int(reset_at - now))
        self._buckets[bucket_key] = (count + 1, reset_at)
        return None

    def reset(self) -> None:
        self._buckets.clear()


rate_limiter = InMemoryRateLimiter()


def client_key(request: Request) -> str:
    if request.client is None:
        return "unknown"
    return request.client.host


def rate_limit_dependency(limit_factory: Callable[[], RateLimit]) -> Callable[[Request], None]:
    def dependency(request: Request) -> None:
        if not settings.rate_limit_enabled:
            return
        retry_after = rate_limiter.check(client_key(request), limit_factory())
        if retry_after is not None:
            raise RateLimited(retry_after)

    return dependency


class RateLimited(Exception):
    def __init__(self, retry_after: int) -> None:
        self.retry_after = retry_after


async def rate_limited_handler(_: Request, exc: RateLimited) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content=error_body("rate_limited", "Rate limit exceeded"),
        headers={"Retry-After": str(exc.retry_after)},
    )
