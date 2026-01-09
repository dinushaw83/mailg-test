"""
Identity generators for names, emails, phones, etc.
"""

from typing import Any

from .base import BaseGenerator
from ..core.analyzer import FieldSemantics, SemanticType
from ..core.context import GenerationContext
from ..core.registry import generator


@generator(SemanticType.PERSON_NAME, priority=80)
class PersonNameGenerator(BaseGenerator):
    """Generates realistic person names."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None
        return context.fake().name()


@generator(SemanticType.FIRST_NAME, priority=80)
class FirstNameGenerator(BaseGenerator):
    """Generates realistic first names."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None
        return context.fake().first_name()


@generator(SemanticType.LAST_NAME, priority=80)
class LastNameGenerator(BaseGenerator):
    """Generates realistic last names."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None
        return context.fake().last_name()


@generator(SemanticType.ADDRESS, priority=80)
class AddressGenerator(BaseGenerator):
    """Generates realistic addresses."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.4):
            return None
        return context.fake().address().replace('\n', ', ')


@generator(SemanticType.COMPANY_NAME, priority=80)
class CompanyNameGenerator(BaseGenerator):
    """Generates realistic company names."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None
        return context.fake().company()


@generator(SemanticType.GROUP_NAME, priority=80)
class GroupNameGenerator(BaseGenerator):
    """Generates support group/team names."""

    DEFAULT_SUFFIXES = ["Support", "Team", "Group", "Squad", "Helpdesk", "Operations"]
    DEFAULT_PREFIXES = [
        "Technical", "Customer", "Enterprise", "Premium", "General",
        "Billing", "Sales", "Product", "Engineering", "Security",
        "Infrastructure", "Mobile", "Web", "API", "Integration"
    ]

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None

        # Get from config or use defaults
        groups_cfg = context.config.get("templates", {}).get("groups", {})
        prefixes = groups_cfg.get("prefixes", self.DEFAULT_PREFIXES)
        suffixes = groups_cfg.get("suffixes", self.DEFAULT_SUFFIXES)

        prefix = context.random().choice(prefixes)
        suffix = context.random().choice(suffixes)
        return f"{prefix} {suffix}"


@generator(SemanticType.EMAIL, priority=80)
class EmailGenerator(BaseGenerator):
    """Generates unique email addresses."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None
        return context.fake().unique.email()


@generator(SemanticType.PHONE, priority=80)
class PhoneGenerator(BaseGenerator):
    """Generates phone numbers."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.15):
            return None
        return context.fake().phone_number()


@generator(SemanticType.PHONE_LABEL, priority=80)
class PhoneLabelGenerator(BaseGenerator):
    """Generates phone labels like Mobile, Work, Home."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.15):
            return None
        labels = ["Mobile", "Work", "Home", "Main", "Other"]
        return context.random().choice(labels)


@generator(SemanticType.EMAIL_LABEL, priority=80)
class EmailLabelGenerator(BaseGenerator):
    """Generates email labels like Work, Home, Personal."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.15):
            return None
        labels = ["Work", "Home", "Personal", "School", "Other"]
        return context.random().choice(labels)


@generator(SemanticType.JOB_TITLE, priority=80)
class JobTitleGenerator(BaseGenerator):
    """Generates realistic job titles."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.15):
            return None
        return context.fake().job()


@generator(SemanticType.WEBSITE, priority=80)
class WebsiteGenerator(BaseGenerator):
    """Generates website URLs."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.4):
            return None
        return context.fake().url()


@generator(SemanticType.YEAR, priority=80)
class YearGenerator(BaseGenerator):
    """Generates year values. Default range is suitable for birth years (18-70 years ago)."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.7):
            return None
        # Default: generate years for ages 18-70
        from datetime import datetime
        current_year = datetime.now().year
        min_year = semantics.field_schema.get("minimum", current_year - 70)
        max_year = semantics.field_schema.get("maximum", current_year - 18)
        return context.random().randint(min_year, max_year)


@generator(SemanticType.MONTH, priority=80)
class MonthGenerator(BaseGenerator):
    """Generates month (1-12)."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.7):
            return None
        return context.random().randint(1, 12)


@generator(SemanticType.DAY, priority=80)
class DayGenerator(BaseGenerator):
    """Generates day of month. Context-aware: uses YEAR and MONTH to determine valid range."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.7):
            return None

        # Look up YEAR and MONTH from context by semantic type
        year = context.get_value_by_semantic_type(SemanticType.YEAR)
        month = context.get_value_by_semantic_type(SemanticType.MONTH)

        max_day = self._get_max_day(month, year)
        return context.random().randint(1, max_day)

    def _get_max_day(self, month: int | None, year: int | None) -> int:
        """Get maximum day for given month/year, accounting for leap years."""
        if month is None:
            return 28  # Safe default

        days_in_month = {
            1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30,
            7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31
        }

        max_day = days_in_month.get(month, 31)

        # Handle February leap year
        if month == 2 and year is not None:
            is_leap = (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)
            if is_leap:
                max_day = 29

        return max_day


@generator(SemanticType.USERNAME, priority=80)
class UsernameGenerator(BaseGenerator):
    """Generates usernames/aliases."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.3):
            return None
        return context.fake().user_name()


@generator(SemanticType.EXTERNAL_ID, priority=80)
class ExternalIdGenerator(BaseGenerator):
    """Generates external system IDs."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.5):
            return None
        return context.fake().uuid4()


@generator(SemanticType.COLOR, priority=80)
class ColorGenerator(BaseGenerator):
    """Generates hex color codes respecting maxLength from schema."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.1):
            return None

        max_length = semantics.field_schema.get("maxLength", 7)

        # Generate appropriate format based on maxLength
        if max_length >= 7:
            # Full hex color: #RRGGBB (7 chars)
            return context.fake().hex_color()
        elif max_length >= 4:
            # Short hex color: #RGB (4 chars)
            r = context.random().randint(0, 15)
            g = context.random().randint(0, 15)
            b = context.random().randint(0, 15)
            return f"#{r:x}{g:x}{b:x}"
        else:
            # Just return a short color code
            return context.fake().hex_color()[:max_length]
