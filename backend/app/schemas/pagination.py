"""Shared pagination schemas.

This provides a reusable generic paginated response model similar to
C# PaginatedListResponse<T>.
"""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginatedListResponse(BaseModel, Generic[T]):
    """Generic paginated list response.

    Notes:
    - `results` is the canonical list field name.
    """

    results: list[T] = Field(default_factory=list, description="Items on the current page")
    total: int = Field(..., ge=0, description="Total items matching the query")
    page: int = Field(..., ge=1, description="Current page number (1-indexed)")
    page_size: int = Field(..., ge=1, description="Items per page")
    total_pages: int = Field(..., ge=0, description="Total number of pages")

    @classmethod
    def create(
        cls,
        *,
        results: list[T],
        total: int,
        page: int,
        page_size: int,
    ) -> "PaginatedListResponse[T]":
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        return cls(
            results=results,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )


