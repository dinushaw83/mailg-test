"""Pydantic schemas for Search API - request/response validation."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

from app.schemas.pagination import PaginatedListResponse


class SearchQuery(BaseModel):
    """Search query parameters."""
    q: Optional[str] = Field(None, description="Full-text search query")
    
    # Sender/recipient filters
    from_email: Optional[str] = Field(None, description="Filter by sender")
    to_email: Optional[str] = Field(None, description="Filter by recipient")
    cc_email: Optional[str] = Field(None, description="Filter by CC recipient")
    
    # Content filters
    subject: Optional[str] = Field(None, description="Search in subject")
    body: Optional[str] = Field(None, description="Search in body")
    
    # Folder/label filters
    folder_id: Optional[UUID] = Field(None, description="Filter by folder ID")
    folder_type: Optional[str] = Field(None, description="Filter by folder type")
    label_id: Optional[UUID] = Field(None, description="Filter by label ID")
    label_name: Optional[str] = Field(None, description="Filter by label name")
    
    # Status filters
    is_read: Optional[bool] = Field(None, description="Filter by read status")
    is_starred: Optional[bool] = Field(None, description="Filter by starred status")
    is_important: Optional[bool] = Field(None, description="Filter by important flag")
    has_attachment: Optional[bool] = Field(None, description="Has attachments")
    
    # Date filters
    date_from: Optional[datetime] = Field(None, description="Emails after this date")
    date_to: Optional[datetime] = Field(None, description="Emails before this date")
    
    # Pagination
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=100, description="Results per page")
    
    # Sorting
    sort_by: str = Field("date", description="Sort field: date, subject, sender")
    sort_order: str = Field("desc", description="Sort order: asc, desc")


class SearchResult(BaseModel):
    """Search result item."""
    model_config = {"from_attributes": True}
    
    id: UUID
    subject: str
    snippet: str  # Preview of body (first 200 chars)
    sender_email: str
    sender_name: Optional[str] = None
    recipients: List[str] = []
    folder_id: Optional[UUID] = None
    folder_name: Optional[str] = None
    labels: List[str] = []
    is_read: bool
    is_starred: bool
    has_attachment: bool
    attachment_count: int = 0
    sent_at: Optional[datetime] = None
    created_at: datetime
    
    # Highlighting (matched terms wrapped in <mark> tags)
    highlighted_subject: Optional[str] = None
    highlighted_snippet: Optional[str] = None


class SearchResponse(BaseModel):
    """Paginated search response."""
    results: List[SearchResult]
    total: int
    page: int
    page_size: int
    total_pages: int
    query: str  # The parsed/normalized query
    execution_time_ms: int = 0  # Search execution time


class SearchSuggestion(BaseModel):
    """Search suggestion item."""
    value: str
    type: str  # contact, label, folder, operator
    description: Optional[str] = None


class SearchSuggestionsResponse(BaseModel):
    """Search suggestions response."""
    contacts: List[SearchSuggestion] = []
    labels: List[SearchSuggestion] = []
    folders: List[SearchSuggestion] = []
    recent_searches: List[str] = []
    operators: List[SearchSuggestion] = []


class SavedSearchCreate(BaseModel):
    """Schema for creating a saved search."""
    name: str = Field(..., min_length=1, max_length=100, description="Search name")
    query: str = Field(..., min_length=1, description="Search query string")


class SavedSearchResponse(BaseModel):
    """Schema for saved search response."""
    model_config = {"from_attributes": True}
    
    id: UUID
    name: str
    query: str
    filters: Optional[Dict[str, Any]] = None
    owner_id: UUID
    use_count: int = 0
    last_used_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


SavedSearchPaginatedResponse = PaginatedListResponse[SavedSearchResponse]
