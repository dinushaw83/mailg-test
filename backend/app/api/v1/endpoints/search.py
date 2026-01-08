"""Search API endpoints.

This module provides:
- Email search with Gmail-style operators
- Search suggestions and autocomplete
- Saved searches
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, or_, and_
from typing import Optional, List
from datetime import datetime, timedelta
from uuid import UUID
import re
import time
import logging

from app.db.session import get_db
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.models.label import Label
from app.models.thread_label import ThreadLabel
from app.models.thread import Thread
from app.models.attachment import Attachment
from app.models.saved_search import SavedSearch
from app.models.user import User
from app.core.constants import VALID_FOLDER_TYPES
from app.schemas.search import (
    SearchQuery, SearchResult, SearchResponse,
    SearchSuggestion, SearchSuggestionsResponse,
    SavedSearchCreate, SavedSearchResponse
)
from app.schemas.pagination import PaginatedListResponse
from app.auth.rbac import authorized
from app.auth.dependencies import auth

logger = logging.getLogger(__name__)
router = APIRouter()


def get_label_hierarchy_name(label) -> str:
    """Build full hierarchical name for a label (e.g., 'grand/parent/child').
    
    Traverses up the parent chain to construct the full path.
    """
    parts = []
    current = label
    while current:
        parts.append(current.name)
        current = current.parent
    # Reverse to get grand -> parent -> child order
    parts.reverse()
    return "/".join(parts)


def parse_search_query(query: str) -> dict:
    """Parse Gmail-style search operators from query string.
    
    Examples:
        "from:john@example.com subject:meeting" ->
        {"from_email": "john@example.com", "subject": "meeting"}
        
        "is:starred has:attachment report" ->
        {"is_starred": True, "has_attachment": True, "text": "report"}
    """
    operators = {}
    remaining_text = []
    
    # Pattern definitions
    patterns = [
        (r'from:(\S+)', 'from_email'),
        (r'to:(\S+)', 'to_email'),
        (r'cc:(\S+)', 'cc_email'),
        (r'subject:("[^"]+"|\'[^\']+\'|\S+)', 'subject'),
        (r'has:attachment', ('has_attachment', True)),
        (r'has:star', ('is_starred', True)),
        (r'is:read', ('is_read', True)),
        (r'is:unread', ('is_read', False)),
        (r'is:starred', ('is_starred', True)),
        (r'is:important', ('is_important', True)),
        (r'in:(\w+)', 'folder_type'),
        (r'label:(\S+)', 'label_name'),
        (r'before:(\d{4}-\d{2}-\d{2})', 'date_to'),
        (r'after:(\d{4}-\d{2}-\d{2})', 'date_from'),
        (r'newer_than:(\d+[dmyw])', 'newer_than'),
        (r'older_than:(\d+[dmyw])', 'older_than'),
    ]
    
    query_copy = query
    
    for pattern, key in patterns:
        if isinstance(key, tuple):
            # Boolean pattern (no capture group)
            if re.search(pattern, query_copy, re.IGNORECASE):
                operators[key[0]] = key[1]
                query_copy = re.sub(pattern, '', query_copy, flags=re.IGNORECASE)
        else:
            # Value pattern (with capture group)
            match = re.search(pattern, query_copy, re.IGNORECASE)
            if match:
                value = match.group(1)
                # Remove quotes if present
                if value.startswith('"') or value.startswith("'"):
                    value = value[1:-1]
                operators[key] = value
                query_copy = re.sub(pattern, '', query_copy, flags=re.IGNORECASE)
    
    # Handle relative date filters
    if 'newer_than' in operators:
        operators['date_from'] = parse_relative_date(operators.pop('newer_than'))
    if 'older_than' in operators:
        operators['date_to'] = parse_relative_date(operators.pop('older_than'))
    
    # Remaining text is the search query
    remaining = query_copy.strip()
    if remaining:
        operators['text'] = remaining
    
    return operators


def parse_relative_date(relative: str) -> datetime:
    """Parse relative date string like '7d', '1m', '1y'."""
    match = re.match(r'(\d+)([dmyw])', relative)
    if not match:
        return None
    
    value = int(match.group(1))
    unit = match.group(2)
    
    now = datetime.utcnow()
    if unit == 'd':
        return now - timedelta(days=value)
    elif unit == 'm':
        return now - timedelta(days=value * 30)
    elif unit == 'w':
        return now - timedelta(weeks=value)
    elif unit == 'y':
        return now - timedelta(days=value * 365)
    
    return now


def get_snippet(body: Optional[str], max_length: int = 200) -> str:
    """Extract snippet from email body."""
    if not body:
        return ""
    # Strip HTML if present (basic)
    text = body.replace("<br>", " ").replace("<br/>", " ").replace("<p>", " ").replace("</p>", " ")
    text = re.sub(r'<[^>]+>', '', text)
    text = ' '.join(text.split())
    if len(text) > max_length:
        return text[:max_length] + "..."
    return text


@router.get("/search", response_model=SearchResponse, dependencies=[Depends(authorized())])
def search_emails(
    q: Optional[str] = Query(None, description="Search query with operators"),
    from_email: Optional[str] = Query(None, alias="from", description="Filter by sender"),
    to_email: Optional[str] = Query(None, alias="to", description="Filter by recipient"),
    subject: Optional[str] = Query(None, description="Search in subject"),
    folder: Optional[str] = Query(None, description="Filter by folder: inbox, sent, drafts, trash, spam, starred"),
    label_id: Optional[UUID] = Query(None, description="Filter by label"),
    label_name: Optional[str] = Query(None, description="Filter by label name"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    is_starred: Optional[bool] = Query(None, description="Filter by starred"),
    is_important: Optional[bool] = Query(None, description="Filter by important"),
    has_attachment: Optional[bool] = Query(None, description="Has attachments"),
    date_from: Optional[str] = Query(None, description="Emails after date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Emails before date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("date", description="Sort by: date, subject, sender"),
    sort_order: str = Query("desc", description="asc or desc"),
    db: Session = Depends(get_db),
) -> dict:
    """Search emails with comprehensive filtering.
    
    Supports Gmail-like search operators in the 'q' parameter:
    - from:sender@example.com
    - to:recipient@example.com
    - subject:meeting
    - has:attachment
    - is:starred
    - is:unread
    - in:inbox
    - label:important
    - before:2024-12-31
    - after:2024-01-01
    
    These can be combined: q="from:john subject:report has:attachment"
    """
    start_time = time.time()
    current_user = auth.user
    
    # Parse Gmail-style operators from q parameter
    parsed_filters = parse_search_query(q) if q else {}
    
    # Merge parsed filters with explicit parameters
    if 'from_email' in parsed_filters and not from_email:
        from_email = parsed_filters['from_email']
    if 'to_email' in parsed_filters and not to_email:
        to_email = parsed_filters['to_email']
    if 'subject' in parsed_filters and not subject:
        subject = parsed_filters['subject']
    if 'folder_type' in parsed_filters and not folder:
        folder = parsed_filters['folder_type']
    if 'label_name' in parsed_filters and not label_name:
        label_name = parsed_filters['label_name']
    if 'is_read' in parsed_filters and is_read is None:
        is_read = parsed_filters['is_read']
    if 'is_starred' in parsed_filters and is_starred is None:
        is_starred = parsed_filters['is_starred']
    if 'is_important' in parsed_filters and is_important is None:
        is_important = parsed_filters['is_important']
    if 'has_attachment' in parsed_filters and has_attachment is None:
        has_attachment = parsed_filters['has_attachment']
    if 'date_from' in parsed_filters and not date_from:
        if isinstance(parsed_filters['date_from'], datetime):
            date_from = parsed_filters['date_from'].strftime('%Y-%m-%d')
        else:
            date_from = parsed_filters['date_from']
    if 'date_to' in parsed_filters and not date_to:
        if isinstance(parsed_filters['date_to'], datetime):
            date_to = parsed_filters['date_to'].strftime('%Y-%m-%d')
        else:
            date_to = parsed_filters['date_to']
    
    text_search = parsed_filters.get('text')
    
    # Build base query - user's emails
    query = db.query(Email).options(
        joinedload(Email.sender),
        joinedload(Email.thread).selectinload(Thread.labels),  # Labels are on threads, not emails
        selectinload(Email.attachments),
    ).outerjoin(
        EmailRecipient, Email.id == EmailRecipient.email_id
    ).filter(
        Email.is_deleted == False,
        or_(
            Email.sender_id == current_user.id,
            EmailRecipient.recipient_id == current_user.id
        )
    )
    
    # Apply filters
    if from_email:
        query = query.join(User, Email.sender_id == User.id).filter(
            User.email.ilike(f"%{from_email}%")
        )
    
    if to_email:
        query = query.filter(
            EmailRecipient.recipient_email.ilike(f"%{to_email}%")
        )
    
    if subject:
        query = query.filter(Email.subject.ilike(f"%{subject}%"))
    
    if text_search:
        search_term = f"%{text_search}%"
        query = query.filter(
            or_(
                Email.subject.ilike(search_term),
                Email.body.ilike(search_term)
            )
        )
    
    if folder:
        if folder not in VALID_FOLDER_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid folder. Must be one of: {', '.join(VALID_FOLDER_TYPES)}"
            )
        query = query.filter(Email.folder == folder)
    
    if label_id:
        # Labels are user-specific on shared threads - filter by user_id
        query = query.join(Thread, Email.thread_id == Thread.id).join(
            ThreadLabel, Thread.id == ThreadLabel.thread_id
        ).filter(
            ThreadLabel.label_id == label_id,
            ThreadLabel.user_id == current_user.id  # Only this user's label associations
        )
    
    if label_name:
        label_subq = db.query(Label.id).filter(
            Label.owner_id == current_user.id,
            Label.name.ilike(f"%{label_name}%"),
            Label.is_deleted == False
        ).subquery()
        # Labels are user-specific on shared threads - filter by user_id
        query = query.join(Thread, Email.thread_id == Thread.id).join(
            ThreadLabel, Thread.id == ThreadLabel.thread_id
        ).filter(
            ThreadLabel.label_id.in_(label_subq),
            ThreadLabel.user_id == current_user.id  # Only this user's label associations
        )
    
    if is_read is not None:
        query = query.filter(Email.is_read == is_read)
    
    if is_starred is not None:
        query = query.filter(Email.is_starred == is_starred)
    
    if is_important is not None:
        query = query.filter(Email.is_important == is_important)
    
    if has_attachment:
        att_subq = db.query(Attachment.email_id).filter(
            Attachment.is_deleted == False
        ).distinct().subquery()
        query = query.filter(Email.id.in_(att_subq))
    
    if date_from:
        try:
            dt = datetime.strptime(date_from, '%Y-%m-%d')
            query = query.filter(Email.created_at >= dt)
        except ValueError:
            pass
    
    if date_to:
        try:
            dt = datetime.strptime(date_to, '%Y-%m-%d')
            query = query.filter(Email.created_at <= dt)
        except ValueError:
            pass
    
    # Get total count
    total = query.distinct(Email.id).count()
    
    # Apply sorting
    if sort_by == "subject":
        order_col = Email.subject
    elif sort_by == "sender":
        order_col = Email.sender_id
    else:
        order_col = Email.created_at
    
    if sort_order == "asc":
        query = query.order_by(order_col.asc())
    else:
        query = query.order_by(order_col.desc())
    
    # Apply pagination
    offset = (page - 1) * page_size
    emails = query.distinct(Email.id).offset(offset).limit(page_size).all()
    
    # Format results
    results = []
    for email in emails:
        recipients = [r.recipient_email for r in email.recipients] if hasattr(email, 'recipients') else []
        # Labels are on threads - filter by user ownership for user-specific isolation
        labels = []
        if email.thread and email.thread.labels:
            labels = [get_label_hierarchy_name(l) for l in email.thread.labels 
                      if not l.is_deleted and l.owner_id == current_user.id]
        attachments = [a for a in email.attachments if not a.is_deleted]
        
        results.append({
            "id": email.id,
            "subject": email.subject,
            "snippet": get_snippet(email.body),
            "sender_email": email.sender.email if email.sender else "",
            "sender_name": email.sender.name if email.sender else None,
            "recipients": recipients,
            "folder": email.folder or "inbox",
            "labels": labels,
            "is_read": email.is_read,
            "is_starred": email.is_starred,
            "has_attachment": len(attachments) > 0,
            "attachment_count": len(attachments),
            "sent_at": email.sent_at,
            "created_at": email.created_at,
            "highlighted_subject": None,
            "highlighted_snippet": None,
        })
    
    execution_time_ms = int((time.time() - start_time) * 1000)
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    
    return {
        "results": results,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "query": q or "",
        "execution_time_ms": execution_time_ms,
    }


@router.get("/search/suggestions", response_model=SearchSuggestionsResponse, dependencies=[Depends(authorized())])
def get_search_suggestions(
    q: str = Query(..., min_length=0, description="Partial query for suggestions"),
    limit: int = Query(10, ge=1, le=20),
    db: Session = Depends(get_db),
) -> dict:
    """Get search suggestions based on partial query.
    
    Returns:
    - Recent searches matching the query
    - Contact suggestions (for from:/to: operators)
    - Label suggestions
    - Folder suggestions
    """
    current_user = auth.user
    
    suggestions = {
        "contacts": [],
        "labels": [],
        "folders": [],
        "recent_searches": [],
        "operators": []
    }
    
    # If query starts with known operator prefix, suggest completions
    if q.startswith("from:") or q.startswith("to:"):
        partial = q.split(":", 1)[1] if ":" in q else ""
        # Get contacts from emails
        contacts = db.query(User.email, User.first_name, User.last_name).filter(
            User.is_deleted == False,
            or_(
                User.email.ilike(f"%{partial}%"),
                User.first_name.ilike(f"%{partial}%"),
                User.last_name.ilike(f"%{partial}%")
            )
        ).limit(limit).all()
        
        suggestions["contacts"] = [
            {"value": c.email, "type": "contact", "description": f"{c.first_name} {c.last_name}".strip()}
            for c in contacts
        ]
    
    elif q.startswith("label:"):
        partial = q.split(":", 1)[1] if ":" in q else ""
        labels = db.query(Label).filter(
            Label.owner_id == current_user.id,
            Label.is_deleted == False,
            Label.name.ilike(f"%{partial}%")
        ).limit(limit).all()
        
        suggestions["labels"] = [
            {"value": get_label_hierarchy_name(l), "type": "label", "description": None}
            for l in labels
        ]
    
    elif q.startswith("in:"):
        suggestions["folders"] = [
            {"value": "inbox", "type": "folder", "description": "Inbox folder"},
            {"value": "sent", "type": "folder", "description": "Sent folder"},
            {"value": "drafts", "type": "folder", "description": "Drafts folder"},
            {"value": "trash", "type": "folder", "description": "Trash folder"},
            {"value": "spam", "type": "folder", "description": "Spam folder"},
            {"value": "starred", "type": "folder", "description": "Starred items"},
        ]
    
    else:
        # General suggestions - show operators
        suggestions["operators"] = [
            {"value": "from:", "type": "operator", "description": "Search by sender"},
            {"value": "to:", "type": "operator", "description": "Search by recipient"},
            {"value": "subject:", "type": "operator", "description": "Search in subject"},
            {"value": "has:attachment", "type": "operator", "description": "Has attachments"},
            {"value": "is:unread", "type": "operator", "description": "Unread emails"},
            {"value": "is:starred", "type": "operator", "description": "Starred emails"},
            {"value": "in:", "type": "operator", "description": "Filter by folder"},
            {"value": "label:", "type": "operator", "description": "Filter by label"},
        ]
        
        # Get recent searches
        recent = db.query(SavedSearch).filter(
            SavedSearch.owner_id == current_user.id,
            SavedSearch.is_deleted == False
        ).order_by(SavedSearch.last_used_at.desc().nulls_last()).limit(5).all()
        
        suggestions["recent_searches"] = [s.query for s in recent]
    
    return suggestions


@router.post("/search/saved", response_model=SavedSearchResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(authorized())])
def save_search(
    search_data: SavedSearchCreate,
    db: Session = Depends(get_db),
) -> dict:
    """Save a search query for later use."""
    current_user = auth.user
    
    # Parse filters from query
    filters = parse_search_query(search_data.query)
    
    saved = SavedSearch(
        name=search_data.name,
        query=search_data.query,
        filters=filters,
        owner_id=current_user.id,
    )
    
    try:
        db.add(saved)
        db.commit()
        db.refresh(saved)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Search saved by user {current_user.id}")
    
    return {
        "id": saved.id,
        "name": saved.name,
        "query": saved.query,
        "filters": saved.filters,
        "owner_id": saved.owner_id,
        "use_count": saved.use_count,
        "last_used_at": saved.last_used_at,
        "created_at": saved.created_at,
        "updated_at": saved.updated_at,
    }


@router.get("/search/saved", response_model=List[SavedSearchResponse], dependencies=[Depends(authorized())])
def list_saved_searches(
    db: Session = Depends(get_db),
) -> List[dict]:
    """List user's saved searches."""
    current_user = auth.user
    
    searches = db.query(SavedSearch).filter(
        SavedSearch.owner_id == current_user.id,
        SavedSearch.is_deleted == False
    ).order_by(SavedSearch.use_count.desc(), SavedSearch.created_at.desc()).all()
    
    return [
        {
            "id": s.id,
            "name": s.name,
            "query": s.query,
            "filters": s.filters,
            "owner_id": s.owner_id,
            "use_count": s.use_count,
            "last_used_at": s.last_used_at,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
        }
        for s in searches
    ]


@router.delete("/search/saved/{search_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(authorized())])
def delete_saved_search(
    search_id: UUID,
    db: Session = Depends(get_db),
    permanent: bool = Query(False, description="Permanently delete instead of soft delete"),
) -> None:
    """Delete a saved search.
    
    Args:
        permanent: If True, permanently removes from database. If False (default), soft deletes.
    """
    current_user = auth.user
    
    saved = db.query(SavedSearch).filter(
        SavedSearch.id == search_id,
        SavedSearch.owner_id == current_user.id,
        SavedSearch.is_deleted == False
    ).first()
    
    if not saved:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Saved search {search_id} not found"
        )
    
    if permanent:
        # Permanently delete from database
        db.delete(saved)
    else:
        # Soft delete
        saved.is_deleted = True
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Saved search {search_id} {'permanently ' if permanent else ''}deleted by user {current_user.id}")
