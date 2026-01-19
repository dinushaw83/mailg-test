"""SQLAlchemy models for the email application."""

from app.models.user import User
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.models.label import Label
from app.models.thread_label import ThreadLabel
from app.models.thread_user_metadata import ThreadUserMetadata
from app.models.attachment import Attachment
from app.models.thread import Thread
from app.models.saved_search import SavedSearch
from app.models.email_template import EmailTemplate
from app.models.general_settings import GeneralSettings, DefaultTextStyle, Signature
from app.models.advanced_settings import AdvancedSettings

__all__ = [
    "User",
    "Email",
    "EmailRecipient",
    "Label",
    "ThreadLabel",
    "ThreadUserMetadata",
    "Attachment",
    "Thread",
    "SavedSearch",
    "EmailTemplate",
    "GeneralSettings",
    "DefaultTextStyle",
    "Signature",
    "AdvancedSettings",
]
