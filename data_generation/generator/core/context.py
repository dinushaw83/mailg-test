"""
Generation context for cross-field awareness and consistency.

The context holds the current state of generation including:
- Generated IDs for foreign key resolution
- Current row being generated (for field dependencies)
- Configuration (distributions, etc.)
"""

from dataclasses import dataclass, field
from typing import Any
import random


@dataclass
class GenerationContext:
    """
    Context passed to generators for stateful generation.

    Provides access to:
    - Generated IDs for foreign key lookups
    - Current row data for field consistency
    - Configuration for distributions
    - Row index for deterministic generation
    """

    # Table currently being generated
    table_name: str = ""

    # Current row index (1-based)
    row_index: int = 0

    # Current row data (for consistency between fields)
    current_row: dict[str, Any] = field(default_factory=dict)

    # Generated IDs per table for FK resolution
    generated_ids: dict[str, list[Any]] = field(default_factory=dict)

    # Generated IDs filtered by attribute (e.g., users with role=agent)
    # Format: {table: {attr_name: {attr_value: [ids]}}}
    generated_ids_by_attr: dict[str, dict[str, dict[Any, list[Any]]]] = field(default_factory=dict)

    # Assignment counts for constraint enforcement
    # Format: {table.field: {entity_id: count}}
    assignment_counts: dict[str, dict[Any, int]] = field(default_factory=dict)

    # Total row counts per table (for percentage calculations)
    table_row_counts: dict[str, int] = field(default_factory=dict)

    # Configuration loaded from YAML
    config: dict[str, Any] = field(default_factory=dict)

    # Random state for reproducibility (optional seed)
    _random: random.Random = field(default_factory=random.Random)

    def set_seed(self, seed: int) -> None:
        """Set random seed for reproducibility."""
        self._random = random.Random(seed)

    def random(self) -> random.Random:
        """Get the random instance."""
        return self._random

    def get_foreign_key_value(
        self,
        ref_table: str,
        nullable: bool = True,
        null_probability: float = 0.1,
    ) -> Any:
        """
        Get a random foreign key value from a referenced table.

        Args:
            ref_table: Name of the referenced table.
            nullable: Whether null is allowed.
            null_probability: Probability of returning None for nullable FKs.

        Returns:
            A random ID from the referenced table, or None.
        """
        ids = self.generated_ids.get(ref_table, [])

        if not ids:
            return None

        if nullable and self._random.random() < null_probability:
            return None

        return self._random.choice(ids)

    def get_distribution_value(
        self,
        category: str,
        field_name: str,
        default: list[tuple[str, float]] | None = None,
    ) -> str:
        """
        Get a value based on configured distribution.

        Args:
            category: Configuration category (e.g., "tickets").
            field_name: Field name (e.g., "status").
            default: Default distribution as [(value, weight), ...] (deprecated, use config).

        Returns:
            Randomly selected value based on distribution.

        Raises:
            ValueError: If distribution not found in config and no default provided.
        """
        # Try to get from config first (preferred)
        distributions = self.config.get("distributions", {})
        category_dist = distributions.get(category, {})
        field_dist = category_dist.get(field_name)

        if field_dist:
            values = list(field_dist.keys())
            weights = list(field_dist.values())
            return self._random.choices(values, weights=weights)[0]

        # Fallback to default if provided (for backward compatibility)
        if default:
            values = [v for v, _ in default]
            weights = [w for _, w in default]
            return self._random.choices(values, weights=weights)[0]

        # No config and no default - raise error
        raise ValueError(
            f"Distribution not found for {category}.{field_name} in config. "
            f"Please add it to the distributions section of your config file."
        )

    def get_enum_values(
        self,
        category: str,
        field_name: str,
        default: list[str] | None = None,
    ) -> list[str]:
        """
        Get enum values from config or default.

        Args:
            category: Configuration category.
            field_name: Field name.
            default: Default values.

        Returns:
            List of possible enum values.
        """
        enums = self.config.get("enums", {})
        category_enums = enums.get(category, {})
        values = category_enums.get(field_name)

        if values:
            return values

        return default or []

    def get_field_value(self, field_name: str) -> Any:
        """Get a value from the current row being generated."""
        return self.current_row.get(field_name)

    def set_field_value(self, field_name: str, value: Any) -> None:
        """Set a value in the current row."""
        self.current_row[field_name] = value

    def register_id(self, table_name: str, id_value: Any, **attributes) -> None:
        """Register a generated ID for foreign key resolution."""
        if table_name not in self.generated_ids:
            self.generated_ids[table_name] = []
        self.generated_ids[table_name].append(id_value)

        # Also register by attributes if provided
        for attr_name, attr_value in attributes.items():
            if attr_value is None:
                continue
            if table_name not in self.generated_ids_by_attr:
                self.generated_ids_by_attr[table_name] = {}
            if attr_name not in self.generated_ids_by_attr[table_name]:
                self.generated_ids_by_attr[table_name][attr_name] = {}
            if attr_value not in self.generated_ids_by_attr[table_name][attr_name]:
                self.generated_ids_by_attr[table_name][attr_name][attr_value] = []
            self.generated_ids_by_attr[table_name][attr_name][attr_value].append(id_value)

    def get_ids_by_attr(self, table_name: str, attr_name: str, attr_value: Any) -> list[Any]:
        """Get IDs filtered by attribute value (e.g., users with role=agent)."""
        return self.generated_ids_by_attr.get(table_name, {}).get(attr_name, {}).get(attr_value, [])

    def track_assignment(self, table_name: str, field_name: str, entity_id: Any) -> None:
        """Track an assignment for constraint enforcement."""
        key = f"{table_name}.{field_name}"
        if key not in self.assignment_counts:
            self.assignment_counts[key] = {}
        self.assignment_counts[key][entity_id] = self.assignment_counts[key].get(entity_id, 0) + 1

    def get_assignment_count(self, table_name: str, field_name: str, entity_id: Any) -> int:
        """Get current assignment count for an entity."""
        key = f"{table_name}.{field_name}"
        return self.assignment_counts.get(key, {}).get(entity_id, 0)

    def get_constrained_fk_value(
        self,
        ref_table: str,
        table_name: str,
        field_name: str,
        max_percentage: float,
        filter_by: dict[str, Any] | None = None,
        nullable: bool = True,
        null_probability: float = 0.1,
    ) -> Any:
        """
        Get a foreign key value respecting assignment constraints.

        Args:
            ref_table: Name of the referenced table.
            table_name: Current table being generated.
            field_name: Field being generated.
            max_percentage: Max % of total rows an entity can be assigned.
            filter_by: Filter by attributes, e.g., {"role": "agent"}.
            nullable: Whether null is allowed.
            null_probability: Probability of returning None.

        Returns:
            A valid ID or None.
        """
        # Get candidate IDs
        if filter_by:
            # Filter by all specified attributes (intersection)
            ids = None
            for attr_name, attr_value in filter_by.items():
                # Handle list values (e.g., {"role": ["member", "admin"]})
                if isinstance(attr_value, list):
                    # Union of all matching attribute values
                    attr_ids = set()
                    for val in attr_value:
                        attr_ids.update(self.get_ids_by_attr(ref_table, attr_name, val))
                else:
                    # Single value
                    attr_ids = set(self.get_ids_by_attr(ref_table, attr_name, attr_value))

                if ids is None:
                    ids = attr_ids
                else:
                    ids = ids & attr_ids
            ids = list(ids) if ids else []
        else:
            ids = self.generated_ids.get(ref_table, [])

        if not ids:
            return None

        if nullable and self._random.random() < null_probability:
            return None

        # Calculate max assignments per entity
        total_rows = self.table_row_counts.get(table_name, 100)
        max_assignments = max(1, int(total_rows * max_percentage / 100))

        # Filter out entities that have reached their cap
        available_ids = [
            id_val for id_val in ids
            if self.get_assignment_count(table_name, field_name, id_val) < max_assignments
        ]

        if not available_ids:
            # All entities at cap, return None or random if not nullable
            if nullable:
                return None
            available_ids = ids  # Fallback to any ID

        selected_id = self._random.choice(available_ids)
        self.track_assignment(table_name, field_name, selected_id)
        return selected_id

    def new_row(self, table_name: str, row_index: int) -> None:
        """Start a new row generation."""
        self.table_name = table_name
        self.row_index = row_index
        self.current_row = {}
