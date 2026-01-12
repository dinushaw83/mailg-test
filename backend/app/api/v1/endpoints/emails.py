"""Email CRUD and operations endpoints.

This module provides:
- Full CRUD operations for emails
- Send, reply, forward operations
- Read/star/move actions
- Label management for emails
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, or_, and_
from typing import Optional
from datetime import datetime
from uuid import UUID
import logging

from app.db.session import get_db
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.models.label import Label
from app.models.thread_label import ThreadLabel
from app.models.thread import Thread
from app.models.user import User
from app.schemas.email import (
    EmailCreate, EmailImportantUpdate, EmailUpdate, EmailResponse, EmailListResponse,
    EmailReadUpdate, EmailStarUpdate, EmailMoveRequest, EmailLabelRequest,
    EmailReplyRequest, EmailForwardRequest, EmailSnoozeRequest,
    EmailCategoryUpdate, EmailCategoryCountsResponse, EmailSendRequest
)
from app.schemas.pagination import PaginatedListResponse
from app.auth.rbac import authorized
from app.auth.dependencies import auth
from app.core.constants import (
    VALID_RECIPIENT_TYPES, VALID_EMAIL_CATEGORIES,
    VALID_FOLDER_TYPES, EmailStatus, FolderType, EmailCategory, SystemLabel
)
from app.utils.label_utils import (
    add_system_label_to_thread,
    remove_system_label_from_thread,
    replace_exclusive_labels,
    add_category_label_to_thread,
    sync_category_labels,
)
from app.utils.email_utils import (
    format_email_response,
    format_email_list_response,
    mark_emails_as_read_background,
    deliver_email_to_recipients_background,
    FOLDER_TO_LABEL,
)
from app.utils.thread_metadata_utils import (
    mark_thread_important,
    get_user_important_thread_ids,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/emails", response_model=EmailResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(authorized())])
def create_email(
    email_data: EmailCreate,
    db: Session = Depends(get_db),
) -> dict:
    """Create a new draft email.
    
    This endpoint only creates drafts. Use POST /emails/{id}/send to send the email
    (either immediately or scheduled for a specific time).
    
    Permissions:
    - All authenticated users can create emails
    """
    current_user = auth.user
    
    # Validate recipients
    for recipient in email_data.recipients:
        if recipient.type not in VALID_RECIPIENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid recipient type. Must be one of: {', '.join(VALID_RECIPIENT_TYPES)}"
            )
    
    try:
        # Create a new thread for this email (new conversation)
        thread = Thread(
            subject=email_data.subject or "(No Subject)",
            owner_id=current_user.id,
            participant_count=len(email_data.recipients) + 1,
            email_count=1,
            last_email_at=datetime.utcnow(),
        )
        db.add(thread)
        db.flush()  # Get thread ID
        
        # Create draft email
        email = Email(
            subject=email_data.subject,
            body=email_data.body,
            html_body=email_data.html_body,
            status=EmailStatus.DRAFT.value,
            folder=FolderType.DRAFTS.value,
            sender_id=current_user.id,
            thread_id=thread.id,
            is_read=True,  # Sender has read their own email
        )
        db.add(email)
        db.flush()  # Get email ID
        
        # Create recipients
        for recipient in email_data.recipients:
            # Try to find user by email
            recipient_user = db.query(User).filter(
                User.email == recipient.email
            ).first()
            
            email_recipient = EmailRecipient(
                email_id=email.id,
                recipient_id=recipient_user.id if recipient_user else None,
                recipient_email=recipient.email,
                recipient_name=recipient.name or (recipient_user.name if recipient_user else None),
                recipient_type=recipient.type,
            )
            db.add(email_recipient)
        
        db.commit()
        db.refresh(email)
        
        # Add Drafts label to the thread
        add_system_label_to_thread(db, email.thread_id, current_user.id, SystemLabel.DRAFTS)
        db.commit()
        
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Draft email {email.id} created by user {current_user.id}")
    
    return format_email_response(email, current_user.id)


@router.get("/emails", response_model=PaginatedListResponse[EmailListResponse], dependencies=[Depends(authorized())])
def list_emails(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    folder: Optional[FolderType] = Query(None, description="Filter by folder"),
    thread_id: Optional[UUID] = Query(None, description="Filter by thread ID to get all emails in a conversation"),
    category: Optional[EmailCategory] = Query(None, description="Filter by category"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    is_starred: Optional[bool] = Query(None, description="Filter by starred"),
    is_snoozed: Optional[bool] = Query(None, description="Filter by snoozed status (True=snoozed, False=not snoozed)"),
    is_important: Optional[bool] = Query(None, description="Filter by important"),
    include_archived: Optional[bool] = Query(False, description="Include archived threads"),
    search: Optional[str] = Query(None, description="Search in subject and body"),
) -> dict:
    """List emails with pagination and filtering.
    
    Permissions:
    - Users can only see their own emails (sent or received)
    """
    current_user = auth.user
    
    # Base query with eager loading
    query = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    )
    
    # Apply folder filter with proper sender/recipient context
    if folder:
        if folder == FolderType.INBOX:
            # INBOX: Show threads that have the INBOX label for this user
            # This allows removing INBOX label to hide from inbox (like archive)
            from app.utils.label_utils import get_system_label
            inbox_label = get_system_label(db, current_user.id, SystemLabel.INBOX)
            
            if inbox_label:
                # Filter to threads with INBOX label
                inbox_thread_ids = db.query(ThreadLabel.thread_id).filter(
                    ThreadLabel.label_id == inbox_label.id,
                    ThreadLabel.user_id == current_user.id
                ).subquery()
                
                query = query.filter(
                    Email.thread_id.in_(db.query(inbox_thread_ids.c.thread_id)),
                    or_(
                        Email.sender_id == current_user.id,
                        Email.id.in_(
                            db.query(EmailRecipient.email_id).filter(
                                EmailRecipient.recipient_id == current_user.id
                            )
                        )
                    )
                )
            else:
                # Fallback if no inbox label found - show all user's emails
                query = query.filter(
                    or_(
                        Email.sender_id == current_user.id,
                        Email.id.in_(
                            db.query(EmailRecipient.email_id).filter(
                                EmailRecipient.recipient_id == current_user.id
                            )
                        )
                    )
                )
            # Threaded grouping applied automatically at end
        elif folder == FolderType.SENT:
            # SENT: Show latest email sent BY current user per thread
            query = query.filter(
                Email.sender_id == current_user.id,
                Email.folder == FolderType.SENT.value
            )
            # Threaded grouping applied automatically at end
        elif folder == FolderType.SCHEDULED:
            # SCHEDULED: Show latest scheduled email per thread (user is sender)
            query = query.filter(
                Email.sender_id == current_user.id,
                Email.folder == FolderType.SCHEDULED.value
            )
            # Threaded grouping applied automatically at end
        elif folder == FolderType.DRAFTS:
            # DRAFTS: Show latest draft per thread (user is sender)
            query = query.filter(
                Email.sender_id == current_user.id,
                Email.folder == FolderType.DRAFTS.value
            )
            # Threaded grouping applied automatically at end
        elif folder == FolderType.TRASH:
            # TRASH: Show emails in trash folder
            query = query.filter(
                Email.folder == FolderType.TRASH.value,
                or_(
                    Email.sender_id == current_user.id,
                    Email.id.in_(
                        db.query(EmailRecipient.email_id).filter(
                            EmailRecipient.recipient_id == current_user.id
                        )
                    )
                )
            )
        elif folder == FolderType.SPAM:
            # SPAM: Show emails in spam folder (similar to trash)
            query = query.filter(
                Email.folder == FolderType.SPAM.value,
                or_(
                    Email.sender_id == current_user.id,
                    Email.id.in_(
                        db.query(EmailRecipient.email_id).filter(
                            EmailRecipient.recipient_id == current_user.id
                        )
                    )
                )
            )
        else:
            # Other folders - show emails where user is sender or recipient
            query = query.filter(Email.folder == folder.value)
            query = query.filter(
                or_(
                    Email.sender_id == current_user.id,
                    Email.id.in_(
                        db.query(EmailRecipient.email_id).filter(
                            EmailRecipient.recipient_id == current_user.id
                        )
                    )
                )
            )
    else:
        # No folder filter - show all user's emails (sent or received)
        query = query.filter(
            or_(
                Email.sender_id == current_user.id,
                Email.id.in_(
                    db.query(EmailRecipient.email_id).filter(
                        EmailRecipient.recipient_id == current_user.id
                    )
                )
            )
        )
    
    if thread_id:
        query = query.filter(Email.thread_id == thread_id)
    
    if category:
        query = query.filter(Email.category == category.value)
    
    if is_read is not None:
        query = query.filter(Email.is_read == is_read)
    
    if is_starred is not None:
        if is_starred:
            # STARRED: Find threads where ANY email is starred, then show latest email
            starred_thread_ids = db.query(Email.thread_id).filter(
                Email.is_starred == True,
                or_(
                    Email.sender_id == current_user.id,
                    Email.id.in_(
                        db.query(EmailRecipient.email_id).filter(
                            EmailRecipient.recipient_id == current_user.id
                        )
                    )
                )
            ).distinct().subquery()
            
            query = query.filter(Email.thread_id.in_(db.query(starred_thread_ids.c.thread_id)))
            # Threaded grouping applied automatically at end - returns latest per thread
        else:
            # No starred emails - exclude threads with any starred
            query = query.filter(Email.is_starred == False)
    
    if is_snoozed is not None:
        from app.models.thread_user_metadata import ThreadUserMetadata
        if is_snoozed:
            # SNOOZED: Filter by ThreadUserMetadata.snooze_until (thread-level per user)
            snoozed_thread_ids = db.query(ThreadUserMetadata.thread_id).filter(
                ThreadUserMetadata.user_id == current_user.id,
                ThreadUserMetadata.snooze_until.isnot(None),
                ThreadUserMetadata.snooze_until > datetime.utcnow()
            ).subquery()
            
            query = query.filter(Email.thread_id.in_(db.query(snoozed_thread_ids.c.thread_id)))
            # Threaded grouping applied automatically at end - returns latest per thread
        else:
            # Non-snoozed: exclude threads with active snooze for this user
            snoozed_thread_ids = db.query(ThreadUserMetadata.thread_id).filter(
                ThreadUserMetadata.user_id == current_user.id,
                ThreadUserMetadata.snooze_until.isnot(None),
                ThreadUserMetadata.snooze_until > datetime.utcnow()
            ).subquery()
            
            query = query.filter(
                or_(
                    Email.thread_id.is_(None),
                    ~Email.thread_id.in_(db.query(snoozed_thread_ids.c.thread_id))
                )
            )
    
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
    
    if include_archived is False:
        # Exclude threads archived by this user (thread-level)
        from app.models.thread_user_metadata import ThreadUserMetadata
        archived_thread_ids = db.query(ThreadUserMetadata.thread_id).filter(
            ThreadUserMetadata.user_id == current_user.id,
            ThreadUserMetadata.is_archived == True
        ).subquery()
        
        query = query.filter(
            or_(
                Email.thread_id.is_(None),
                ~Email.thread_id.in_(db.query(archived_thread_ids.c.thread_id))
            )
        )
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Email.subject.ilike(search_term),
                Email.body.ilike(search_term)
            )
        )
    
    # ALWAYS apply threaded grouping - return only latest email from each thread
    # Use sent_at for sorting, fallback to created_at if null
    sort_date = func.coalesce(Email.sent_at, Email.created_at)
    
    # Step 1: Get max dates per thread from the filtered query
    max_dates = query.filter(
        Email.thread_id.isnot(None)
    ).with_entities(
        Email.thread_id,
        func.max(sort_date).label("max_date")
    ).group_by(Email.thread_id).subquery()
    
    # Step 2: Get email IDs that are the latest in their thread
    # Use explicit join to avoid cross-join performance issues
    latest_email_ids = db.query(Email.id).join(
        max_dates,
        and_(
            Email.thread_id == max_dates.c.thread_id,
            sort_date == max_dates.c.max_date
        )
    ).subquery()
    
    # Step 3: Filter main query using IN clause
    # Include: latest email per thread OR emails without thread_id
    query = query.filter(
        or_(
            Email.id.in_(db.query(latest_email_ids.c.id)),
            Email.thread_id.is_(None)
        )
    )
    
    # Get total count (always use threaded count method)
    total = db.query(func.count()).select_from(query.with_entities(Email.id).subquery()).scalar()
    
    # Calculate pagination
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    offset = (page - 1) * page_size
    
    # Get results - always sort by sent_at
    emails = query.order_by(func.coalesce(Email.sent_at, Email.created_at).desc()).offset(offset).limit(page_size).all()
    
    # Get thread email counts for all threads in the result set
    thread_ids = [email.thread_id for email in emails if email.thread_id]
    thread_counts = {}
    if thread_ids:
        # Query count of emails per thread (accessible to this user)
        count_results = db.query(
            Email.thread_id,
            func.count(Email.id).label('count')
        ).filter(
            Email.thread_id.in_(thread_ids),
            or_(
                Email.sender_id == current_user.id,
                Email.id.in_(
                    db.query(EmailRecipient.email_id).filter(
                        EmailRecipient.recipient_id == current_user.id
                    )
                )
            )
        ).group_by(Email.thread_id).all()
        
        thread_counts = {tid: cnt for tid, cnt in count_results}
    
    # Format response with thread counts and user_id for label filtering
    emails_data = [
        format_email_list_response(email, thread_counts.get(email.thread_id), current_user.id)
        for email in emails
    ]
    
    return PaginatedListResponse[EmailListResponse](
        results=emails_data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/emails/{email_id}", response_model=EmailResponse, dependencies=[Depends(authorized())])
def get_email(
    email_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Get a specific email by ID.
    
    Permissions:
    - Users can only access their own emails
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    ).filter(
        Email.id == email_id
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    is_sender = email.sender_id == current_user.id
    is_recipient = any(r.recipient_id == current_user.id for r in email.recipients)
    is_admin = current_user.role == "admin"
    
    if not (is_sender or is_recipient or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    return format_email_response(email, current_user.id)


@router.put("/emails/{email_id}", response_model=EmailResponse, dependencies=[Depends(authorized())])
def update_email(
    email_id: UUID,
    email_data: EmailUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """Update an email (draft only for content changes).
    
    Permissions:
    - Users can only update their own drafts
    """
    current_user = auth.user
    
    email = db.query(Email).filter(
        Email.id == email_id
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    if email.sender_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this email"
        )
    
    # Only drafts can be updated
    if email.status != EmailStatus.DRAFT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft emails can be updated"
        )
    
    update_data = email_data.model_dump(exclude_unset=True)
    
    # Handle recipients update separately
    recipients_data = update_data.pop("recipients", None)
    
    # Apply updates for simple fields
    for field, value in update_data.items():
        setattr(email, field, value)
    
    # Update recipients if provided
    if recipients_data is not None:
        # Delete existing recipients
        db.query(EmailRecipient).filter(EmailRecipient.email_id == email.id).delete()
        
        # Add new recipients
        for recipient in recipients_data:
            recipient_user = db.query(User).filter(
                User.email == recipient["email"]
            ).first()
            
            email_recipient = EmailRecipient(
                email_id=email.id,
                recipient_id=recipient_user.id if recipient_user else None,
                recipient_email=recipient["email"],
                recipient_name=recipient.get("name") or (recipient_user.name if recipient_user else None),
                recipient_type=recipient["type"],
            )
            db.add(email_recipient)
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} updated by user {current_user.id}")
    
    return format_email_response(email, current_user.id)


@router.delete("/emails/{email_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(authorized())])
def delete_email(
    email_id: UUID,
    db: Session = Depends(get_db),
    permanent: bool = Query(False, description="Permanently delete from database"),
) -> None:
    """Delete an email.

    Delete behavior:
    - If permanent=False (default): Moves email to trash folder
    - If permanent=True: Permanently removes email from database

    To permanently delete an email from trash, call this endpoint with permanent=True.

    Permissions:
    - Users can only delete their own emails (sent or received)
    - Admins can delete any email
    """
    current_user = auth.user

    email = db.query(Email).filter(
        Email.id == email_id
    ).first()

    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )

    # Check ownership
    if email.sender_id != current_user.id and current_user.role != "admin":
        is_recipient = db.query(EmailRecipient).filter(
            EmailRecipient.email_id == email_id,
            EmailRecipient.recipient_id == current_user.id
        ).first()
        if not is_recipient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Email {email_id} not found"
            )

    if permanent:
        # Permanently delete from database
        db.delete(email)
    else:
        # Move to trash folder
        email.folder = FolderType.TRASH.value

        # Update thread label to trash
        if email.thread_id:
            replace_exclusive_labels(db, email.thread_id, current_user.id, SystemLabel.TRASH)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    logger.info(f"Email {email.id} {'permanently ' if permanent else 'moved to trash and '}deleted by user {current_user.id}")


@router.post("/emails/{email_id}/send", response_model=EmailResponse, dependencies=[Depends(authorized())])
def send_email(
    email_id: UUID,
    background_tasks: BackgroundTasks,
    request_obj: Request,
    request: Optional[EmailSendRequest] = None,
    db: Session = Depends(get_db),
) -> dict:
    """Send a draft email.

    If scheduled_send_at is provided in the request body, the email will be
    scheduled for that specific time, overriding the user's undo_send_delay_seconds.

    If scheduled_send_at is not provided:
    - If the user has undo_send_delay_seconds > 0 configured, the email will be
      queued with a scheduled send time. During this window, the user can cancel
      the send using the /emails/{email_id}/cancel-send endpoint.
    - If undo_send_delay_seconds is 0 or not set, the email is sent immediately.

    Email delivery to recipients is processed in the background for better performance.
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        selectinload(Email.recipients),
    ).filter(
        Email.id == email_id,
        Email.sender_id == current_user.id
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    if email.status != EmailStatus.DRAFT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft emails can be sent"
        )
    
    if not email.recipients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email must have at least one recipient"
        )
    
    # Check if a specific scheduled_send_at was provided
    scheduled_send_at = request.scheduled_send_at if request else None
    
    if scheduled_send_at:
        # Explicit scheduled send time provided - override user's undo delay
        if scheduled_send_at <= datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="scheduled_send_at must be in the future"
            )
        
        email.status = EmailStatus.QUEUED.value
        email.scheduled_send_at = scheduled_send_at
        email.folder = FolderType.SCHEDULED.value
        
        # Update labels: Remove Drafts, add Scheduled
        remove_system_label_from_thread(db, email.thread_id, current_user.id, SystemLabel.DRAFTS)
        add_system_label_to_thread(db, email.thread_id, current_user.id, SystemLabel.SCHEDULED)
        
        try:
            db.commit()
            db.refresh(email)
        except Exception:
            db.rollback()
            raise
        
        logger.info(f"Email {email.id} scheduled for {scheduled_send_at} by user {current_user.id}")
        return format_email_response(email, current_user.id)
    
    # No explicit scheduled time - use user's undo send delay preference
    undo_delay = current_user.undo_send_delay_seconds or 0
    
    # Clamp to valid range (0 = disabled, 5-30 seconds)
    if undo_delay > 0:
        undo_delay = max(5, min(30, undo_delay))
    
    if undo_delay > 0:
        # Queue the email with scheduled send time (undo send enabled)
        from datetime import timedelta
        email.status = EmailStatus.QUEUED.value
        email.scheduled_send_at = datetime.utcnow() + timedelta(seconds=undo_delay)
        email.folder = FolderType.SCHEDULED.value
        
        # Update labels: Remove Drafts, add Scheduled
        remove_system_label_from_thread(db, email.thread_id, current_user.id, SystemLabel.DRAFTS)
        add_system_label_to_thread(db, email.thread_id, current_user.id, SystemLabel.SCHEDULED)
        
        try:
            db.commit()
            db.refresh(email)
        except Exception:
            db.rollback()
            raise
        
        logger.info(f"Email {email.id} queued for send in {undo_delay}s by user {current_user.id}")
        return format_email_response(email, current_user.id)
    
    # Immediate send (undo send disabled)
    email.status = EmailStatus.SENT.value
    email.sent_at = datetime.utcnow()
    email.folder = FolderType.SENT.value

    # Update labels: Remove Drafts, add Sent + category
    remove_system_label_from_thread(db, email.thread_id, current_user.id, SystemLabel.DRAFTS)
    add_system_label_to_thread(db, email.thread_id, current_user.id, SystemLabel.SENT)
    if email.category:
        add_category_label_to_thread(db, email.thread_id, current_user.id, EmailCategory(email.category))

    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise

    # Create received copies for recipients in background
    run_id = getattr(request_obj.state, "run_id", None)
    background_tasks.add_task(
        deliver_email_to_recipients_background,
        email.id,
        current_user.id,
        run_id
    )

    logger.info(f"Email {email.id} sent by user {current_user.id}")

    return format_email_response(email, current_user.id)


