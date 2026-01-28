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

from faker import Faker


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

    # Starting ID values per table
    start_ids: dict[str, int] = field(default_factory=dict)

    # Default starting ID for tables not in start_ids
    default_start_id: int = 1

    # Configuration loaded from YAML
    config: dict[str, Any] = field(default_factory=dict)

    # Random state for reproducibility (optional seed)
    _random: random.Random = field(default_factory=random.Random)

    # Faker instance for reproducible fake data
    _faker: Faker = field(default_factory=Faker)

    # Track unique values per table.field to avoid duplicates
    # Format: {"table.field": set(used_values)}
    _unique_values: dict[str, set] = field(default_factory=dict)

    # Existing records loaded from database (full row data)
    # Format: {table_name: [row_dict, ...]}
    existing_records: dict[str, list[dict]] = field(default_factory=dict)

    # Cached field distributions computed from existing_records
    # Format: {"table.field": {value: count}}
    _existing_distributions: dict[str, dict[Any, int]] = field(default_factory=dict)

    # Cached assignment counts from existing records
    # Format: {"table.field": {entity_id: count}}
    _existing_assignment_counts: dict[str, dict[Any, int]] = field(default_factory=dict)

    # Existing composite unique constraint tuples
    # Format: {"table.constraint_key": set(tuple(values))}
    _existing_composite_uniques: dict[str, set[tuple]] = field(default_factory=dict)

    # Track field group null decisions for current row
    # Format: {"group_name": is_null (bool)}
    _field_group_nulls: dict[str, bool] = field(default_factory=dict)

    # Track values by semantic type for current row (for context-aware generation)
    # Format: {SemanticType: value}
    _semantic_type_values: dict[Any, Any] = field(default_factory=dict)

    def set_seed(self, seed: int) -> None:
        """Set random seed for reproducibility."""
        self._random = random.Random(seed)
        # Seed Faker for reproducible fake data
        Faker.seed(seed)
        self._faker = Faker()
        self._faker.seed_instance(seed)

    def random(self) -> random.Random:
        """Get the random instance."""
        return self._random

    def fake(self) -> Faker:
        """Get the seeded Faker instance."""
        return self._faker

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
        Get a value based on configured distribution, using enums as the master list.

        Logic:
        1. Look up enums.<category>.<field_name> — master list of valid values
        2. Look up distributions.<category>.<field_name> — optional weights
        3. If enums AND distribution: use distribution weights, distribute remainder
           equally among enum values not in the distribution
        4. If enums but NO distribution: equal weight across all enum values
        5. If NO enums but distribution: use distribution as-is
        6. If neither: fall back to default parameter, or raise ValueError

        Args:
            category: Configuration category (e.g., "emails").
            field_name: Field name (e.g., "status").
            default: Default distribution as [(value, weight), ...].

        Returns:
            Randomly selected value based on distribution.

        Raises:
            ValueError: If no enums, no distribution, and no default provided.
        """
        # Look up enums and distributions from config
        enum_values = self.config.get("enums", {}).get(category, {}).get(field_name)
        field_dist = self.config.get("distributions", {}).get(category, {}).get(field_name)

        if enum_values and field_dist:
            # Enums + distribution: use distribution weights, spread remainder to unlisted enums
            values = []
            weights = []
            dist_total = sum(field_dist.values())
            unlisted = [v for v in enum_values if v not in field_dist]

            for v, w in field_dist.items():
                values.append(v)
                weights.append(w)

            if unlisted and dist_total < 100:
                remainder = 100 - dist_total
                per_unlisted = remainder / len(unlisted)
                for v in unlisted:
                    values.append(v)
                    weights.append(per_unlisted)

            return self._random.choices(values, weights=weights)[0]

        if enum_values:
            # Enums only: equal weight
            return self._random.choice(enum_values)

        if field_dist:
            # Distribution only: use as-is
            values = list(field_dist.keys())
            weights = list(field_dist.values())
            return self._random.choices(values, weights=weights)[0]

        # Fallback to default if provided
        if default:
            values = [v for v, _ in default]
            weights = [w for _, w in default]
            return self._random.choices(values, weights=weights)[0]

        raise ValueError(
            f"No enums, distribution, or default for {category}.{field_name}. "
            f"Add it to the enums or distributions section of your config."
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

    def get_start_id(self, table_name: str) -> int:
        """Get the starting ID for a table."""
        return self.start_ids.get(table_name, self.default_start_id)

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
        # Include existing records when calculating total for percentage
        existing_count = self.get_existing_record_count(table_name)
        new_rows = self.table_row_counts.get(table_name, 100)
        total_rows = existing_count + new_rows
        max_assignments = max(1, int(total_rows * max_percentage / 100))

        # Filter out entities that have reached their cap (considering existing + new)
        available_ids = [
            id_val for id_val in ids
            if self.get_total_assignment_count(table_name, field_name, id_val) < max_assignments
        ]

        if not available_ids:
            # All entities at cap, return None or random if not nullable
            if nullable:
                return None
            available_ids = ids  # Fallback to any ID

        selected_id = self._random.choice(available_ids)
        self.track_assignment(table_name, field_name, selected_id)
        return selected_id

    def get_contextual_fk_value(
        self,
        ref_table: str,
        context_field: str,
        target_field: str,
        nullable: bool = True,
        null_probability: float = 0.1,
    ) -> Any:
        """
        Get a foreign key value that matches a contextual constraint.

        Used when an FK must reference a row that shares a common value with
        the current row. For example: ticket.board_id must reference a board
        where board.project_id == ticket.project_id.

        Args:
            ref_table: Name of the referenced table (e.g., "boards").
            context_field: Field in current row to match (e.g., "project_id").
            target_field: Field in referenced table that must match (e.g., "project_id").
            nullable: Whether null is allowed.
            null_probability: Probability of returning None for nullable FKs.

        Returns:
            A random ID from the referenced table that matches the constraint, or None.
        """
        # Get the value from the current row that we need to match
        context_value = self.current_row.get(context_field)

        if context_value is None:
            # Can't match if the context field is None
            if nullable:
                return None
            # For non-nullable, fall back to any ID
            ids = self.generated_ids.get(ref_table, [])
            return self._random.choice(ids) if ids else None

        # Get IDs from the referenced table that have the matching attribute value
        matching_ids = self.get_ids_by_attr(ref_table, target_field, context_value)

        if not matching_ids:
            # No matching IDs found
            if nullable:
                return None
            # For non-nullable, fall back to any ID (schema violation, but better than None)
            ids = self.generated_ids.get(ref_table, [])
            return self._random.choice(ids) if ids else None

        if nullable and self._random.random() < null_probability:
            return None

        return self._random.choice(matching_ids)

    def new_row(self, table_name: str, row_index: int) -> None:
        """Start a new row generation."""
        self.table_name = table_name
        self.row_index = row_index
        self.current_row = {}
        self._field_group_nulls = {}  # Clear group decisions for new row
        self._semantic_type_values = {}  # Clear semantic type values for new row

    def get_field_group_null(self, group_name: str) -> bool | None:
        """Get the null decision for a field group, or None if not yet decided."""
        return self._field_group_nulls.get(group_name)

    def set_field_group_null(self, group_name: str, is_null: bool) -> None:
        """Set the null decision for a field group."""
        self._field_group_nulls[group_name] = is_null

    def register_semantic_type_value(self, semantic_type: Any, value: Any) -> None:
        """Register a value for a semantic type in the current row."""
        self._semantic_type_values[semantic_type] = value

    def get_value_by_semantic_type(self, semantic_type: Any) -> Any | None:
        """Get the value for a semantic type in the current row, or None if not set."""
        return self._semantic_type_values.get(semantic_type)

    def is_unique_value_used(self, table_name: str, field_name: str, value: Any) -> bool:
        """Check if a value has already been used for a unique field."""
        key = f"{table_name}.{field_name}"
        return key in self._unique_values and value in self._unique_values[key]

    def register_unique_value(self, table_name: str, field_name: str, value: Any) -> None:
        """Register a value as used for a unique field."""
        key = f"{table_name}.{field_name}"
        if key not in self._unique_values:
            self._unique_values[key] = set()
        self._unique_values[key].add(value)

    def get_existing_composite_uniques(self, table_name: str, constraint_columns: list[str]) -> set[tuple]:
        """Get existing composite unique tuples for a constraint."""
        key = f"{table_name}.{'_'.join(sorted(constraint_columns))}"
        return self._existing_composite_uniques.get(key, set())

    def _populate_existing_unique_values(
        self, table_name: str, records: list[dict], table_schema: dict[str, Any]
    ) -> None:
        """
        Populate unique value tracking from existing records.

        Reads single-column unique fields and composite unique constraints
        from the schema and registers all existing values so that newly
        generated records won't collide.

        Args:
            table_name: Name of the table.
            records: Existing records for this table.
            table_schema: Schema definition for this table.
        """
        properties = table_schema.get("properties", {})

        # Single-column unique fields
        for field_name, field_def in properties.items():
            if field_def.get("unique", False):
                for record in records:
                    value = record.get(field_name)
                    if value is not None:
                        self.register_unique_value(table_name, field_name, value)

        # Composite unique constraints
        unique_constraints = table_schema.get("uniqueConstraints", [])
        for constraint in unique_constraints:
            key = f"{table_name}.{'_'.join(sorted(constraint))}"
            if key not in self._existing_composite_uniques:
                self._existing_composite_uniques[key] = set()
            for record in records:
                combo = tuple(record.get(f) for f in constraint)
                self._existing_composite_uniques[key].add(combo)

    def load_existing_records(self, table_data: dict[str, list[dict]], schema: dict[str, Any] | None = None) -> None:
        """
        Load existing records from database and register IDs with attributes.

        This method:
        1. Stores the full record data for distribution analysis
        2. Registers all IDs for FK resolution
        3. Registers IDs with their attribute values for contextual FKs
        4. Pre-computes assignment counts for constraint checking

        Args:
            table_data: Dict mapping table names to list of row dicts.
        """
        self.existing_records = table_data

        # Get attribute config from config
        attr_config = self.config.get("id_registration_attributes", {})
        derived_config = self.config.get("derived_id_attributes", {})

        # Build lookup tables for derived attribute resolution
        # Format: {table_name: {id: record}}
        table_by_id: dict[str, dict[Any, dict]] = {}
        for tbl_name, records in table_data.items():
            table_by_id[tbl_name] = {r.get("id"): r for r in records if r.get("id") is not None}

        for table_name, records in table_data.items():
            if not records:
                continue

            for record in records:
                id_value = record.get("id")
                if id_value is None:
                    continue

                # Get direct attributes to register for this table
                table_attrs = attr_config.get(table_name, [])
                attrs = {attr: record.get(attr) for attr in table_attrs if attr in record}

                # Compute derived attributes for this table
                derived_attrs = derived_config.get(table_name, {})
                for attr_name, spec in derived_attrs.items():
                    via_field = spec.get("via")
                    from_table = spec.get("from_table")
                    source_field = spec.get("source_field")

                    if not all([via_field, from_table, source_field]):
                        continue

                    # Get the FK value that links to the other table
                    fk_value = record.get(via_field)
                    if fk_value is None:
                        continue

                    # Look up the referenced record
                    ref_record = table_by_id.get(from_table, {}).get(fk_value)
                    if ref_record:
                        derived_value = ref_record.get(source_field)
                        if derived_value is not None:
                            attrs[attr_name] = derived_value

                # Register the ID with all attributes (direct + derived)
                self.register_id(table_name, id_value, **attrs)

            # Update start_ids to avoid conflicts
            int_ids = [r.get("id") for r in records if isinstance(r.get("id"), int)]
            if int_ids:
                max_id = max(int_ids)
                current_start = self.start_ids.get(table_name, self.default_start_id)
                if max_id >= current_start:
                    self.start_ids[table_name] = max_id + 1

        # Pre-compute assignment counts from existing data
        self._compute_existing_assignment_counts()

        # Populate unique value tracking from existing records
        if schema:
            for table_name, records in table_data.items():
                if records and table_name in schema:
                    self._populate_existing_unique_values(table_name, records, schema[table_name])

    def _compute_existing_assignment_counts(self) -> None:
        """
        Pre-compute assignment counts from existing records.

        This analyzes FK fields in existing data to determine how many times
        each entity is referenced, for use in constraint checking.
        """
        constraints = self.config.get("assignment_constraints", {})

        for table_name, field_constraints in constraints.items():
            records = self.existing_records.get(table_name, [])
            if not records:
                continue

            for field_name in field_constraints.keys():
                key = f"{table_name}.{field_name}"
                self._existing_assignment_counts[key] = {}

                for record in records:
                    entity_id = record.get(field_name)
                    if entity_id is not None:
                        self._existing_assignment_counts[key][entity_id] = \
                            self._existing_assignment_counts[key].get(entity_id, 0) + 1

    def get_existing_assignment_count(self, table_name: str, field_name: str, entity_id: Any) -> int:
        """Get assignment count from existing records for an entity."""
        key = f"{table_name}.{field_name}"
        return self._existing_assignment_counts.get(key, {}).get(entity_id, 0)

    def get_total_assignment_count(self, table_name: str, field_name: str, entity_id: Any) -> int:
        """Get total assignment count (existing + newly generated) for an entity."""
        existing = self.get_existing_assignment_count(table_name, field_name, entity_id)
        generated = self.get_assignment_count(table_name, field_name, entity_id)
        return existing + generated

    def get_existing_field_distribution(self, table_name: str, field_name: str) -> dict[Any, int]:
        """
        Get the distribution of values for a field in existing records.

        Args:
            table_name: Table to analyze.
            field_name: Field to get distribution for.

        Returns:
            Dict mapping field values to their counts.
        """
        key = f"{table_name}.{field_name}"

        # Return cached if available
        if key in self._existing_distributions:
            return self._existing_distributions[key]

        # Compute distribution from existing records
        records = self.existing_records.get(table_name, [])
        distribution: dict[Any, int] = {}

        for record in records:
            value = record.get(field_name)
            if value is not None:
                distribution[value] = distribution.get(value, 0) + 1

        # Cache for future use
        self._existing_distributions[key] = distribution
        return distribution

    def get_existing_record_count(self, table_name: str) -> int:
        """Get the count of existing records for a table."""
        return len(self.existing_records.get(table_name, []))

    def get_distribution_value_with_existing(
        self,
        category: str,
        field_name: str,
        maintain_existing_ratio: bool = False,
        default: list[tuple[str, float]] | None = None,
    ) -> str:
        """
        Get a value based on distribution, optionally accounting for existing data.

        When maintain_existing_ratio is True, adjusts the configured distribution
        to maintain the overall ratio from existing data when combined with new data.

        Args:
            category: Configuration category (e.g., "tickets").
            field_name: Field name (e.g., "status").
            maintain_existing_ratio: If True, adjust weights to maintain existing ratio.
            default: Default distribution as [(value, weight), ...].

        Returns:
            Randomly selected value based on distribution.
        """
        # Get configured distribution
        distributions = self.config.get("distributions", {})
        category_dist = distributions.get(category, {})
        field_dist = category_dist.get(field_name, {})

        if not field_dist and default:
            field_dist = {v: w for v, w in default}

        if not field_dist:
            raise ValueError(
                f"Distribution not found for {category}.{field_name} in config."
            )

        # If not maintaining existing ratio, use configured distribution
        if not maintain_existing_ratio:
            values = list(field_dist.keys())
            weights = list(field_dist.values())
            return self._random.choices(values, weights=weights)[0]

        # Get existing distribution
        existing_dist = self.get_existing_field_distribution(category, field_name)

        if not existing_dist:
            # No existing data, use configured distribution
            values = list(field_dist.keys())
            weights = list(field_dist.values())
            return self._random.choices(values, weights=weights)[0]

        # Calculate adjusted weights to maintain existing ratio
        existing_total = sum(existing_dist.values())
        new_rows = self.table_row_counts.get(category, 100)
        total_rows = existing_total + new_rows

        # Target distribution based on existing ratios
        adjusted_weights = {}
        for value in field_dist.keys():
            existing_count = existing_dist.get(value, 0)
            target_ratio = existing_count / existing_total if existing_total > 0 else 0
            target_count = int(total_rows * target_ratio)
            needed = max(0, target_count - existing_count)
            adjusted_weights[value] = max(1, needed)  # At least weight of 1

        values = list(adjusted_weights.keys())
        weights = list(adjusted_weights.values())
        return self._random.choices(values, weights=weights)[0]
