"""SQLAlchemy models for the email application."""

from app.models.user import User
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.models.label import Label
from app.models.email_label import EmailLabel
from app.models.attachment import Attachment
from app.models.thread import Thread
from app.models.saved_search import SavedSearch
from app.models.email_template import EmailTemplate

__all__ = [
    "User",
    "Email",
    "EmailRecipient",
    "Label",
    "EmailLabel",
    "Attachment",
    "Thread",
    "SavedSearch",
    "EmailTemplate",
]
