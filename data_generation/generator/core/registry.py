"""
Generator registry with priority-based matching.

Generators register themselves with patterns and priorities.
Higher priority matches take precedence.
"""

from typing import Any, Callable, Type
from dataclasses import dataclass, field

from .analyzer import FieldSemantics, SemanticType


@dataclass
class GeneratorMatch:
    """Represents a generator match specification."""
    generator_class: Type["BaseGenerator"]
    priority: int = 50
    semantic_types: list[SemanticType] = field(default_factory=list)
    tables: list[str] = field(default_factory=list)
    fields: list[str] = field(default_factory=list)

    def matches(self, semantics: FieldSemantics) -> tuple[bool, int]:
        """
        Check if this generator matches the field semantics.

        Returns:
            Tuple of (matches, effective_priority).
            Effective priority is boosted for more specific matches.
        """
        base_priority = self.priority

        # Check semantic type match
        if self.semantic_types:
            if semantics.semantic_type not in self.semantic_types:
                return False, 0
            base_priority += 10  # Boost for semantic match

        # Check table match (more specific = higher priority)
        if self.tables:
            if semantics.table_name not in self.tables:
                return False, 0
            base_priority += 20  # Boost for table match

        # Check field match (most specific = highest priority)
        if self.fields:
            if semantics.field_name not in self.fields:
                return False, 0
            base_priority += 30  # Boost for field match

        return True, base_priority


class GeneratorRegistry:
    """
    Central registry for all field generators.

    Generators are matched based on semantic type, table name, and field name.
    The highest priority matching generator is used.
    """

    _instance = None
    _matches: list[GeneratorMatch] = []

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._matches = []
        return cls._instance

    @classmethod
    def register(
        cls,
        generator_class: Type["BaseGenerator"],
        priority: int = 50,
        semantic_types: list[SemanticType] | None = None,
        tables: list[str] | None = None,
        fields: list[str] | None = None,
    ) -> None:
        """
        Register a generator class with matching criteria.

        Args:
            generator_class: The generator class to register.
            priority: Base priority (higher = preferred). Default 50.
            semantic_types: List of semantic types this generator handles.
            tables: List of table names (for table-specific generators).
            fields: List of field names (for field-specific generators).
        """
        match = GeneratorMatch(
            generator_class=generator_class,
            priority=priority,
            semantic_types=semantic_types or [],
            tables=tables or [],
            fields=fields or [],
        )
        cls._matches.append(match)

    @classmethod
    def get_generator(cls, semantics: FieldSemantics) -> "BaseGenerator | None":
        """
        Get the best matching generator for a field.

        Args:
            semantics: Analyzed field semantics.

        Returns:
            Instance of the best matching generator, or None.
        """
        best_match = None
        best_priority = -1

        for match in cls._matches:
            matches, priority = match.matches(semantics)
            if matches and priority > best_priority:
                best_match = match
                best_priority = priority

        if best_match:
            return best_match.generator_class()

        return None

    @classmethod
    def clear(cls) -> None:
        """Clear all registered generators (for testing)."""
        cls._matches = []


# Decorator for convenient registration
def generator(
    *semantic_types: SemanticType,
    priority: int = 50,
    tables: list[str] | None = None,
    fields: list[str] | None = None,
) -> Callable[[Type], Type]:
    """
    Decorator to register a generator class.

    Usage:
        @generator(SemanticType.EMAIL, priority=80)
        class EmailGenerator(BaseGenerator):
            ...

        @generator(SemanticType.PERSON_NAME, tables=["users"])
        class UserNameGenerator(BaseGenerator):
            ...
    """
    def decorator(cls: Type) -> Type:
        GeneratorRegistry.register(
            generator_class=cls,
            priority=priority,
            semantic_types=list(semantic_types) if semantic_types else None,
            tables=tables,
            fields=fields,
        )
        return cls

    return decorator


# Import BaseGenerator type for type hints
from ..generators.base import BaseGenerator
