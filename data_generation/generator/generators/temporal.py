"""
Temporal generators for dates, timestamps, and timezone-related fields.
"""

from datetime import datetime, timedelta
from typing import Any

from .base import BaseGenerator
from ..core.analyzer import FieldSemantics, SemanticType
from ..core.context import GenerationContext
from ..core.registry import generator


@generator(SemanticType.CREATED_AT, priority=80)
class CreatedAtGenerator(BaseGenerator):
    """Generates creation timestamps within the past year."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.05):
            return None

        days_ago = context.random().randint(1, 365)
        hours = context.random().randint(0, 23)
        minutes = context.random().randint(0, 59)

        dt = datetime.utcnow() - timedelta(days=days_ago, hours=hours, minutes=minutes)
        return dt.isoformat()


@generator(SemanticType.UPDATED_AT, priority=80)
class UpdatedAtGenerator(BaseGenerator):
    """Generates update timestamps, ensuring they're after created_at."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.05):
            return None

        # Try to be after created_at if available
        created_at = context.get_field_value("created_at")
        if created_at:
            try:
                created_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                # Add some time after creation
                hours_later = context.random().randint(1, 720)  # Up to 30 days
                dt = created_dt + timedelta(hours=hours_later)
                if dt > datetime.utcnow():
                    dt = datetime.utcnow()
                return dt.isoformat()
            except (ValueError, AttributeError):
                pass

        # Fallback: recent date
        days_ago = context.random().randint(0, 30)
        dt = datetime.utcnow() - timedelta(days=days_ago)
        return dt.isoformat()


@generator(SemanticType.DELETED_AT, priority=80)
class DeletedAtGenerator(BaseGenerator):
    """Generates deletion timestamps, only when is_deleted is True."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        # Only set if is_deleted is True
        is_deleted = context.get_field_value("is_deleted")
        if not is_deleted:
            return None

        created_at = context.get_field_value("created_at")
        if created_at:
            try:
                created_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                hours_later = context.random().randint(1, 168)  # Up to 7 days
                dt = created_dt + timedelta(hours=hours_later)
                if dt > datetime.utcnow():
                    dt = datetime.utcnow()
                return dt.isoformat()
            except (ValueError, AttributeError):
                pass

        days_ago = context.random().randint(0, 30)
        dt = datetime.utcnow() - timedelta(days=days_ago)
        return dt.isoformat()


@generator(SemanticType.TIMESTAMP, priority=50)
class TimestampGenerator(BaseGenerator):
    """Generic timestamp generator for various _at fields."""

    def _default_timestamp(self, context: GenerationContext) -> str:
        """Generate a default timestamp."""
        days_ago = context.random().randint(0, 180)
        dt = datetime.utcnow() - timedelta(days=days_ago)
        return dt.isoformat()

    def _maybe_null_or_default(
        self, semantics: FieldSemantics, context: GenerationContext, condition: bool
    ) -> str | None:
        """Return None if condition is False and field is nullable, else placeholder timestamp."""
        if not condition:
            if semantics.is_nullable:
                return None
            # Non-nullable: return placeholder timestamp (epoch)
            return "1970-01-01T00:00:00"
        return None  # Condition is True, let caller generate the value

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        field_name = semantics.field_name

        # Handle special cases - only return None if field is nullable
        if field_name == "suspended_at":
            suspended = context.get_field_value("suspended")
            result = self._maybe_null_or_default(semantics, context, suspended)
            if result is not None or not suspended:
                return result

        if field_name == "spam_marked_at":
            is_spam = context.get_field_value("is_spam")
            result = self._maybe_null_or_default(semantics, context, is_spam)
            if result is not None or not is_spam:
                return result

        if field_name == "solved_at":
            status = context.get_field_value("status")
            is_solved = status in ["done", "closed"]
            result = self._maybe_null_or_default(semantics, context, is_solved)
            if result is not None or not is_solved:
                return result

        if field_name == "responded_at":
            status = context.get_field_value("status")
            has_response = status not in ["backlog", "selected", "todo"]
            result = self._maybe_null_or_default(semantics, context, has_response)
            if result is not None or not has_response:
                return result

        if field_name == "last_login_at":
            if self.maybe_null(semantics, context, 0.3):
                return None

        if field_name == "viewed_at":
            # More recent for recently viewed
            hours_ago = context.random().randint(0, 72)
            dt = datetime.utcnow() - timedelta(hours=hours_ago)
            return dt.isoformat()

        if self.maybe_null(semantics, context, 0.1):
            return None

        return self._default_timestamp(context)


@generator(SemanticType.TIMEZONE, priority=80)
class TimezoneGenerator(BaseGenerator):
    """Generates timezone names."""

    TIMEZONES = [
        "America/New_York", "America/Los_Angeles", "America/Chicago",
        "Europe/London", "Europe/Paris", "Europe/Berlin",
        "Asia/Tokyo", "Asia/Shanghai", "Asia/Singapore",
        "Australia/Sydney", "Pacific/Auckland"
    ]

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.2):
            return None
        return context.random().choice(self.TIMEZONES)


@generator(SemanticType.TIMEZONE_OFFSET, priority=80)
class TimezoneOffsetGenerator(BaseGenerator):
    """Generates timezone offset strings."""

    OFFSETS = [
        "-08:00", "-07:00", "-06:00", "-05:00", "-04:00",
        "+00:00", "+01:00", "+02:00", "+05:30", "+08:00",
        "+09:00", "+10:00", "+12:00"
    ]

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.2):
            return None
        return context.random().choice(self.OFFSETS)


@generator(SemanticType.LOCALE, priority=80)
class LocaleGenerator(BaseGenerator):
    """Generates locale strings and phone country codes."""

    LOCALES = ["en-US", "en-GB", "es-ES", "fr-FR", "de-DE", "ja-JP", "zh-CN", "pt-BR"]
    COUNTRY_CODES = ["+1", "+44", "+33", "+49", "+81", "+86", "+55", "+61", "+91"]

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.1):
            return None

        # Check if this is phone_country_code
        if semantics.field_name == "phone_country_code":
            # Return country codes like +1, +44, etc.
            weights = [0.6, 0.1, 0.05, 0.05, 0.05, 0.05, 0.05, 0.03, 0.02]
            return context.random().choices(self.COUNTRY_CODES, weights=weights)[0]

        # Default to locale strings
        weights = [0.5, 0.1, 0.1, 0.08, 0.07, 0.05, 0.05, 0.05]
        return context.random().choices(self.LOCALES, weights=weights)[0]


@generator(SemanticType.LOCALE_ID, priority=80)
class LocaleIdGenerator(BaseGenerator):
    """Generates locale IDs."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.1):
            return None
        return context.random().randint(1, 10)


@generator(SemanticType.IP_ADDRESS, priority=80)
class IpAddressGenerator(BaseGenerator):
    """Generates IPv4 addresses."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.1):
            return None
        return self.fake.ipv4()
