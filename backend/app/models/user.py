from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Text,
    DateTime,
    Index,
)
from sqlalchemy.sql import func
from app.db.base import Base


class User(Base):
    """User model representing system users with role-based access control.
    
    Supports admin, agent, and end-user roles with soft delete pattern.
    This is a simplified boilerplate model - extend with additional fields as needed.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    role = Column(String, nullable=False, index=True)  # admin, agent, or end-user
    phone = Column(String)
    timezone = Column(String)
    locale = Column(String, default="en-US")
    photo = Column(String)
    verified = Column(Boolean, default=False)
    active = Column(Boolean, default=True)
    suspended = Column(Boolean, default=False, index=True)
    suspended_at = Column(DateTime)
    suspended_reason = Column(Text)
    notes = Column(Text)
    last_login_at = Column(DateTime)
    is_deleted = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        # Common filter patterns: is_deleted with role and suspended
        Index("ix_users_is_deleted_role", "is_deleted", "role"),
        Index("ix_users_is_deleted_suspended", "is_deleted", "suspended"),
    )
