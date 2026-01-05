"""
Boolean flag generators with realistic distributions.
"""

from typing import Any

from .base import BaseGenerator
from ..core.analyzer import FieldSemantics, SemanticType
from ..core.context import GenerationContext
from ..core.registry import generator


@generator(SemanticType.BOOL_ACTIVE, priority=80)
class ActiveFlagGenerator(BaseGenerator):
    """Generates active status - most records should be active."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None

        # 95% of records are active
        return context.random().random() < 0.95


@generator(SemanticType.BOOL_DELETED, priority=80)
class DeletedFlagGenerator(BaseGenerator):
    """Generates soft delete flag - few records are deleted."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None

        # Only 5% of records are deleted
        return context.random().random() < 0.05


@generator(SemanticType.BOOL_SUSPENDED, priority=80)
class SuspendedFlagGenerator(BaseGenerator):
    """Generates suspended flag - very few users are suspended."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None

        # Only 2% of users are suspended
        return context.random().random() < 0.02


@generator(SemanticType.BOOL_VERIFIED, priority=80)
class VerifiedFlagGenerator(BaseGenerator):
    """Generates verified flag - most users are verified."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None

        # 85% of users are verified
        return context.random().random() < 0.85


@generator(SemanticType.BOOL_PUBLIC, priority=80)
class PublicFlagGenerator(BaseGenerator):
    """Generates public visibility flag."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None

        field_name = semantics.field_name

        if field_name == "public":
            # Conversations: 80% public
            return context.random().random() < 0.80
        elif field_name == "is_public":
            # Groups: 70% public
            return context.random().random() < 0.70
        elif field_name == "is_public_reply":
            # 60% are public replies
            return context.random().random() < 0.60

        return context.random().choice([True, False])


@generator(SemanticType.BOOL_DEFAULT, priority=80)
class DefaultFlagGenerator(BaseGenerator):
    """Generates is_default flag - only one per category typically."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None

        # Only ~10% are defaults (one per category)
        return context.random().random() < 0.10


@generator(SemanticType.BOOL_SPAM, priority=80)
class SpamFlagGenerator(BaseGenerator):
    """Generates spam flag - few tickets are spam."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None

        # Only 3% are spam
        return context.random().random() < 0.03


@generator(SemanticType.BOOL_GENERIC, priority=20)
class GenericBoolGenerator(BaseGenerator):
    """Fallback generator for boolean fields."""

    # Fields that should default to True more often
    FAVOR_TRUE = [
        "report_csv", "active",
    ]

    # Fields that should default to False more often
    FAVOR_FALSE = [
        "moderator", "only_private_comments", "restricted_agent",
        "shared", "shared_agent", "two_factor_auth_enabled",
    ]

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.1):
            return None

        field_name = semantics.field_name
        default = semantics.default_value

        # Use default value as a hint
        if default is not None:
            # Favor the default value 80% of the time
            if context.random().random() < 0.80:
                return default
            return not default

        if field_name in self.FAVOR_TRUE:
            return context.random().random() < 0.85

        if field_name in self.FAVOR_FALSE:
            return context.random().random() < 0.10

        return context.random().choice([True, False])
