"""Application-wide constants and enums."""

from enum import Enum


class UserRole(str, Enum):
    """User role enumeration."""
    ADMIN = "admin"
    USER = "user"


class EmailStatus(str, Enum):
    """Email status enumeration."""
    DRAFT = "draft"
    QUEUED = "queued"  # Pending send (undo send buffer period)
    SENT = "sent"
    RECEIVED = "received"
    ARCHIVED = "archived"
    CANCELLED = "cancelled"  # Cancelled during undo send period


class FolderType(str, Enum):
    """Folder type enumeration (system folders only)."""
    INBOX = "inbox"
    SENT = "sent"
    DRAFTS = "drafts"
    TRASH = "trash"
    SPAM = "spam"
    SCHEDULED = "scheduled"

class SystemLabel(str, Enum):
    """System label enumeration - predefined labels created for each user."""
    INBOX = "Inbox"
    STARRED = "Starred"
    SNOOZED = "Snoozed"
    IMPORTANT = "Important"
    SENT = "Sent"
    SCHEDULED = "Scheduled"
    DRAFTS = "Drafts"
    ALL_MAIL = "All Mail"
    SPAM = "Spam"
    TRASH = "Trash"


class CategoryLabel(str, Enum):
    """Category label enumeration - Gmail-style category labels."""
    PURCHASES = "Purchases"
    SOCIAL = "Social"
    UPDATES = "Updates"
    FORUMS = "Forums"
    PROMOTIONS = "Promotions"


# Exclusive system labels - email can only be in one at a time (folder-like behavior)
EXCLUSIVE_SYSTEM_LABELS = {
    SystemLabel.INBOX,
    SystemLabel.SENT,
    SystemLabel.DRAFTS,
    SystemLabel.TRASH,
    SystemLabel.SPAM,
    SystemLabel.SCHEDULED,
    SystemLabel.ALL_MAIL,
}


class ProhibitedLabels(str, Enum):
    """Prohibited label enumeration - these names cannot be used for custom labels."""
    # System labels (lowercase for case-insensitive comparison)
    SPAM = "spam"
    TRASH = "trash"
    DRAFTS = "drafts"
    SENT = "sent"
    INBOX = "inbox"
    STARRED = "starred"
    IMPORTANT = "important"
    SCHEDULED = "scheduled"
    SNOOZED = "snoozed"
    ALL_MAIL = "all mail"
    # Category labels
    PURCHASES = "purchases"
    SOCIAL = "social"
    UPDATES = "updates"
    FORUMS = "forums"
    PROMOTIONS = "promotions"

class RecipientType(str, Enum):
    """Email recipient type enumeration."""
    TO = "to"
    CC = "cc"
    BCC = "bcc"


class AttachmentType(str, Enum):
    """Attachment type enumeration."""
    FILE = "file"
    IMAGE = "image"
    DOCUMENT = "document"


class EmailCategory(str, Enum):
    """Email category enumeration (Gmail-style tabs)."""
    PRIMARY = "primary"
    PROMOTIONS = "promotions"
    SOCIAL = "social"
    UPDATES = "updates"
    FORUMS = "forums"
    PURCHASES = "purchases"


# List versions for validation
VALID_USER_ROLES = [role.value for role in UserRole]
VALID_EMAIL_STATUSES = [s.value for s in EmailStatus]
VALID_FOLDER_TYPES = [t.value for t in FolderType]
VALID_RECIPIENT_TYPES = [t.value for t in RecipientType]
VALID_ATTACHMENT_TYPES = [t.value for t in AttachmentType]
VALID_EMAIL_CATEGORIES = [c.value for c in EmailCategory]
