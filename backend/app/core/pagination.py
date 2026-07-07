from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import overload

from fastapi import Query
from pydantic import BaseModel, ConfigDict


class PaginationParams:
    def __init__(
        self,
        limit: int = Query(default=50, ge=1, le=200),
        offset: int = Query(default=0, ge=0),
    ) -> None:
        self.limit = limit
        self.offset = offset


class Page[T](BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[T]
    total: int
    limit: int
    offset: int


@overload
def paginate_items[T](items: Sequence[T], params: PaginationParams) -> Page[T]: ...


@overload
def paginate_items[T, U](items: Sequence[T], params: PaginationParams, mapper: Callable[[T], U]) -> Page[U]: ...


def paginate_items[T, U](
    items: Sequence[T],
    params: PaginationParams,
    mapper: Callable[[T], U] | None = None,
) -> Page[T] | Page[U]:
    page_items = list(items[params.offset : params.offset + params.limit])
    if mapper is not None:
        return Page(
            items=[mapper(item) for item in page_items],
            total=len(items),
            limit=params.limit,
            offset=params.offset,
        )
    return Page(items=page_items, total=len(items), limit=params.limit, offset=params.offset)
