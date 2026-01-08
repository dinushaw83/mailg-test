"""
Identity generators for names, emails, phones, etc.
"""

from typing import Any

from .base import BaseGenerator, fake
from ..core.analyzer import FieldSemantics, SemanticType
from ..core.context import GenerationContext
from ..core.registry import generator

@generator(SemanticType.PERSON_NAME, priority=80)
class PersonNameGenerator(BaseGenerator):
    """Generates realistic person names."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None
        return fake.name()


@generator(SemanticType.FIRST_NAME, priority=80)
class FirstNameGenerator(BaseGenerator):
    """Generates realistic first names."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None
        return fake.first_name()


@generator(SemanticType.LAST_NAME, priority=80)
class LastNameGenerator(BaseGenerator):
    """Generates realistic last names."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None
        return fake.last_name()


@generator(SemanticType.ADDRESS, priority=80)
class AddressGenerator(BaseGenerator):
    """Generates realistic addresses."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.4):
            return None
        return fake.address().replace('\n', ', ')


@generator(SemanticType.COMPANY_NAME, priority=80)
class CompanyNameGenerator(BaseGenerator):
    """Generates realistic company names."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None
        return fake.company()


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
        return fake.unique.email()


@generator(SemanticType.PHONE, priority=80)
class PhoneGenerator(BaseGenerator):
    """Generates phone numbers."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.15):
            return None
        return fake.phone_number()


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
        return fake.job()


@generator(SemanticType.WEBSITE, priority=80)
class WebsiteGenerator(BaseGenerator):
    """Generates website URLs."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.4):
            return None
        return fake.url()


@generator(SemanticType.BIRTHDAY_YEAR, priority=80)
class BirthdayYearGenerator(BaseGenerator):
    """Generates realistic birth years."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.7):
            return None
        # Generate birth years for ages 18-70
        current_year = 2025
        return context.random().randint(current_year - 70, current_year - 18)


@generator(SemanticType.BIRTHDAY_MONTH, priority=80)
class BirthdayMonthGenerator(BaseGenerator):
    """Generates birthday month (1-12)."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.7):
            return None
        return context.random().randint(1, 12)


@generator(SemanticType.BIRTHDAY_DAY, priority=80)
class BirthdayDayGenerator(BaseGenerator):
    """Generates birthday day (1-28 to be safe)."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.7):
            return None
        # Use 1-28 to avoid invalid dates
        return context.random().randint(1, 28)


@generator(SemanticType.USERNAME, priority=80)
class UsernameGenerator(BaseGenerator):
    """Generates usernames/aliases."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.3):
            return None
        return fake.user_name()


@generator(SemanticType.EXTERNAL_ID, priority=80)
class ExternalIdGenerator(BaseGenerator):
    """Generates external system IDs."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.5):
            return None
        return fake.uuid4()


@generator(SemanticType.COLOR, priority=80)
class ColorGenerator(BaseGenerator):
    """Generates hex color codes respecting maxLength from schema."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.1):
            return None

        # Generate RGB values in the lighter range (180-255)
        r = context.random().randint(180, 255)
        g = context.random().randint(180, 255)
        b = context.random().randint(180, 255)
        return f"#{r:02x}{g:02x}{b:02x}"


@generator(SemanticType.GROUP_NAME, priority=85)
class FolderLabelNameGenerator(BaseGenerator):
    """Generates folder and label names for Mailg app."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None

        table_name = semantics.table_name
        field_name = semantics.field_name

        # Handle folder names
        if table_name == "folders" and field_name == "name":
            folder_names = context.config.get("templates", {}).get("folders", [
                "Work", "Personal", "Family", "Travel", "Projects",
                "Clients", "Archive", "Important", "Follow-up", "Read Later"
            ])
            return context.random().choice(folder_names)

        # Handle label names
        if table_name == "labels" and field_name == "name":
            label_names = context.config.get("templates", {}).get("labels", [
                "Important", "Urgent", "Follow-up", "Work", "Personal",
                "Family", "Friends", "Travel", "Receipts", "Invoices"
            ])
            return context.random().choice(label_names)

        # Handle email template names
        if table_name == "email_templates" and field_name == "name":
            template_names = context.config.get("templates", {}).get("email_templates", [
                "Weekly Update Template", "Meeting Follow-up Template",
                "Client Outreach Template", "Thank You Template"
            ])
            return context.random().choice(template_names)

        # Fall back to default group name generation
        groups_cfg = context.config.get("templates", {}).get("groups", {})
        prefixes = groups_cfg.get("prefixes", ["Technical", "Customer", "Enterprise"])
        suffixes = groups_cfg.get("suffixes", ["Support", "Team", "Group"])

        prefix = context.random().choice(prefixes)
        suffix = context.random().choice(suffixes)
        return f"{prefix} {suffix}"