@router.post("/emails/{email_id}/cancel-send", response_model=EmailResponse, dependencies=[Depends(authorized())])
def cancel_send(
    email_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Cancel a queued email before it's sent (undo send).
    
    Only works for emails in 'queued' status before their scheduled_send_at time.
    The email will be moved back to draft status so it can be edited or re-sent.
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread).selectinload(Thread.labels),
    ).filter(
        Email.id == email_id,
        Email.sender_id == current_user.id
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    if email.status != EmailStatus.QUEUED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only queued emails can be cancelled. This email has already been sent."
        )
    
    # Check if still within the undo window
    if email.scheduled_send_at and email.scheduled_send_at <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Undo window has expired. The email has been sent."
        )
    
    # Move back to drafts
    email.status = EmailStatus.DRAFT.value
    email.scheduled_send_at = None
    email.folder = FolderType.DRAFTS.value
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} send cancelled (undo send) by user {current_user.id}")
    
    return format_email_response(email, current_user.id)


@router.post("/emails/{email_id}/confirm-send", response_model=EmailResponse, dependencies=[Depends(authorized())])
def confirm_send(
    email_id: UUID,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Immediately send a queued email without waiting for the scheduled time.

    Use this if you want to skip the undo send waiting period.
    Email delivery to recipients is processed in the background for better performance.
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread).selectinload(Thread.labels),
    ).filter(
        Email.id == email_id,
        Email.sender_id == current_user.id
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    if email.status != EmailStatus.QUEUED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only queued emails can be confirmed for immediate send"
        )
    
    # Send immediately
    email.status = EmailStatus.SENT.value
    email.sent_at = datetime.utcnow()
    email.scheduled_send_at = None
    email.folder = FolderType.SENT.value

    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise

    # Deliver to recipients in background
    run_id = getattr(request.state, "run_id", None)
    background_tasks.add_task(
        deliver_email_to_recipients_background,
        email.id,
        current_user.id,
        run_id
    )

    logger.info(f"Email {email.id} confirmed and sent immediately by user {current_user.id}")

    return format_email_response(email, current_user.id)


