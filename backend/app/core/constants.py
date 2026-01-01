"""Application-wide constants and enums."""

from enum import Enum


class UserRole(str, Enum):
    """User role enumeration."""
    ADMIN = "admin"
    USER = "user"


class EmailStatus(str, Enum):
    """Email status enumeration."""
    DRAFT = "draft"
    SENT = "sent"
    RECEIVED = "received"
    ARCHIVED = "archived"


class FolderType(str, Enum):
    """Folder type enumeration."""
    INBOX = "inbox"
    SENT = "sent"
    DRAFTS = "drafts"
    TRASH = "trash"
    SPAM = "spam"
    STARRED = "starred"
    CUSTOM = "custom"


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


# List versions for validation
VALID_USER_ROLES = [role.value for role in UserRole]
VALID_EMAIL_STATUSES = [s.value for s in EmailStatus]
VALID_FOLDER_TYPES = [t.value for t in FolderType]
VALID_RECIPIENT_TYPES = [t.value for t in RecipientType]
VALID_ATTACHMENT_TYPES = [t.value for t in AttachmentType]
