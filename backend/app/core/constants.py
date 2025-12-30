"""Application-wide constants and enums."""

from enum import Enum


class UserRole(str, Enum):
    """User role enumeration."""
    ADMIN = "admin"
    AGENT = "agent"
    END_USER = "end-user"


class ItemStatus(str, Enum):
    """Item status enumeration."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class ItemPriority(str, Enum):
    """Item priority enumeration."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# List versions for validation
VALID_USER_ROLES = [role.value for role in UserRole]
VALID_ITEM_STATUSES = [status.value for status in ItemStatus]
VALID_ITEM_PRIORITIES = [priority.value for priority in ItemPriority]

