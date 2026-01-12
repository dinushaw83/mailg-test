import uuid
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Index,
    Text,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class User(Base):
    """User model for email application.
    
    Supports admin and user roles with soft delete pattern.
    Includes contact information fields for full user profiles.
    """
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Basic identity
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    email_label = Column(String, default="Home")  # Home, Work, Other
    role = Column(String, nullable=False, index=True)  # admin or user
    photo = Column(String)  # Profile photo URL
    
    # Professional info
    company = Column(String)
    job_title = Column(String)
    
    # Contact info
    phone = Column(String)
    phone_country_code = Column(String, default="+1")
    phone_label = Column(String, default="Mobile")  # Mobile, Home, Work
    address = Column(Text)
    
    # Personal dates
    birthday_month = Column(Integer)
    birthday_day = Column(Integer)
    birthday_year = Column(Integer)
    significant_dates = Column(JSON, default=list)  # List of {date, label}
    
    # Additional info
    website = Column(String)
    related_persons = Column(JSON, default=list)  # List of {name, relationship}
    labels = Column(JSON, default=list)  # List of labels like "Family", "Friends"
    custom_fields = Column(JSON, default=list)  # List of {field_name, value}
    notes = Column(Text)
    
    # Email preferences
    undo_send_delay_seconds = Column(Integer, default=10)  # Undo send buffer: 5-30 seconds, 0 to disable
    
    # Status fields
    active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    @property
    def name(self):
        """Full name for backwards compatibility."""
        return f"{self.first_name} {self.last_name}".strip()
