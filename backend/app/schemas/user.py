"""Pydantic schemas for User resource - email application version."""

from pydantic import BaseModel, ConfigDict, field_validator, computed_field
from typing import Optional, List, Any
from datetime import datetime
import re

from app.schemas.pagination import PaginatedListResponse


class SignificantDate(BaseModel):
    """Schema for significant dates."""
    date: str
    label: str


class RelatedPerson(BaseModel):
    """Schema for related persons."""
    name: str
    relationship: str


class CustomField(BaseModel):
    """Schema for custom fields."""
    field_name: str
    value: str


class UserResponse(BaseModel):
    """User API response schema."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    first_name: str
    last_name: str
    email: str
    email_label: Optional[str] = "Home"
    role: str
    photo: Optional[str] = None
    
    # Professional info
    company: Optional[str] = None
    job_title: Optional[str] = None
    
    # Contact info
    phone: Optional[str] = None
    phone_country_code: Optional[str] = "+1"
    phone_label: Optional[str] = "Mobile"
    address: Optional[str] = None
    
    # Personal dates
    birthday_month: Optional[int] = None
    birthday_day: Optional[int] = None
    birthday_year: Optional[int] = None
    significant_dates: Optional[List[SignificantDate]] = None
    
    # Additional info
    website: Optional[str] = None
    related_persons: Optional[List[RelatedPerson]] = None
    labels: Optional[List[str]] = None
    custom_fields: Optional[List[CustomField]] = None
    notes: Optional[str] = None
    
    # Email preferences
    undo_send_delay_seconds: Optional[int] = 10  # Undo send buffer: 0=disabled, 5-30 seconds
    
    # Status fields
    active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @computed_field
    @property
    def name(self) -> str:
        """Full name for backwards compatibility."""
        return f"{self.first_name} {self.last_name}".strip()


UserListResponse = PaginatedListResponse[UserResponse]


class UserCreate(BaseModel):
    """User creation request schema."""
    first_name: str
    last_name: str
    email: str
    email_label: Optional[str] = "Home"
    role: str = "user"
    photo: Optional[str] = None
    
    # Professional info
    company: Optional[str] = None
    job_title: Optional[str] = None
    
    # Contact info
    phone: Optional[str] = None
    phone_country_code: Optional[str] = "+1"
    phone_label: Optional[str] = "Mobile"
    address: Optional[str] = None
    
    # Personal dates
    birthday_month: Optional[int] = None
    birthday_day: Optional[int] = None
    birthday_year: Optional[int] = None
    significant_dates: Optional[List[SignificantDate]] = None
    
    # Additional info
    website: Optional[str] = None
    related_persons: Optional[List[RelatedPerson]] = None
    labels: Optional[List[str]] = None
    custom_fields: Optional[List[CustomField]] = None
    notes: Optional[str] = None
    
    # Email preferences
    undo_send_delay_seconds: Optional[int] = 10  # Undo send buffer: 0=disabled, 5-30 seconds

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Validate and normalize email format."""
        if not v:
            raise ValueError("Email is required")
        
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
        
        return normalized_email

    @field_validator('role')
    @classmethod
    def validate_role(cls, v: str) -> str:
        """Validate role is one of the allowed values."""
        valid_roles = ["admin", "user"]
        if v not in valid_roles:
            raise ValueError(f"Role must be one of: {', '.join(valid_roles)}")
        return v

    @field_validator('birthday_month')
    @classmethod
    def validate_birthday_month(cls, v: Optional[int]) -> Optional[int]:
        """Validate birthday month is between 1 and 12."""
        if v is not None and (v < 1 or v > 12):
            raise ValueError("Birthday month must be between 1 and 12")
        return v

    @field_validator('birthday_day')
    @classmethod
    def validate_birthday_day(cls, v: Optional[int]) -> Optional[int]:
        """Validate birthday day is between 1 and 31."""
        if v is not None and (v < 1 or v > 31):
            raise ValueError("Birthday day must be between 1 and 31")
        return v

    @field_validator('undo_send_delay_seconds')
    @classmethod
    def validate_undo_send_delay(cls, v: Optional[int]) -> Optional[int]:
        """Validate undo send delay is 0 (disabled) or 5-30 seconds."""
        if v is not None and v != 0 and (v < 5 or v > 30):
            raise ValueError("Undo send delay must be 0 (disabled) or between 5 and 30 seconds")
        return v


class UserUpdate(BaseModel):
    """User update request schema supporting partial updates."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    email_label: Optional[str] = None
    role: Optional[str] = None
    photo: Optional[str] = None
    
    # Professional info
    company: Optional[str] = None
    job_title: Optional[str] = None
    
    # Contact info
    phone: Optional[str] = None
    phone_country_code: Optional[str] = None
    phone_label: Optional[str] = None
    address: Optional[str] = None
    
    # Personal dates
    birthday_month: Optional[int] = None
    birthday_day: Optional[int] = None
    birthday_year: Optional[int] = None
    significant_dates: Optional[List[SignificantDate]] = None
    
    # Additional info
    website: Optional[str] = None
    related_persons: Optional[List[RelatedPerson]] = None
    labels: Optional[List[str]] = None
    custom_fields: Optional[List[CustomField]] = None
    notes: Optional[str] = None
    
    # Email preferences
    undo_send_delay_seconds: Optional[int] = None  # Undo send buffer: 0=disabled, 5-30 seconds
    
    # Status
    active: Optional[bool] = None

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
        
        return normalized_email

    @field_validator('role')
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        """Validate role is one of the allowed values."""
        if v is None:
            return v
        valid_roles = ["admin", "user"]
        if v not in valid_roles:
            raise ValueError(f"Role must be one of: {', '.join(valid_roles)}")
        return v

    @field_validator('birthday_month')
    @classmethod
    def validate_birthday_month(cls, v: Optional[int]) -> Optional[int]:
        """Validate birthday month is between 1 and 12."""
        if v is not None and (v < 1 or v > 12):
            raise ValueError("Birthday month must be between 1 and 12")
        return v

    @field_validator('birthday_day')
    @classmethod
    def validate_birthday_day(cls, v: Optional[int]) -> Optional[int]:
        """Validate birthday day is between 1 and 31."""
        if v is not None and (v < 1 or v > 31):
            raise ValueError("Birthday day must be between 1 and 31")
        return v

    @field_validator('undo_send_delay_seconds')
    @classmethod
    def validate_undo_send_delay(cls, v: Optional[int]) -> Optional[int]:
        """Validate undo send delay is 0 (disabled) or 5-30 seconds."""
        if v is not None and v != 0 and (v < 5 or v > 30):
            raise ValueError("Undo send delay must be 0 (disabled) or between 5 and 30 seconds")
        return v
