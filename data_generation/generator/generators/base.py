"""
Base generator class for all field generators.
"""

from abc import ABC, abstractmethod
from typing import Any

from faker import Faker

from ..core.context import GenerationContext
from ..core.analyzer import FieldSemantics


class BaseGenerator(ABC):
    """
    Abstract base class for field value generators.

    Subclasses implement generate() to produce values for specific
    semantic types. Generators are registered via the @generator decorator.
    """

    @abstractmethod
    def generate(
        self,
        semantics: FieldSemantics,
        context: GenerationContext,
    ) -> Any:
        """
        Generate a value for the field.

        Args:
            semantics: Analyzed field semantics.
            context: Current generation context.

        Returns:
            Generated value appropriate for the field.
        """
        pass

    def maybe_null(
        self,
        semantics: FieldSemantics,
        context: GenerationContext,
        null_probability: float = 0.1,
    ) -> bool:
        """
        Determine if this field should be null.

        Args:
            semantics: Field semantics.
            context: Generation context.
            null_probability: Default probability of null for nullable fields.

        Returns:
            True if the value should be None.
        """
        if not semantics.is_nullable:
            return False

        if semantics.is_required:
            return False

        # Check config for field-specific null probability override
        null_probs = context.config.get("null_probabilities", {})
        table_probs = null_probs.get(semantics.table_name, {})
        if semantics.field_name in table_probs:
            null_probability = table_probs[semantics.field_name]

        return context.random().random() < null_probability