@router.post("/emails/{email_id}/reply", response_model=EmailResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(authorized())])
def reply_to_email(
    email_id: UUID,
    reply_data: EmailReplyRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Reply to an email.

    Email delivery to recipients is processed in the background for better performance.
    """
    current_user = auth.user
    
    original_email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
    ).filter(
        Email.id == email_id
    ).first()
    
    if not original_email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Determine reply recipients
    recipients = []
    if reply_data.reply_all:
        # Reply to sender and all recipients
        recipients.append({
            "email": original_email.sender.email,
            "name": original_email.sender.name,
            "type": "to",
        })
        for r in original_email.recipients:
            if r.recipient_email != current_user.email:
                recipients.append({
                    "email": r.recipient_email,
                    "name": r.recipient_name,
                    "type": r.recipient_type,
                })
    else:
        # Reply to sender only
        recipients.append({
            "email": original_email.sender.email,
            "name": original_email.sender.name,
            "type": "to",
        })
    
    # Create reply subject
    subject = original_email.subject
    if not subject.lower().startswith("re:"):
        subject = f"Re: {subject}"
    
    # Get or create thread
    thread_id = original_email.thread_id
    if not thread_id:
        thread = Thread(
            subject=original_email.subject,
            owner_id=current_user.id,
            participant_count=len(recipients) + 1,
            email_count=2,
            last_email_at=datetime.utcnow(),
        )
        db.add(thread)
        db.flush()
        thread_id = thread.id
        original_email.thread_id = thread_id
    
    # Create reply email
    reply_email = Email(
        subject=subject,
        body=reply_data.body,
        html_body=reply_data.html_body,
        status=EmailStatus.SENT.value,
        folder=FolderType.SENT.value,
        sender_id=current_user.id,
        thread_id=thread_id,
        parent_email_id=email_id,
        is_read=True,
        sent_at=datetime.utcnow(),
    )

    try:
        db.add(reply_email)
        db.flush()

        # Add recipients to reply email
        for recipient in recipients:
            recipient_user = db.query(User).filter(
                User.email == recipient["email"]
            ).first()

            email_recipient = EmailRecipient(
                email_id=reply_email.id,
                recipient_id=recipient_user.id if recipient_user else None,
                recipient_email=recipient["email"],
                recipient_name=recipient["name"],
                recipient_type=recipient["type"],
            )
            db.add(email_recipient)

        # Add Sent label for sender
        add_system_label_to_thread(db, thread_id, current_user.id, SystemLabel.SENT)

        db.commit()
        db.refresh(reply_email)

    except Exception:
        db.rollback()
        raise

    # Create received copies for recipients in background
    run_id = getattr(request.state, "run_id", None)
    background_tasks.add_task(
        deliver_email_to_recipients_background,
        reply_email.id,
        current_user.id,
        run_id
    )

    logger.info(f"Reply {reply_email.id} to email {email_id} by user {current_user.id}")

    return format_email_response(reply_email, current_user.id)


@router.post("/emails/{email_id}/forward", response_model=EmailResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(authorized())])
def forward_email(
    email_id: UUID,
    forward_data: EmailForwardRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Forward an email.

    Email delivery to recipients is processed in the background for better performance.
    """
    current_user = auth.user
    
    original_email = db.query(Email).filter(
        Email.id == email_id
    ).first()
    
    if not original_email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Create forward subject
    subject = original_email.subject
    if not subject.lower().startswith("fwd:"):
        subject = f"Fwd: {subject}"
    
    # Combine bodies
    separator = "\n\n---------- Forwarded message ---------\n\n"
    body = (forward_data.body or "") + separator + (original_email.body or "")
    html_body = None
    if forward_data.html_body or original_email.html_body:
        html_body = (forward_data.html_body or "") + "<hr><p>---------- Forwarded message ---------</p>" + (original_email.html_body or "")
    
    # Create a new thread for the forwarded email
    thread = Thread(
        subject=subject,
        owner_id=current_user.id,
        participant_count=len(forward_data.recipients) + 1,
        email_count=1,
        last_email_at=datetime.utcnow(),
    )
    
    try:
        db.add(thread)
        db.flush()

        # Create forward email
        forward_email_obj = Email(
            subject=subject,
            body=body,
            html_body=html_body,
            status=EmailStatus.SENT.value,
            folder=FolderType.SENT.value,
            sender_id=current_user.id,
            thread_id=thread.id,
            parent_email_id=email_id,
            is_read=True,
            sent_at=datetime.utcnow(),
        )
        db.add(forward_email_obj)
        db.flush()

        # Add recipients to forward email
        for recipient in forward_data.recipients:
            recipient_user = db.query(User).filter(
                User.email == recipient.email
            ).first()

            email_recipient = EmailRecipient(
                email_id=forward_email_obj.id,
                recipient_id=recipient_user.id if recipient_user else None,
                recipient_email=recipient.email,
                recipient_name=recipient.name,
                recipient_type=recipient.type,
            )
            db.add(email_recipient)

        # Add Sent label for sender
        add_system_label_to_thread(db, thread.id, current_user.id, SystemLabel.SENT)

        db.commit()
        db.refresh(forward_email_obj)

    except Exception:
        db.rollback()
        raise

    # Create received copies for recipients in background
    run_id = getattr(request.state, "run_id", None)
    background_tasks.add_task(
        deliver_email_to_recipients_background,
        forward_email_obj.id,
        current_user.id,
        run_id
    )

    logger.info(f"Forward {forward_email_obj.id} of email {email_id} by user {current_user.id}")

    return format_email_response(forward_email_obj, current_user.id)


@router.patch("/emails/{email_id}/read", response_model=EmailResponse, dependencies=[Depends(authorized())])
def mark_email_read(
    email_id: UUID,
    read_data: EmailReadUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """Mark an email as read or unread."""
    current_user = auth.user
    
    email = db.query(Email).filter(
        Email.id == email_id
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    email.is_read = read_data.is_read
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    return format_email_response(email, current_user.id)


@router.patch("/emails/{email_id}/star", response_model=EmailResponse, dependencies=[Depends(authorized())])
def star_email(
    email_id: UUID,
    star_data: EmailStarUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """Star or unstar an email."""
    current_user = auth.user
    
    email = db.query(Email).filter(
        Email.id == email_id
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    email.is_starred = star_data.is_starred
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    return format_email_response(email, current_user.id)


@router.patch("/emails/{email_id}/important", response_model=EmailResponse, dependencies=[Depends(authorized())])
def important_email(
    email_id: UUID,
    important_data: EmailImportantUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """Mark a thread as important or unimportant for the current user.

    This updates the thread-level is_important flag for the current user only.
    Other users' important status for the same thread is not affected.
    """
    current_user = auth.user

    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    ).filter(
        Email.id == email_id
    ).first()

    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )

    if not email.thread_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email has no associated thread"
        )

    # Update thread metadata for this user
    mark_thread_important(db, email.thread_id, current_user.id, important_data.is_important)

    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise

    return format_email_response(email, current_user.id)



@router.post("/emails/{email_id}/move", response_model=EmailResponse, dependencies=[Depends(authorized())])
def move_email(
    email_id: UUID,
    move_data: EmailMoveRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Move an email to a different folder."""
    current_user = auth.user
    
    # Validate folder type
    if move_data.folder not in VALID_FOLDER_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid folder. Must be one of: {', '.join(VALID_FOLDER_TYPES)}"
        )
    
    email = db.query(Email).filter(
        Email.id == email_id
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    email.folder = move_data.folder
    
    # Update labels to match folder change
    if email.thread_id:
        new_label = FOLDER_TO_LABEL.get(move_data.folder)
        if new_label:
            replace_exclusive_labels(db, email.thread_id, current_user.id, new_label)
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    return format_email_response(email, current_user.id)


@router.post("/emails/{email_id}/labels", response_model=EmailResponse, dependencies=[Depends(authorized())])
def add_label_to_email(
    email_id: UUID,
    label_data: EmailLabelRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Add a label to an email's thread.
    
    Labels are now linked to threads, not individual emails.
    Adding a label to an email will add it to the email's thread.
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.thread).selectinload(Thread.labels),
    ).filter(
        Email.id == email_id
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    if not email.thread_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email has no associated thread"
        )
    
    # Verify label belongs to user
    label = db.query(Label).filter(
        Label.id == label_data.label_id,
        Label.owner_id == current_user.id
    ).first()
    
    if not label:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid label ID"
        )
    
    # Check if user already applied this label to the thread
    existing = db.query(ThreadLabel).filter(
        ThreadLabel.thread_id == email.thread_id,
        ThreadLabel.label_id == label_data.label_id,
        ThreadLabel.user_id == current_user.id
    ).first()
    
    if not existing:
        thread_label = ThreadLabel(
            thread_id=email.thread_id,
            label_id=label_data.label_id,
            user_id=current_user.id
        )
        db.add(thread_label)
        
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise
    
    db.refresh(email)
    return format_email_response(email, current_user.id)


@router.delete("/emails/{email_id}/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(authorized())])
def remove_label_from_email(
    email_id: UUID,
    label_id: UUID,
    db: Session = Depends(get_db),
) -> None:
    """Remove a label from an email's thread for the current user.

    Labels are user-specific on shared threads. Removing a label only affects
    the current user's view of the thread.

    Special behavior for TRASH/SPAM labels:
    - When removing the TRASH label, all trashed emails in the thread are moved back to inbox.
    - When removing the SPAM label, all spam emails in the thread are moved back to inbox.
    """
    current_user = auth.user

    # Get the email to find its thread
    email = db.query(Email).filter(
        Email.id == email_id
    ).first()

    if not email or not email.thread_id:
        return  # Silently succeed if email or thread not found

    # Check if the label being removed is the TRASH or SPAM system label
    label = db.query(Label).filter(Label.id == label_id).first()
    is_trash_label = label and label.is_system and label.name == SystemLabel.TRASH.value
    is_spam_label = label and label.is_system and label.name == SystemLabel.SPAM.value

    # Only remove the label association for this specific user
    thread_label = db.query(ThreadLabel).filter(
        ThreadLabel.thread_id == email.thread_id,
        ThreadLabel.label_id == label_id,
        ThreadLabel.user_id == current_user.id
    ).first()

    if thread_label:
        db.delete(thread_label)

        # If removing TRASH label, restore trashed emails to inbox
        if is_trash_label:
            trashed_emails = db.query(Email).filter(
                Email.thread_id == email.thread_id,
                Email.folder == FolderType.TRASH.value,
                or_(
                    Email.sender_id == current_user.id,
                    Email.id.in_(
                        db.query(EmailRecipient.email_id).filter(
                            EmailRecipient.recipient_id == current_user.id
                        )
                    )
                )
            ).all()

            for trashed_email in trashed_emails:
                trashed_email.folder = FolderType.INBOX.value

            # Add inbox label
            add_system_label_to_thread(db, email.thread_id, current_user.id, SystemLabel.INBOX)

            logger.info(f"Restored {len(trashed_emails)} emails from trash for thread {email.thread_id} by user {current_user.id}")

        # If removing SPAM label, restore spam emails to inbox
        elif is_spam_label:
            spam_emails = db.query(Email).filter(
                Email.thread_id == email.thread_id,
                Email.folder == FolderType.SPAM.value,
                or_(
                    Email.sender_id == current_user.id,
                    Email.id.in_(
                        db.query(EmailRecipient.email_id).filter(
                            EmailRecipient.recipient_id == current_user.id
                        )
                    )
                )
            ).all()

            for spam_email in spam_emails:
                spam_email.folder = FolderType.INBOX.value

            # Add inbox label
            add_system_label_to_thread(db, email.thread_id, current_user.id, SystemLabel.INBOX)

            logger.info(f"Restored {len(spam_emails)} emails from spam for thread {email.thread_id} by user {current_user.id}")
        
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise


@router.post("/emails/{email_id}/snooze", response_model=EmailResponse, dependencies=[Depends(authorized())])
def snooze_email(
    email_id: UUID,
    snooze_data: EmailSnoozeRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Snooze an email until a specific date and time.
    
    When snoozed, the email is temporarily hidden from the inbox and will
    reappear at the specified snooze_until time.
    
    Permissions:
    - Users can only snooze their own emails (sent or received)
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    ).filter(
        Email.id == email_id
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    is_sender = email.sender_id == current_user.id
    is_recipient = any(r.recipient_id == current_user.id for r in email.recipients)
    is_admin = current_user.role == "admin"
    
    if not (is_sender or is_recipient or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Validate snooze_until is in the future
    if snooze_data.snooze_until <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Snooze time must be in the future"
        )
    
    if not email.thread_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot snooze email without thread"
        )
    
    # Update snooze in ThreadUserMetadata (thread-level per user)
    from app.models.thread_user_metadata import ThreadUserMetadata
    metadata = db.query(ThreadUserMetadata).filter(
        ThreadUserMetadata.thread_id == email.thread_id,
        ThreadUserMetadata.user_id == current_user.id
    ).first()
    
    if metadata:
        metadata.snooze_until = snooze_data.snooze_until
    else:
        metadata = ThreadUserMetadata(
            thread_id=email.thread_id,
            user_id=current_user.id,
            snooze_until=snooze_data.snooze_until
        )
        db.add(metadata)
    
    # Add Snoozed label
    add_system_label_to_thread(db, email.thread_id, current_user.id, SystemLabel.SNOOZED)
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Thread {email.thread_id} snoozed until {snooze_data.snooze_until} by user {current_user.id}")
    
    return format_email_response(email, current_user.id)


@router.post("/emails/{email_id}/unsnooze", response_model=EmailResponse, dependencies=[Depends(authorized())])
def unsnooze_email(
    email_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Unsnooze an email, making it immediately visible again.
    
    Permissions:
    - Users can only unsnooze their own emails (sent or received)
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    ).filter(
        Email.id == email_id
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    is_sender = email.sender_id == current_user.id
    is_recipient = any(r.recipient_id == current_user.id for r in email.recipients)
    is_admin = current_user.role == "admin"
    
    if not (is_sender or is_recipient or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    if not email.thread_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot unsnooze email without thread"
        )
    
    # Check snooze status in ThreadUserMetadata
    from app.models.thread_user_metadata import ThreadUserMetadata
    metadata = db.query(ThreadUserMetadata).filter(
        ThreadUserMetadata.thread_id == email.thread_id,
        ThreadUserMetadata.user_id == current_user.id
    ).first()
    
    if not metadata or not metadata.snooze_until:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thread is not snoozed"
        )
    
    metadata.snooze_until = None
    
    # Remove Snoozed label and add Inbox back
    remove_system_label_from_thread(db, email.thread_id, current_user.id, SystemLabel.SNOOZED)
    add_system_label_to_thread(db, email.thread_id, current_user.id, SystemLabel.INBOX)
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Thread {email.thread_id} unsnoozed by user {current_user.id}")
    
    return format_email_response(email, current_user.id)


@router.post("/emails/{email_id}/archive", response_model=EmailResponse, dependencies=[Depends(authorized())])
def archive_email(
    email_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Archive a thread (via email_id).
    
    Sets is_archived=True in ThreadUserMetadata for the thread.
    
    Permissions:
    - Users can only archive their own emails (sent or received)
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    ).filter(
        Email.id == email_id
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    is_sender = email.sender_id == current_user.id
    is_recipient = any(r.recipient_id == current_user.id for r in email.recipients)
    is_admin = current_user.role == "admin"
    
    if not (is_sender or is_recipient or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    if not email.thread_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot archive email without thread"
        )
    
    # Update archive status in ThreadUserMetadata (thread-level per user)
    from app.models.thread_user_metadata import ThreadUserMetadata
    metadata = db.query(ThreadUserMetadata).filter(
        ThreadUserMetadata.thread_id == email.thread_id,
        ThreadUserMetadata.user_id == current_user.id
    ).first()
    
    if metadata:
        metadata.is_archived = True
    else:
        metadata = ThreadUserMetadata(
            thread_id=email.thread_id,
            user_id=current_user.id,
            is_archived=True
        )
        db.add(metadata)
    
    # Remove Inbox label (email stays in All Mail)
    remove_system_label_from_thread(db, email.thread_id, current_user.id, SystemLabel.INBOX)
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Thread {email.thread_id} archived by user {current_user.id}")
    
    return format_email_response(email, current_user.id)


@router.post("/emails/{email_id}/unarchive", response_model=EmailResponse, dependencies=[Depends(authorized())])
def unarchive_email(
    email_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Unarchive a thread (via email_id).
    
    Sets is_archived=False in ThreadUserMetadata and restores Inbox/Sent label.
    
    Permissions:
    - Users can only unarchive their own emails (sent or received)
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    ).filter(
        Email.id == email_id
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    is_sender = email.sender_id == current_user.id
    is_recipient = any(r.recipient_id == current_user.id for r in email.recipients)
    is_admin = current_user.role == "admin"
    
    if not (is_sender or is_recipient or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    if not email.thread_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot unarchive email without thread"
        )
    
    # Check archive status in ThreadUserMetadata
    from app.models.thread_user_metadata import ThreadUserMetadata
    metadata = db.query(ThreadUserMetadata).filter(
        ThreadUserMetadata.thread_id == email.thread_id,
        ThreadUserMetadata.user_id == current_user.id
    ).first()
    
    if not metadata or not metadata.is_archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thread is not archived"
        )
    
    metadata.is_archived = False
    
    # Restore appropriate label based on whether user sent or received it
    if email.sender_id == current_user.id:
        add_system_label_to_thread(db, email.thread_id, current_user.id, SystemLabel.SENT)
    else:
        add_system_label_to_thread(db, email.thread_id, current_user.id, SystemLabel.INBOX)
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Thread {email.thread_id} unarchived by user {current_user.id}")
    
    return format_email_response(email, current_user.id)


@router.post("/emails/{email_id}/spam", response_model=EmailResponse, dependencies=[Depends(authorized())])
def mark_email_spam(
    email_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Mark an email as spam.
    
    Moves the email to the spam folder.
    
    Permissions:
    - Users can only mark their own emails as spam (sent or received)
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    ).filter(
        Email.id == email_id
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    is_sender = email.sender_id == current_user.id
    is_recipient = any(r.recipient_id == current_user.id for r in email.recipients)
    is_admin = current_user.role == "admin"
    
    if not (is_sender or is_recipient or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    if email.folder == FolderType.SPAM.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already marked as spam"
        )
    
    email.folder = FolderType.SPAM.value
    
    # Update labels: Replace with Spam
    if email.thread_id:
        replace_exclusive_labels(db, email.thread_id, current_user.id, SystemLabel.SPAM)
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} marked as spam by user {current_user.id}")
    
    return format_email_response(email, current_user.id)


@router.post("/emails/{email_id}/unspam", response_model=EmailResponse, dependencies=[Depends(authorized())])
def unmark_email_spam(
    email_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Remove spam mark from an email.
    
    Moves the email from spam folder back to inbox.
    
    Permissions:
    - Users can only unmark their own emails from spam (sent or received)
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    ).filter(
        Email.id == email_id
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    is_sender = email.sender_id == current_user.id
    is_recipient = any(r.recipient_id == current_user.id for r in email.recipients)
    is_admin = current_user.role == "admin"
    
    if not (is_sender or is_recipient or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    if email.folder != FolderType.SPAM.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is not in spam folder"
        )
    
    email.folder = FolderType.INBOX.value
    
    # Update labels: Replace Spam with Inbox
    if email.thread_id:
        replace_exclusive_labels(db, email.thread_id, current_user.id, SystemLabel.INBOX)
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} removed from spam by user {current_user.id}")
    
    return format_email_response(email, current_user.id)


@router.post("/emails/{email_id}/restore", response_model=EmailResponse, dependencies=[Depends(authorized())])
def restore_email_from_trash(
    email_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Restore an email from trash.
    
    Moves the email from trash folder back to its appropriate folder:
    - Sent emails are restored to the 'sent' folder
    - Scheduled/queued emails are restored to the 'scheduled' folder
    - Received emails are restored to the 'inbox' folder
    - Draft emails are restored to the 'drafts' folder
    
    Permissions:
    - Users can only restore their own emails (sent or received)
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    ).filter(
        Email.id == email_id
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    is_sender = email.sender_id == current_user.id
    is_recipient = any(r.recipient_id == current_user.id for r in email.recipients)
    is_admin = current_user.role == "admin"
    
    if not (is_sender or is_recipient or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    if email.folder != FolderType.TRASH.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is not in trash"
        )
    
    # Determine the appropriate folder based on email status
    if email.status == EmailStatus.DRAFT.value:
        email.folder = FolderType.DRAFTS.value
        target_label = SystemLabel.DRAFTS
    elif email.status == EmailStatus.QUEUED.value:
        email.folder = FolderType.SCHEDULED.value
        target_label = SystemLabel.SCHEDULED
    elif email.status == EmailStatus.SENT.value:
        email.folder = FolderType.SENT.value
        target_label = SystemLabel.SENT
    else:
        # For received emails or any other status, restore to inbox
        email.folder = FolderType.INBOX.value
        target_label = SystemLabel.INBOX
    
    # Update labels: Replace Trash with the appropriate label
    if email.thread_id:
        replace_exclusive_labels(db, email.thread_id, current_user.id, target_label)
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} restored from trash to {email.folder} by user {current_user.id}")
    
    return format_email_response(email, current_user.id)


@router.patch("/emails/{email_id}/category", response_model=EmailResponse, dependencies=[Depends(authorized())])
def update_email_category(
    email_id: UUID,
    category_data: EmailCategoryUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """Update an email's category (Primary, Promotions, Social, Updates, Forums).
    
    Categories help organize inbox similar to Gmail tabs.
    
    Permissions:
    - Users can only update categories on their own emails (sent or received)
    """
    current_user = auth.user
    
    # Validate category
    if category_data.category not in VALID_EMAIL_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {', '.join(VALID_EMAIL_CATEGORIES)}"
        )
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    ).filter(
        Email.id == email_id
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    is_sender = email.sender_id == current_user.id
    is_recipient = any(r.recipient_id == current_user.id for r in email.recipients)
    is_admin = current_user.role == "admin"
    
    if not (is_sender or is_recipient or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    old_category = EmailCategory(email.category) if email.category else None
    new_category = EmailCategory(category_data.category)
    
    email.category = category_data.category
    
    # Sync category labels
    if email.thread_id:
        sync_category_labels(db, email.thread_id, current_user.id, old_category, new_category)
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} category changed to {category_data.category} by user {current_user.id}")

    return format_email_response(email, current_user.id)


@router.get("/emails/stats/category-counts", response_model=EmailCategoryCountsResponse, dependencies=[Depends(authorized())])
def get_email_category_counts(
    db: Session = Depends(get_db),
    folder: Optional[FolderType] = Query(None, description="Filter by folder"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    is_starred: Optional[bool] = Query(None, description="Filter by starred"),
) -> dict:
    """Get count of emails in each category (primary, promotions, social, updates, forums).

    Returns the number of emails in each category for the current user.
    Optionally filter by folder, read status, or starred status.

    Permissions:
    - Users can only see counts for their own emails (sent or received)
    """
    current_user = auth.user

    # Base query for category counts
    base_query = db.query(
        Email.category,
        func.count(Email.id).label('count')
    )

    # Apply folder filter with proper sender/recipient context
    if folder:
        base_query = base_query.filter(Email.folder == folder.value)
        
        if folder in (FolderType.INBOX,):
            # Inbox should only count emails where user is a recipient
            base_query = base_query.filter(
                Email.id.in_(
                    db.query(EmailRecipient.email_id).filter(
                        EmailRecipient.recipient_id == current_user.id
                    )
                )
            )
        elif folder in (FolderType.SENT, FolderType.DRAFTS, FolderType.SCHEDULED):
            # Sent/Drafts/Scheduled should only count emails where user is the sender
            base_query = base_query.filter(Email.sender_id == current_user.id)
        else:
            # Other folders - count emails where user is sender or recipient
            base_query = base_query.filter(
                or_(
                    Email.sender_id == current_user.id,
                    Email.id.in_(
                        db.query(EmailRecipient.email_id).filter(
                            EmailRecipient.recipient_id == current_user.id
                        )
                    )
                )
            )
    else:
        # No folder filter - count all user's emails (sent or received)
        base_query = base_query.filter(
            or_(
                Email.sender_id == current_user.id,
                Email.id.in_(
                    db.query(EmailRecipient.email_id).filter(
                        EmailRecipient.recipient_id == current_user.id
                    )
                )
            )
        )

    if is_read is not None:
        base_query = base_query.filter(Email.is_read == is_read)

    if is_starred is not None:
        base_query = base_query.filter(Email.is_starred == is_starred)

    # Group by category
    results = base_query.group_by(Email.category).all()

    # Build category counts dictionary dynamically from VALID_EMAIL_CATEGORIES
    category_counts = {category: 0 for category in VALID_EMAIL_CATEGORIES}

    # Fill in actual counts from query results
    for category, count in results:
        category_key = category or EmailCategory.PRIMARY.value
        if category_key in category_counts:
            category_counts[category_key] = count

    return category_counts
