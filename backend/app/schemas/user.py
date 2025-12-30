"""Pydantic schemas for User resource - simplified boilerplate version."""

from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from datetime import datetime
import re

from app.schemas.pagination import PaginatedListResponse

class UserResponse(BaseModel):
    """User API response schema."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    timezone: Optional[str] = None
    locale: str = "en-US"
    photo: Optional[str] = None
    verified: bool = False
    active: bool = True
    suspended: bool = False
    suspended_at: Optional[str] = None
    suspended_reason: Optional[str] = None
    notes: Optional[str] = None
    last_login_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


UserListResponse = PaginatedListResponse[UserResponse]


class UserCreate(BaseModel):
    """User creation request schema."""
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    timezone: Optional[str] = None
    locale: Optional[str] = "en-US"
    photo: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Validate and normalize email format."""
        if not v:
            raise ValueError("Email is required")
        
        normalized_email = v.strip().lower()
        
        # Basic structure: local@domain with valid TLD (min 2 chars)
        email_regex = re.compile(r'^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        
        if not email_regex.match(normalized_email):
            raise ValueError("Invalid email format")
        
        if ".." in normalized_email:
            raise ValueError("Email cannot contain consecutive dots")
        
        parts = normalized_email.split("@")
        if len(parts) != 2:
            raise ValueError("Invalid email format")
        
        local_part, domain_part = parts
        
        if not local_part or len(local_part) > 64:
            raise ValueError("Email local part must be between 1 and 64 characters")
        
        if not domain_part or len(domain_part) > 255:
            raise ValueError("Email domain part must be between 1 and 255 characters")
        
        if local_part.startswith(".") or local_part.endswith("."):
            raise ValueError("Email local part cannot start or end with a dot")
        
        if (domain_part.startswith(".") or domain_part.endswith(".") or
            domain_part.startswith("-") or domain_part.endswith("-")):
            raise ValueError("Email domain cannot start or end with a dot or hyphen")
        
        return normalized_email

    @field_validator('role')
    @classmethod
    def validate_role(cls, v: str) -> str:
        """Validate role is one of the allowed values."""
        valid_roles = ["admin", "agent", "end-user"]
        if v not in valid_roles:
            raise ValueError(f"Role must be one of: {', '.join(valid_roles)}")
        return v


class UserUpdate(BaseModel):
    """User update request schema supporting partial updates."""
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    timezone: Optional[str] = None
    locale: Optional[str] = None
    photo: Optional[str] = None
    suspended: Optional[bool] = None
    suspended_reason: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        """Validate and normalize email format if provided."""
        if v is None:
            return v
        
        normalized_email = v.strip().lower()
        
        email_regex = re.compile(r'^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        
        if not email_regex.match(normalized_email):
            raise ValueError("Invalid email format")
        
        if ".." in normalized_email:
            raise ValueError("Email cannot contain consecutive dots")
        
        parts = normalized_email.split("@")
        if len(parts) != 2:
            raise ValueError("Invalid email format")
        
        local_part, domain_part = parts
        
        if not local_part or len(local_part) > 64:
            raise ValueError("Email local part must be between 1 and 64 characters")
        
        if not domain_part or len(domain_part) > 255:
            raise ValueError("Email domain part must be between 1 and 255 characters")
        
        if local_part.startswith(".") or local_part.endswith("."):
            raise ValueError("Email local part cannot start or end with a dot")
        
        if (domain_part.startswith(".") or domain_part.endswith(".") or
            domain_part.startswith("-") or domain_part.endswith("-")):
            raise ValueError("Email domain cannot start or end with a dot or hyphen")
        
        return normalized_email

    @field_validator('role')
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        """Validate role is one of the allowed values."""
        if v is None:
            return v
        valid_roles = ["admin", "agent", "end-user"]
        if v not in valid_roles:
            raise ValueError(f"Role must be one of: {', '.join(valid_roles)}")
        return v
