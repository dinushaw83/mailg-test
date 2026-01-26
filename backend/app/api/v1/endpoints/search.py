"""Search API endpoints.

This module provides:
- Email search with Gmail-style operators
- Search suggestions and autocomplete
- Saved searches
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, or_, and_, cast, String
from typing import Optional, List
from datetime import datetime, timedelta
from uuid import UUID
import logging

from app.db.session import get_db
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.models.label import Label
from app.models.thread_label import ThreadLabel
from app.models.thread import Thread
from app.models.thread_user_metadata import ThreadUserMetadata
from app.models.attachment import Attachment
from app.models.saved_search import SavedSearch
from app.models.user import User
from app.core.constants import VALID_FOLDER_TYPES, VALID_EMAIL_CATEGORIES
from app.schemas.search import ( SearchSuggestionsResponse,
    SavedSearchCreate, SavedSearchResponse
)
from app.schemas.email import EmailListResponse
from app.schemas.pagination import PaginatedListResponse
from app.auth.rbac import authorized
from app.auth.dependencies import auth
from app.auth.token_dependency import require_token_data
from app.utils.email_utils import get_label_hierarchy_name, format_email_list_response, get_perspective_email_filter
from app.utils.search_utils import parse_search_query, save_search_query_background
from app.utils.thread_metadata_utils import get_user_important_thread_ids

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/search", response_model=PaginatedListResponse[EmailListResponse], dependencies=[Depends(authorized())])
def search_emails(
    request: Request,
    background_tasks: BackgroundTasks,
    q: Optional[str] = Query(None, description="Search query with operators"),
    from_email: Optional[str] = Query(None, alias="from", description="Filter by sender (comma-separated for multiple)"),
    to_email: Optional[str] = Query(None, alias="to", description="Filter by recipient (comma-separated for multiple)"),
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
    hasnot: Optional[str] = Query(None, description="Exclude emails containing this text"),
    size: Optional[int] = Query(None, description="Filter by exact size in bytes"),
    size_larger: Optional[int] = Query(None, description="Emails larger than size in bytes"),
    size_smaller: Optional[int] = Query(None, description="Emails smaller than size in bytes"),
    cc: Optional[str] = Query(None, description="Filter by CC recipients (comma-separated)"),
    bcc: Optional[str] = Query(None, description="Filter by BCC recipients (comma-separated)"),
    filename: Optional[str] = Query(None, description="Filter by attachment filename or extension"),
    category: Optional[str] = Query(None, description="Filter by category: primary, promotions, social, updates, forums"),
    deliveredto: Optional[str] = Query(None, description="Filter by delivered-to address"),
    is_snoozed: Optional[bool] = Query(None, description="Filter snoozed emails"),
    has_userlabels: Optional[bool] = Query(None, description="Filter emails with/without user labels"),
    in_anywhere: Optional[bool] = Query(None, description="Search all folders including spam/trash"),
    in_archive: Optional[bool] = Query(None, description="Search archived messages"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("date", description="Sort by: date, subject, sender"),
    sort_order: str = Query("desc", description="asc or desc"),
    tz_offset: Optional[int] = Query(None, description="UTC offset in minutes from browser's getTimezoneOffset() for date interpretation in q"),
    db: Session = Depends(get_db),
) -> dict:
    """Search emails with comprehensive filtering.
    
    Supports Gmail-like search operators in the 'q' parameter:
    - from:sender@example.com (comma-separated for multiple)
    - to:recipient@example.com (comma-separated for multiple)
    - cc:user@example.com, bcc:user@example.com
    - subject:meeting, subject:(dinner movie) for grouping
    - has:attachment, has:userlabels, has:nouserlabels
    - is:starred, is:unread, is:read, is:important
    - in:inbox, in:anywhere, in:archive, in:snoozed
    - label:important, category:primary
    - before:2024-12-31, after:2024-01-01
    - size:1000000, larger:10M, smaller:5K
    - filename:report.pdf, filename:pdf
    - deliveredto:user@example.com
    - -term (exclude), +term (exact match), "exact phrase"
    - term1 OR term2, {term1 term2}
    
    These can be combined: q="from:john subject:report has:attachment -spam"
    """
    current_user = auth.user
    
    # Parse Gmail-style operators from q parameter
    # tz_offset only used for parsing dates in q string (date_from/date_to params are expected to be UTC)
    parsed_filters = parse_search_query(q, tz_offset=tz_offset) if q else {}
    
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
    # For dates parsed from q with tz_offset, keep the datetime object to preserve timezone info
    # Use _date_from_dt and _date_to_dt for datetime objects (from q parsing)
    _date_from_dt = None
    _date_to_dt = None
    
    if 'date_from' in parsed_filters and not date_from:
        if isinstance(parsed_filters['date_from'], datetime):
            _date_from_dt = parsed_filters['date_from']  # Keep datetime with tz info
        else:
            date_from = parsed_filters['date_from']
    if 'date_to' in parsed_filters and not date_to:
        if isinstance(parsed_filters['date_to'], datetime):
            _date_to_dt = parsed_filters['date_to']  # Keep datetime with tz info
        else:
            date_to = parsed_filters['date_to']
    
    # Merge new Gmail-style filters
    if 'cc_email' in parsed_filters and not cc:
        cc = parsed_filters['cc_email']
    if 'bcc_email' in parsed_filters and not bcc:
        bcc = parsed_filters['bcc_email']
    if 'size' in parsed_filters and size is None:
        size = parsed_filters['size']
    if 'size_larger' in parsed_filters and size_larger is None:
        size_larger = parsed_filters['size_larger']
    if 'size_smaller' in parsed_filters and size_smaller is None:
        size_smaller = parsed_filters['size_smaller']
    if 'filename' in parsed_filters and not filename:
        filename = parsed_filters['filename']
    if 'category' in parsed_filters and not category:
        category = parsed_filters['category']
    if 'deliveredto' in parsed_filters and not deliveredto:
        deliveredto = parsed_filters['deliveredto']
    if 'is_snoozed' in parsed_filters and is_snoozed is None:
        is_snoozed = parsed_filters['is_snoozed']
    if 'has_userlabels' in parsed_filters and has_userlabels is None:
        has_userlabels = parsed_filters['has_userlabels']
    if 'in_anywhere' in parsed_filters and in_anywhere is None:
        in_anywhere = parsed_filters['in_anywhere']
    if 'in_archive' in parsed_filters and in_archive is None:
        in_archive = parsed_filters['in_archive']
    
    # Get advanced search parameters from parsed query
    text_search = parsed_filters.get('text')
    exclusions = parsed_filters.get('exclusions', [])
    exact_phrases = parsed_filters.get('exact_phrases', [])
    exact_matches = parsed_filters.get('exact_matches', [])
    or_groups = parsed_filters.get('or_groups', [])
    grouped_terms = parsed_filters.get('grouped_terms', {})
    
    # Build base query - user's emails (perspective-aware)
    query = db.query(Email).options(
        joinedload(Email.sender),
        joinedload(Email.thread).selectinload(Thread.labels),  # Labels are on threads, not emails
        joinedload(Email.thread).selectinload(Thread.user_metadata),  # Thread metadata for is_important, snooze, etc.
        selectinload(Email.attachments),
    ).outerjoin(
        EmailRecipient, Email.id == EmailRecipient.email_id
    ).filter(
        get_perspective_email_filter(db, current_user.id)
    )
    
    # Helper to check if term is "me" keyword (refers to current user)
    def is_me_keyword(term: str) -> bool:
        return term.lower() == 'me'
    
    # Apply filters
    if from_email:
        # Support comma-separated values for multiple senders
        # Prioritizes name match (partial) over email match (exact)
        # "me" keyword matches the current user
        from_emails = [e.strip() for e in from_email.split(',') if e.strip()]
        if from_emails:
            query = query.join(User, Email.sender_id == User.id)
            if len(from_emails) == 1:
                e = from_emails[0]
                if is_me_keyword(e):
                    # "me" = current user
                    query = query.filter(Email.sender_id == current_user.id)
                else:
                    query = query.filter(
                        or_(
                            # Name matching - partial/fuzzy (prioritized)
                            User.first_name.ilike(f"%{e}%"),
                            User.last_name.ilike(f"%{e}%"),
                            # Email matching - exact (case-insensitive)
                            User.email.ilike(e)
                        )
                    )
            else:
                from_conditions = []
                for e in from_emails:
                    if is_me_keyword(e):
                        # "me" = current user
                        from_conditions.append(Email.sender_id == current_user.id)
                    else:
                        # Name matching - partial/fuzzy (prioritized)
                        from_conditions.append(User.first_name.ilike(f"%{e}%"))
                        from_conditions.append(User.last_name.ilike(f"%{e}%"))
                        # Email matching - exact (case-insensitive)
                        from_conditions.append(User.email.ilike(e))
                query = query.filter(or_(*from_conditions))
    
    if to_email:
        # Support comma-separated values for multiple recipients
        # Prioritizes name match (partial) over email match (exact)
        # "me" keyword matches the current user
        to_emails = [e.strip() for e in to_email.split(',') if e.strip()]
        if to_emails:
            if len(to_emails) == 1:
                e = to_emails[0]
                if is_me_keyword(e):
                    # "me" = current user as recipient
                    query = query.filter(EmailRecipient.recipient_id == current_user.id)
                else:
                    query = query.filter(
                        or_(
                            # Name matching - partial/fuzzy (prioritized)
                            EmailRecipient.recipient_name.ilike(f"%{e}%"),
                            # Email matching - exact (case-insensitive)
                            EmailRecipient.recipient_email.ilike(e)
                        )
                    )
            else:
                to_conditions = []
                for e in to_emails:
                    if is_me_keyword(e):
                        # "me" = current user as recipient
                        to_conditions.append(EmailRecipient.recipient_id == current_user.id)
                    else:
                        # Name matching - partial/fuzzy (prioritized)
                        to_conditions.append(EmailRecipient.recipient_name.ilike(f"%{e}%"))
                        # Email matching - exact (case-insensitive)
                        to_conditions.append(EmailRecipient.recipient_email.ilike(e))
                query = query.filter(or_(*to_conditions))
    
    if subject:
        query = query.filter(Email.subject.ilike(f"%{subject}%"))
    
    if text_search:
        # Free text wildcard search - matches subject, body, sender name, or recipient name
        search_term = f"%{text_search}%"
        # Build sender name subquery (emails where sender name matches)
        sender_match_subq = db.query(Email.id).join(
            User, Email.sender_id == User.id
        ).filter(
            or_(
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term)
            )
        ).scalar_subquery()
        # Build recipient name subquery (emails where any recipient name matches)
        recipient_match_subq = db.query(EmailRecipient.email_id).filter(
            EmailRecipient.recipient_name.ilike(search_term)
        ).distinct().scalar_subquery()
        
        query = query.filter(
            or_(
                Email.subject.ilike(search_term),
                Email.body.ilike(search_term),
                Email.id.in_(sender_match_subq),
                Email.id.in_(recipient_match_subq)
            )
        )
    
    # Folder filtering logic:
    # - in:anywhere: search ALL folders including spam/trash
    # - folder param: search specific folder
    # - default: exclude spam and trash
    if in_anywhere:
        # Search everywhere - no folder restrictions
        pass
    elif folder:
        if folder not in VALID_FOLDER_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid folder. Must be one of: {', '.join(VALID_FOLDER_TYPES)}"
            )
        # Use email.folder for search filtering (simpler and works for all cases)
        query = query.filter(Email.folder == folder)
    else:
        # Default: exclude spam and trash by folder
        query = query.filter(~Email.folder.in_(['spam', 'trash']))
    
    if label_id:
        # Labels are user-specific on shared threads - filter by user_id
        query = query.join(Thread, Email.thread_id == Thread.id).join(
            ThreadLabel, Thread.id == ThreadLabel.thread_id
        ).filter(
            ThreadLabel.label_id == label_id,
            ThreadLabel.user_id == current_user.id  # Only this user's label associations
        )
    
    if label_name:
        # Handle hierarchical label names (e.g., "Projects::Client" or "Projects/Client")
        # Also support hyphens as spaces for URL-friendly names (e.g., "Client-B" matches both "Client-B" and "Client B")
        # Split by common separators and find the matching label
        label_parts = None
        original_label_name = label_name  # Keep original for matching labels with actual hyphens
        
        if "::" in label_name:
            label_parts = [p.strip() for p in label_name.split("::") if p.strip()]
        elif "/" in label_name:
            label_parts = [p.strip() for p in label_name.split("/") if p.strip()]
        
        logger.debug(f"Label search: label_name={label_name}, label_parts={label_parts}")
        
        if label_parts and len(label_parts) > 1:
            # Hierarchical label - find by traversing the hierarchy
            # Try both original parts and parts with hyphens converted to spaces
            leaf_name = label_parts[-1]
            leaf_name_alt = leaf_name.replace("-", " ") if "-" in leaf_name else None
            matching_label_ids = []
            
            # Find all labels with the leaf name owned by current user
            # Search for both original and hyphen-to-space variant
            if leaf_name_alt and leaf_name_alt != leaf_name:
                candidate_labels = db.query(Label).filter(
                    Label.owner_id == current_user.id,
                    or_(Label.name.ilike(leaf_name), Label.name.ilike(leaf_name_alt))
                ).all()
            else:
                candidate_labels = db.query(Label).filter(
                    Label.owner_id == current_user.id,
                    Label.name.ilike(leaf_name)
                ).all()
            
            logger.debug(f"Label search: leaf_name={leaf_name}, leaf_name_alt={leaf_name_alt}, candidates={[(l.id, l.name, l.parent_id) for l in candidate_labels]}")
            
            for label in candidate_labels:
                # Verify the parent chain matches by re-querying each parent
                # (lazy="joined" only loads one level)
                current_id = label.id
                parts_to_check = list(reversed(label_parts))  # Start from leaf
                match = True
                
                for i, part in enumerate(parts_to_check):
                    current_label = db.query(Label).filter(Label.id == current_id).first() if current_id else None
                    if current_label is None:
                        match = False
                        break
                    # Check both original part and hyphen-to-space variant
                    part_alt = part.replace("-", " ")
                    if current_label.name.lower() != part.lower() and current_label.name.lower() != part_alt.lower():
                        match = False
                        break
                    current_id = current_label.parent_id
                
                # All parts matched and we've consumed the whole path (no more parents)
                if match and current_id is None:
                    matching_label_ids.append(label.id)
            
            logger.debug(f"Label search: matching_label_ids={matching_label_ids}")
            
            if matching_label_ids:
                # Labels are user-specific on shared threads - filter by user_id
                query = query.join(Thread, Email.thread_id == Thread.id).join(
                    ThreadLabel, Thread.id == ThreadLabel.thread_id
                ).filter(
                    ThreadLabel.label_id.in_(matching_label_ids),
                    ThreadLabel.user_id == current_user.id
                )
            else:
                # No matching hierarchical label found - return empty
                query = query.filter(False)
        else:
            # Simple label name - use partial match
            # Try both original and hyphen-to-space variant
            label_name_alt = label_name.replace("-", " ") if "-" in label_name else None
            if label_name_alt and label_name_alt != label_name:
                label_subq = db.query(Label.id).filter(
                    Label.owner_id == current_user.id,
                    or_(Label.name.ilike(f"%{label_name}%"), Label.name.ilike(f"%{label_name_alt}%"))
                ).scalar_subquery()
            else:
                label_subq = db.query(Label.id).filter(
                    Label.owner_id == current_user.id,
                    Label.name.ilike(f"%{label_name}%")
                ).scalar_subquery()
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
        if is_important:
            # Filter for important threads - get thread IDs marked as important by this user
            important_thread_ids = get_user_important_thread_ids(db, current_user.id)
            query = query.filter(Email.thread_id.in_(important_thread_ids))
        else:
            # Filter for non-important threads - exclude threads marked as important
            important_thread_ids = get_user_important_thread_ids(db, current_user.id)
            query = query.filter(
                or_(
                    Email.thread_id.is_(None),
                    ~Email.thread_id.in_(important_thread_ids)
                )
            )
    
    if has_attachment:
        att_subq = db.query(Attachment.email_id).distinct().scalar_subquery()
        query = query.filter(Email.id.in_(att_subq))
    
    # Apply date filters - prefer datetime objects from q parsing (with tz_offset), fall back to string params
    # Use received_at > sent_at > created_at fallback for date filtering
    date_field = func.coalesce(Email.received_at, Email.sent_at, Email.created_at)

    if _date_from_dt:
        # Datetime from q parsing (with tz_offset applied)
        query = query.filter(date_field >= _date_from_dt)
    elif date_from:
        # Explicit string param (treated as UTC)
        try:
            dt = datetime.strptime(date_from, '%Y-%m-%d')
            query = query.filter(date_field >= dt)
        except ValueError:
            pass

    if _date_to_dt:
        # Datetime from q parsing (with tz_offset applied)
        # Add 1 day to include the full end date
        query = query.filter(date_field < _date_to_dt + timedelta(days=1))
    elif date_to:
        # Explicit string param (treated as UTC)
        # Add 1 day to include the full end date (e.g., 2026-03-26 includes all of March 26)
        try:
            dt = datetime.strptime(date_to, '%Y-%m-%d') + timedelta(days=1)
            query = query.filter(date_field < dt)
        except ValueError:
            pass
    
    
    # Hasnot / Exclusions - exclude emails containing these terms
    if hasnot:
        exclusions.append(hasnot)
    if exclusions:
        for term in exclusions:
            query = query.filter(
                and_(
                    ~Email.subject.ilike(f"%{term}%"),
                    ~Email.body.ilike(f"%{term}%")
                )
            )
    
    # Exact phrases - match exact phrases in subject or body
    if exact_phrases:
        for phrase in exact_phrases:
            query = query.filter(
                or_(
                    Email.subject.ilike(f"%{phrase}%"),
                    Email.body.ilike(f"%{phrase}%")
                )
            )
    
    # Exact matches (+word) - exact word match
    if exact_matches:
        for term in exact_matches:
            # Use word boundaries for exact match
            query = query.filter(
                or_(
                    Email.subject.op('~*')(f'\\m{term}\\M'),
                    Email.body.op('~*')(f'\\m{term}\\M')
                )
            )
    
    # OR groups - match any of the terms in each group
    if or_groups:
        for group in or_groups:
            or_conditions = []
            for term in group:
                or_conditions.append(Email.subject.ilike(f"%{term}%"))
                or_conditions.append(Email.body.ilike(f"%{term}%"))
            if or_conditions:
                query = query.filter(or_(*or_conditions))
    
    # Grouped terms - e.g., subject:(dinner movie)
    # "me" keyword supported in from/to operators
    if grouped_terms:
        for operator, terms in grouped_terms.items():
            if operator == 'subject':
                subject_conditions = [Email.subject.ilike(f"%{t}%") for t in terms]
                query = query.filter(or_(*subject_conditions))
            elif operator == 'from':
                # Prioritizes name match (partial) over email match (exact)
                if not from_email:  # Only if not already filtered
                    query = query.join(User, Email.sender_id == User.id)
                from_conditions = []
                for t in terms:
                    if is_me_keyword(t):
                        # "me" = current user
                        from_conditions.append(Email.sender_id == current_user.id)
                    else:
                        # Name matching - partial/fuzzy (prioritized)
                        from_conditions.append(User.first_name.ilike(f"%{t}%"))
                        from_conditions.append(User.last_name.ilike(f"%{t}%"))
                        # Email matching - exact (case-insensitive)
                        from_conditions.append(User.email.ilike(t))
                query = query.filter(or_(*from_conditions))
            elif operator == 'to':
                # Prioritizes name match (partial) over email match (exact)
                to_conditions = []
                for t in terms:
                    if is_me_keyword(t):
                        # "me" = current user as recipient
                        to_conditions.append(EmailRecipient.recipient_id == current_user.id)
                    else:
                        # Name matching - partial/fuzzy (prioritized)
                        to_conditions.append(EmailRecipient.recipient_name.ilike(f"%{t}%"))
                        # Email matching - exact (case-insensitive)
                        to_conditions.append(EmailRecipient.recipient_email.ilike(t))
                query = query.filter(or_(*to_conditions))
    
    # CC filter - prioritizes name match (partial) over email match (exact)
    # "me" keyword matches the current user
    if cc:
        cc_emails = [e.strip() for e in cc.split(',') if e.strip()]
        if cc_emails:
            cc_conditions = []
            for e in cc_emails:
                if is_me_keyword(e):
                    # "me" = current user as CC recipient
                    cc_conditions.append(EmailRecipient.recipient_id == current_user.id)
                else:
                    # Name matching - partial/fuzzy (prioritized)
                    cc_conditions.append(EmailRecipient.recipient_name.ilike(f"%{e}%"))
                    # Email matching - exact (case-insensitive)
                    cc_conditions.append(EmailRecipient.recipient_email.ilike(e))
            cc_subq = db.query(EmailRecipient.email_id).filter(
                EmailRecipient.recipient_type == 'cc',
                or_(*cc_conditions)
            ).distinct().scalar_subquery()
            query = query.filter(Email.id.in_(cc_subq))
    
    # BCC filter - prioritizes name match (partial) over email match (exact)
    # "me" keyword matches the current user
    if bcc:
        bcc_emails = [e.strip() for e in bcc.split(',') if e.strip()]
        if bcc_emails:
            bcc_conditions = []
            for e in bcc_emails:
                if is_me_keyword(e):
                    # "me" = current user as BCC recipient
                    bcc_conditions.append(EmailRecipient.recipient_id == current_user.id)
                else:
                    # Name matching - partial/fuzzy (prioritized)
                    bcc_conditions.append(EmailRecipient.recipient_name.ilike(f"%{e}%"))
                    # Email matching - exact (case-insensitive)
                    bcc_conditions.append(EmailRecipient.recipient_email.ilike(e))
            bcc_subq = db.query(EmailRecipient.email_id).filter(
                EmailRecipient.recipient_type == 'bcc',
                or_(*bcc_conditions)
            ).distinct().scalar_subquery()
            query = query.filter(Email.id.in_(bcc_subq))
    
    # Size filters - filter by total attachment size
    if size is not None or size_larger is not None or size_smaller is not None:
        # Subquery to get total attachment size per email
        size_subq = db.query(
            Attachment.email_id,
            func.coalesce(func.sum(Attachment.size_bytes), 0).label('total_size')
        ).group_by(Attachment.email_id).subquery()
        
        query = query.outerjoin(size_subq, Email.id == size_subq.c.email_id)
        
        if size is not None:
            query = query.filter(func.coalesce(size_subq.c.total_size, 0) == size)
        if size_larger is not None:
            # Strictly greater than (Gmail-style "larger:" operator)
            query = query.filter(func.coalesce(size_subq.c.total_size, 0) > size_larger)
        if size_smaller is not None:
            # Strictly less than (Gmail-style "smaller:" operator)
            query = query.filter(func.coalesce(size_subq.c.total_size, 0) < size_smaller)
    
    # Filename filter - filter by attachment filename
    if filename:
        filename_subq = db.query(Attachment.email_id).filter(
            Attachment.filename.ilike(f"%{filename}%")
        ).distinct().scalar_subquery()
        query = query.filter(Email.id.in_(filename_subq))
    
    # Category filter - filter by category label (is_system=True, is_exclusive=False)
    if category:
        if category.lower() in VALID_EMAIL_CATEGORIES:
            from app.utils.label_utils import CATEGORY_TO_LABEL
            from app.core.constants import EmailCategory, CategoryLabel
            
            try:
                category_enum = EmailCategory(category.lower())
                
                if category_enum == EmailCategory.PRIMARY:
                    # PRIMARY = emails in threads WITHOUT any category label
                    category_label_ids = db.query(Label.id).filter(
                        Label.owner_id == current_user.id,
                        Label.is_system == True,
                        Label.is_exclusive == False,
                        Label.name.in_([cl.value for cl in CategoryLabel])
                    ).subquery()
                    
                    threads_with_category = db.query(ThreadLabel.thread_id).filter(
                        ThreadLabel.label_id.in_(db.query(category_label_ids.c.id)),
                        ThreadLabel.user_id == current_user.id
                    ).subquery()
                    
                    query = query.filter(~Email.thread_id.in_(db.query(threads_with_category.c.thread_id)))
                else:
                    # Other categories - filter by specific label
                    category_label_enum = CATEGORY_TO_LABEL.get(category_enum)
                    if category_label_enum:
                        category_label = db.query(Label).filter(
                            Label.owner_id == current_user.id,
                            Label.name == category_label_enum.value,
                            Label.is_system == True,
                            Label.is_exclusive == False
                        ).first()
                        
                        if category_label:
                            labeled_thread_ids = db.query(ThreadLabel.thread_id).filter(
                                ThreadLabel.label_id == category_label.id,
                                ThreadLabel.user_id == current_user.id
                            ).subquery()
                            query = query.filter(Email.thread_id.in_(db.query(labeled_thread_ids.c.thread_id)))
            except ValueError:
                pass
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category. Must be one of: {', '.join(VALID_EMAIL_CATEGORIES)}"
            )
    
    # Deliveredto filter - filter by recipient email
    if deliveredto:
        deliveredto_subq = db.query(EmailRecipient.email_id).filter(
            EmailRecipient.recipient_email.ilike(f"%{deliveredto}%")
        ).distinct().scalar_subquery()
        query = query.filter(Email.id.in_(deliveredto_subq))
    
    # Is snoozed filter - filter by snooze status in thread metadata
    if is_snoozed is not None:
        snoozed_thread_subq = db.query(ThreadUserMetadata.thread_id).filter(
            ThreadUserMetadata.user_id == current_user.id,
            ThreadUserMetadata.snooze_until.isnot(None)
        ).scalar_subquery()
        
        if is_snoozed:
            query = query.filter(Email.thread_id.in_(snoozed_thread_subq))
        else:
            query = query.filter(
                or_(
                    Email.thread_id.is_(None),
                    ~Email.thread_id.in_(snoozed_thread_subq)
                )
            )
    
    # Has userlabels filter - filter by presence/absence of user labels
    if has_userlabels is not None:
        # Filter by user labels only (exclude system labels where is_system=True)
        labeled_thread_subq = db.query(ThreadLabel.thread_id).join(
            Label, ThreadLabel.label_id == Label.id
        ).filter(
            ThreadLabel.user_id == current_user.id,
            Label.is_system == False  # Only user-created labels
        ).distinct().scalar_subquery()
        
        if has_userlabels:
            query = query.filter(Email.thread_id.in_(labeled_thread_subq))
        else:
            query = query.filter(
                or_(
                    Email.thread_id.is_(None),
                    ~Email.thread_id.in_(labeled_thread_subq)
                )
            )
    
    # In archive filter - filter for archived threads
    if in_archive is not None:
        archived_thread_subq = db.query(ThreadUserMetadata.thread_id).filter(
            ThreadUserMetadata.user_id == current_user.id,
            ThreadUserMetadata.is_archived == True
        ).scalar_subquery()
        
        if in_archive:
            query = query.filter(Email.thread_id.in_(archived_thread_subq))
        else:
            query = query.filter(
                or_(
                    Email.thread_id.is_(None),
                    ~Email.thread_id.in_(archived_thread_subq)
                )
            )
    
    # First, get distinct email IDs that match the filters
    filtered_email_ids = [eid[0] for eid in query.with_entities(Email.id).distinct().all()]
    
    if not filtered_email_ids:
        # Save search query in background even for empty results
        if q:
            token_data = require_token_data(request)
            background_tasks.add_task(
                save_search_query_background,
                user_id=current_user.id,
                query=q,
                run_id=token_data.run_id
            )
        
        # No matching emails - return empty result
        return PaginatedListResponse[EmailListResponse](
            results=[],
            total=0,
            page=page,
            page_size=page_size,
            total_pages=0,
        )
    
    # Apply threaded grouping - return only latest email from each thread
    # Use received_at > sent_at > created_at for sorting (first non-null wins)
    sort_date = func.coalesce(Email.received_at, Email.sent_at, Email.created_at)
    
    # Step 1: Get max dates per thread for the filtered emails
    max_dates = db.query(
        Email.thread_id,
        func.max(sort_date).label("max_date")
    ).filter(
        Email.id.in_(filtered_email_ids),
        Email.thread_id.isnot(None)
    ).group_by(Email.thread_id).subquery()
    
    # Step 2: Get email IDs that are the latest in their thread
    # When multiple emails have the same max date, use max(id::text) as a tiebreaker
    # to ensure only one email is returned per thread (PostgreSQL doesn't support MAX on UUID)
    latest_with_max_date = db.query(
        Email.thread_id,
        func.max(cast(Email.id, String)).label("latest_id_text")
    ).join(
        max_dates,
        and_(
            Email.thread_id == max_dates.c.thread_id,
            sort_date == max_dates.c.max_date
        )
    ).filter(
        Email.id.in_(filtered_email_ids)
    ).group_by(Email.thread_id).subquery()
    
    # Step 3: Build final query - latest email per thread OR emails without thread_id
    # Compare email IDs as text since that's how we stored the max
    final_query = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread).selectinload(Thread.labels),
        joinedload(Email.thread).selectinload(Thread.user_metadata),
    ).filter(
        Email.id.in_(filtered_email_ids),
        or_(
            cast(Email.id, String).in_(
                db.query(latest_with_max_date.c.latest_id_text)
            ),
            Email.thread_id.is_(None)
        )
    )
    
    # Get total count
    total = final_query.count()
    
    # Calculate pagination
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    offset = (page - 1) * page_size
    
    # Apply sorting
    if sort_by == "subject":
        order_col = Email.subject
    elif sort_by == "sender":
        order_col = Email.sender_id
    else:
        order_col = func.coalesce(Email.received_at, Email.sent_at, Email.created_at)
    
    if sort_order == "asc":
        final_query = final_query.order_by(order_col.asc())
    else:
        final_query = final_query.order_by(order_col.desc())
    
    # Get paginated results
    emails = final_query.offset(offset).limit(page_size).all()
    
    # Get thread email counts for all threads in the result set
    thread_ids = [email.thread_id for email in emails if email.thread_id]
    thread_counts = {}
    starred_thread_ids = set()
    if thread_ids:
        # Query count of emails per thread (accessible to this user from their perspective)
        count_results = db.query(
            Email.thread_id,
            func.count(Email.id).label('count')
        ).filter(
            Email.thread_id.in_(thread_ids),
            get_perspective_email_filter(db, current_user.id)
        ).group_by(Email.thread_id).all()
        
        thread_counts = {tid: cnt for tid, cnt in count_results}
        
        # Query threads that have at least one starred email (for the current user)
        starred_results = db.query(Email.thread_id).filter(
            Email.thread_id.in_(thread_ids),
            Email.is_starred == True,
            get_perspective_email_filter(db, current_user.id)
        ).distinct().all()
        starred_thread_ids = {tid for (tid,) in starred_results}
    
    # Format response with thread counts and user_id for label filtering
    emails_data = [
        format_email_list_response(
            email, 
            thread_counts.get(email.thread_id), 
            current_user.id,
            thread_is_starred=email.thread_id in starred_thread_ids if email.thread_id else email.is_starred
        )
        for email in emails
    ]
    
    # Save search query in background (only if q parameter was provided)
    if q:
        token_data = require_token_data(request)
        background_tasks.add_task(
            save_search_query_background,
            user_id=current_user.id,
            query=q,
            run_id=token_data.run_id
        )
    
    return PaginatedListResponse[EmailListResponse](
        results=emails_data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


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
        "categories": [],
        "recent_searches": [],
        "operators": []
    }
    
    # If query starts with known operator prefix, suggest completions
    if q.startswith("from:") or q.startswith("to:"):
        partial = q.split(":", 1)[1] if ":" in q else ""
        # Get contacts from emails
        contacts = db.query(User.email, User.first_name, User.last_name).filter(
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
            Label.name.ilike(f"%{partial}%")
        ).limit(limit).all()
        
        suggestions["labels"] = [
            {"value": get_label_hierarchy_name(l), "type": "label", "description": None}
            for l in labels
        ]
    
    elif q.startswith("in:"):
        partial = q.split(":", 1)[1].lower() if ":" in q else ""
        all_folders = [
            {"value": "inbox", "type": "folder", "description": "Inbox folder"},
            {"value": "sent", "type": "folder", "description": "Sent folder"},
            {"value": "drafts", "type": "folder", "description": "Drafts folder"},
            {"value": "trash", "type": "folder", "description": "Trash folder"},
            {"value": "spam", "type": "folder", "description": "Spam folder"},
            {"value": "starred", "type": "folder", "description": "Starred items"},
            {"value": "anywhere", "type": "folder", "description": "Search all folders"},
            {"value": "archive", "type": "folder", "description": "Archived messages"},
            {"value": "snoozed", "type": "folder", "description": "Snoozed messages"},
        ]
        suggestions["folders"] = [
            f for f in all_folders if partial == "" or f["value"].startswith(partial)
        ][:limit]
    
    elif q.startswith("category:"):
        partial = q.split(":", 1)[1].lower() if ":" in q else ""
        all_categories = [
            {"value": "primary", "type": "category", "description": "Primary category"},
            {"value": "social", "type": "category", "description": "Social category"},
            {"value": "promotions", "type": "category", "description": "Promotions category"},
            {"value": "updates", "type": "category", "description": "Updates category"},
            {"value": "forums", "type": "category", "description": "Forums category"},
        ]
        suggestions["categories"] = [
            c for c in all_categories if partial == "" or c["value"].startswith(partial)
        ][:limit]
    
    else:
        # General suggestions - show operators filtered by query
        q_lower = q.lower()
        all_operators = [
            {"value": "from:", "type": "operator", "description": "Search by sender"},
            {"value": "to:", "type": "operator", "description": "Search by recipient"},
            {"value": "cc:", "type": "operator", "description": "Search by CC recipient"},
            {"value": "bcc:", "type": "operator", "description": "Search by BCC recipient"},
            {"value": "subject:", "type": "operator", "description": "Search in subject"},
            {"value": "has:attachment", "type": "operator", "description": "Has attachments"},
            {"value": "has:userlabels", "type": "operator", "description": "Has user labels"},
            {"value": "is:unread", "type": "operator", "description": "Unread emails"},
            {"value": "is:starred", "type": "operator", "description": "Starred emails"},
            {"value": "is:important", "type": "operator", "description": "Important emails"},
            {"value": "in:", "type": "operator", "description": "Filter by folder"},
            {"value": "label:", "type": "operator", "description": "Filter by label"},
            {"value": "category:", "type": "operator", "description": "Filter by category"},
            {"value": "filename:", "type": "operator", "description": "Filter by attachment name"},
            {"value": "size:", "type": "operator", "description": "Filter by size (e.g., size:10M)"},
            {"value": "larger:", "type": "operator", "description": "Larger than size"},
            {"value": "smaller:", "type": "operator", "description": "Smaller than size"},
            {"value": "deliveredto:", "type": "operator", "description": "Delivered to address"},
        ]
        # Filter operators that start with user input
        suggestions["operators"] = [
            op for op in all_operators if q_lower == "" or op["value"].startswith(q_lower)
        ][:limit]
        
        # Get recent searches filtered by query
        recent_query = db.query(SavedSearch).filter(
            SavedSearch.owner_id == current_user.id
        )
        if q:
            recent_query = recent_query.filter(SavedSearch.query.ilike(f"%{q}%"))
        recent = recent_query.order_by(SavedSearch.last_used_at.desc().nulls_last()).limit(5).all()
        
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
        SavedSearch.owner_id == current_user.id
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
) -> None:
    """Delete a saved search.
    Args:
        search_id: ID of the saved search to delete.
    Permissions:
    - Users can only delete their own saved searches
    """
    current_user = auth.user
    
    saved = db.query(SavedSearch).filter(
        SavedSearch.id == search_id,
        SavedSearch.owner_id == current_user.id
    ).first()
    
    if not saved:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Saved search {search_id} not found"
        )

    # Permanently delete from database
    db.delete(saved)
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Saved search {search_id} permanently deleted by user {current_user.id}")
