"""
Main data generator orchestrating fake data generation for all tables.

Uses the registry pattern to match fields to appropriate generators,
applies consistency rules, and respects foreign key dependencies.
"""

import csv
import io
import json
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

from .schema_loader import (
    load_schema,
    get_tables,
    get_table_properties,
    get_required_fields,
    get_unique_constraints,
)
from .dependency_resolver import get_generation_order, get_table_dependencies
from .core.analyzer import FieldAnalyzer
from .core.registry import GeneratorRegistry
from .core.context import GenerationContext
from .config import load_config
from .rules import ConsistencyRules

# Import generators to trigger registration
from . import generators  # noqa: F401


class DataGenerator:
    """
    Generator for creating fake data based on Deskzen schema.

    Features:
    - Semantic field analysis for intelligent data generation
    - Priority-based generator matching
    - Configurable distributions via YAML
    - Foreign key relationship handling
    - Post-generation consistency rules
    """

    def __init__(
        self,
        schema_path: str | Path | None = None,
        config_path: str | Path | None = None,
        seed: int | None = None,
        start_ids: dict[str, int] | None = None,
        default_start_id: int = 1,
        use_seed: bool = True,
    ):
        """
        Initialize the generator.

        Args:
            schema_path: Optional path to schema file.
            config_path: Optional path to config YAML file.
            seed: Optional random seed for reproducibility.
            start_ids: Optional dict mapping table names to starting ID values.
            default_start_id: Default starting ID for tables not in start_ids.
            use_seed: Whether to inject seed data (users, orgs, groups) from config.
        """
        self.schema = load_schema(schema_path)
        self.tables = get_tables(self.schema)
        self.config = load_config(config_path)
        self.use_seed = use_seed

        self.analyzer = FieldAnalyzer(self.config)
        self.consistency = ConsistencyRules(self.config, self.schema)

        self.context = GenerationContext()
        self.context.config = self.config

        # Merge start_ids: config defaults + explicit overrides
        config_start_ids = self.config.get("start_ids", {})
        merged_start_ids = {**config_start_ids, **(start_ids or {})}
        self.context.start_ids = merged_start_ids
        self.context.default_start_id = default_start_id

        if seed is not None:
            self.context.set_seed(seed)

        self.generated_data: dict[str, list[dict[str, Any]]] = {}

    def generate_table(
        self,
        table_name: str,
        num_rows: int,
        include_dependencies: bool = True,
    ) -> dict[str, list[dict[str, Any]]]:
        """
        Generate fake data for a specific table.

        Args:
            table_name: Name of the table to generate.
            num_rows: Number of rows to generate.
            include_dependencies: If True, also generates required parent tables.

        Returns:
            Dict mapping table names to list of generated records.
        """
        if table_name not in self.tables:
            raise ValueError(f"Unknown table: {table_name}")

        result: dict[str, list[dict[str, Any]]] = {}

        if include_dependencies:
            # Generate dependencies first
            deps = get_table_dependencies(self.schema, table_name)
            order = get_generation_order(self.schema)

            # Filter to just dependencies and the target table
            tables_to_generate = [t for t in order if t in deps or t == table_name]

            for dep_table in tables_to_generate:
                if dep_table not in self.generated_data:
                    # Use config defaults or generate proportional rows
                    if dep_table != table_name:
                        dep_rows = self._get_default_rows(dep_table)
                    else:
                        dep_rows = num_rows

                    records = self._generate_table_records(dep_table, dep_rows)
                    self.generated_data[dep_table] = records
                    result[dep_table] = records
        else:
            records = self._generate_table_records(table_name, num_rows)
            self.generated_data[table_name] = records
            result[table_name] = records

        return result

    def register_existing_ids(self, existing_ids: dict[str, list]) -> None:
        """
        Register existing IDs from database for FK resolution.

        Also updates start_ids to avoid ID conflicts when generating new records.

        Args:
            existing_ids: Dict mapping table names to list of existing IDs.
        """
        for table_name, ids in existing_ids.items():
            for id_val in ids:
                self.context.register_id(table_name, id_val)
            # Update start_id to avoid conflicts with existing IDs
            if ids:
                int_ids = [id for id in ids if isinstance(id, int)]
                if int_ids:
                    max_id = max(int_ids)
                    current_start = self.context.start_ids.get(table_name, self.context.default_start_id)
                    if max_id >= current_start:
                        self.context.start_ids[table_name] = max_id + 1

    def register_existing_ids_with_attrs(
        self, existing_data: dict[str, list[dict]]
    ) -> None:
        """
        Register existing IDs with their attributes from database.

        This is needed for contextual FK constraints where we need to filter
        referenced entities by attribute values (e.g., boards by project_id).

        Args:
            existing_data: Dict mapping table names to list of dicts with 'id' and attributes.
                          e.g., {"boards": [{"id": 1, "project_id": 1}, ...]}
        """
        for table_name, records in existing_data.items():
            for record in records:
                id_val = record.get("id")
                if id_val is None:
                    continue

                # Extract attributes (everything except 'id')
                attrs = {k: v for k, v in record.items() if k != "id"}

                # Register with attributes for contextual FK lookup
                self.context.register_id(table_name, id_val, **attrs)

            # Update start_id to avoid conflicts
            if records:
                int_ids = [r["id"] for r in records if isinstance(r.get("id"), int)]
                if int_ids:
                    max_id = max(int_ids)
                    current_start = self.context.start_ids.get(table_name, self.context.default_start_id)
                    if max_id >= current_start:
                        self.context.start_ids[table_name] = max_id + 1

    def load_existing_data(self, table_data: dict[str, list[dict]]) -> None:
        """
        Load full existing data from database for FK resolution and distribution analysis.

        This is the preferred method for loading existing data as it:
        1. Registers all IDs for FK resolution
        2. Registers IDs with their attribute values for contextual FKs
        3. Pre-computes assignment counts for constraint checking
        4. Stores full records for distribution analysis

        Args:
            table_data: Dict mapping table names to list of row dicts.
                       e.g., {"users": [{"id": 1, "role": "admin", ...}, ...]}
        """
        self.context.load_existing_records(table_data, schema=self.tables)

    def generate_all(
        self,
        row_counts: dict[str, int] | None = None,
        default_rows: int | None = None,
        existing_counts: dict[str, int] | None = None,
    ) -> dict[str, list[dict[str, Any]]]:
        """
        Generate fake data for all tables.

        Args:
            row_counts: Optional dict mapping table names to row counts.
                        These are TOTAL counts including existing/seed data.
            default_rows: Default number of rows for tables not in row_counts.
            existing_counts: Optional dict of existing row counts from database.
                            If provided, uses these instead of seed counts from config.
                            Typically used with --no-seed when appending to existing DB.

        Returns:
            Dict mapping table names to list of generated records.
        """
        if row_counts is None:
            row_counts = {}

        if default_rows is None:
            default_rows = self.config.get("default_rows", 100)

        order = get_generation_order(self.schema)
        result: dict[str, list[dict[str, Any]]] = {}

        # Get seed counts from config (pattern: seed_{table_name})
        seed_counts = {}
        for key, value in self.config.items():
            if key.startswith("seed_") and isinstance(value, list):
                table_name = key[5:]  # Remove "seed_" prefix
                seed_counts[table_name] = len(value)

        # Use existing_counts from DB if provided, otherwise default to 0
        if existing_counts is None:
            existing_counts = {}

        # Pre-calculate row counts for all tables (needed for percentage constraints)
        # Row counts are TOTAL including existing/seed data
        for table_name in order:
            if table_name in row_counts:
                total_rows = row_counts[table_name]
            else:
                total_rows = self._get_default_rows(table_name, default_rows)
            self.context.table_row_counts[table_name] = total_rows

        for table_name in order:
            total_rows = self.context.table_row_counts[table_name]

            # Calculate how many NEW records to generate
            existing_count = existing_counts.get(table_name, 0)
            seed_count = seed_counts.get(table_name, 0)

            if self.use_seed:
                # With seed: new = requested - seed_count - existing
                # We'll prepend seed records, so subtract both
                num_new_rows = max(0, total_rows - seed_count - existing_count)
            else:
                # Without seed (--no-seed): new = requested - existing
                # All records are brand new
                num_new_rows = max(0, total_rows - existing_count)

            records = self._generate_table_records(table_name, num_new_rows)

            # Inject seed data if enabled
            if self.use_seed:
                seed_records = self._get_seed_data(table_name)
                if seed_records:
                    records = seed_records + records

            self.generated_data[table_name] = records
            result[table_name] = records

            # Register IDs with attributes for assignment constraints
            self._register_ids_with_attributes(table_name, records)

        # Apply cross-table consistency checks after all data is generated
        self._apply_cross_table_consistency(result)

        # Sort self-referencing tables for correct insertion order
        self._sort_self_referencing_tables(result)

        self.generated_data = result

        return result


    def _get_field_value_config(
        self, table_name: str, field_name: str
    ) -> dict[str, Any] | None:
        """
        Get field_values configuration if defined for this field.

        Returns:
            Field value config dict or None if not configured.
        """
        field_values = self.config.get("field_values", {})
        table_config = field_values.get(table_name, {})
        return table_config.get(field_name)

    def _check_field_group_null(
        self, table_name: str, field_name: str
    ) -> bool | None:
        """
        Check if a field is in a group and whether the group should be null.

        If the field is in a group:
        - First field in group decides null/not-null based on group's null_probability
        - Subsequent fields in group use the same decision

        Returns:
            True if field should be null (group is null)
            False if field should have a value (group is not null)
            None if field is not in any group
        """
        field_groups = self.config.get("field_groups", {})
        table_groups = field_groups.get(table_name, {})

        # Find which group this field belongs to
        for group_name, group_config in table_groups.items():
            fields = group_config.get("fields", [])
            if field_name in fields:
                # Check if decision already made for this group
                existing_decision = self.context.get_field_group_null(group_name)
                if existing_decision is not None:
                    return existing_decision

                # First field in group - make the decision
                null_prob = group_config.get("null_probability", 0.5)
                is_null = self.context.random().random() < null_prob
                self.context.set_field_group_null(group_name, is_null)
                return is_null

        return None  # Field not in any group

    def _generate_field_from_config(
        self, semantics, config: dict[str, Any]
    ) -> Any:
        """
        Generate a field value from config-specified source.

        Supports:
        - source: path to config list (e.g., "samples.label_names")
        - values: inline list of values
        - unique: ensure uniqueness (default False)
        - null_probability: chance of returning None (default from semantics)

        Args:
            semantics: Field semantics
            config: Field value config from field_values section

        Returns:
            Generated value or None
        """
        table_name = semantics.table_name
        field_name = semantics.field_name

        # Check null probability
        null_prob = config.get("null_probability")
        if null_prob is None and semantics.is_nullable:
            null_prob = 0.1  # Default for nullable fields
        if null_prob and self.context.random().random() < null_prob:
            return None

        # Get values list from config
        values = self._resolve_field_values(config)
        if not values:
            return None

        # Handle uniqueness
        unique = config.get("unique", False)
        if unique:
            return self._pick_unique_value(table_name, field_name, values)
        else:
            return self.context.random().choice(values)

    def _resolve_field_values(self, config: dict[str, Any]) -> list[Any]:
        """
        Resolve the list of possible values from config.

        Supports:
        - values: inline list
        - source: dot-path to config location (e.g., "samples.label_names")

        Returns:
            List of possible values, or empty list if not found.
        """
        # Inline values take precedence
        if "values" in config:
            return config["values"]

        # Resolve from source path
        source = config.get("source")
        if not source:
            return []

        # Navigate config using dot-path
        parts = source.split(".")
        current = self.config
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return []

        # Handle different value formats
        if isinstance(current, list):
            # Check if it's a list of dicts with a specific field
            field = config.get("field")
            if field and current and isinstance(current[0], dict):
                return [item.get(field) for item in current if item.get(field)]
            return current

        return []

    def _pick_unique_value(
        self, table_name: str, field_name: str, values: list[Any]
    ) -> Any | None:
        """
        Pick a unique value that hasn't been used before.

        Args:
            table_name: Current table name
            field_name: Field name
            values: List of possible values

        Returns:
            Unique value or None if all values exhausted
        """
        # Shuffle to randomize selection
        available = list(values)
        self.context.random().shuffle(available)

        for value in available:
            if not self.context.is_unique_value_used(table_name, field_name, value):
                self.context.register_unique_value(table_name, field_name, value)
                return value

        # All values used - append suffix to make unique
        base_value = self.context.random().choice(values)
        counter = 1
        while self.context.is_unique_value_used(table_name, field_name, f"{base_value}_{counter}"):
            counter += 1
            if counter > 1000:
                return None
        unique_value = f"{base_value}_{counter}"
        self.context.register_unique_value(table_name, field_name, unique_value)
        return unique_value

    def _get_derived_field_config(
        self, table_name: str, field_name: str
    ) -> dict[str, Any] | None:
        """
        Get derived field configuration if field has one.

        Returns:
            Derived field config dict or None if not a derived field.
        """
        derived_config = self.config.get("derived_fields", {})
        table_config = derived_config.get(table_name, {})
        return table_config.get(field_name)

    def _generate_derived_field(
        self, table_name: str, field_name: str, config: dict[str, Any]
    ) -> Any:
        """
        Generate a derived field value based on another field.

        Supports derivation types:
        - email_from_name: Generate email from a name field (firstname.lastname@domain)
        - username_from_name: Generate username from a name field
        - html_from_text: Convert plain text to HTML (for body → html_body)

        Args:
            table_name: Current table name
            field_name: Field being generated
            config: Derivation config from derived_fields section

        Returns:
            Generated derived value
        """
        derivation_type = config.get("type", "email_from_name")
        source_field = config.get("from_field")

        if not source_field:
            return None

        source_value = self.context.get_field_value(source_field)
        if source_value is None:
            return None

        if derivation_type == "email_from_name":
            return self._derive_email_from_name(source_value, config)
        elif derivation_type == "username_from_name":
            return self._derive_username_from_name(source_value, config)
        elif derivation_type == "html_from_text":
            return self._derive_html_from_text(source_value, config)
        else:
            return None

    def _derive_email_from_name(
        self, name: str, config: dict[str, Any]
    ) -> str:
        """
        Derive an email address from a person's name.

        Args:
            name: Full name (e.g., "John Doe", "Jane Smith-Jones")
            config: Config with 'domains' list and optional 'separator'

        Returns:
            Email like "john.doe@example.com"
        """
        domains = config.get("domains", ["example.com"])
        separator = config.get("separator", ".")
        lowercase = config.get("lowercase", True)

        # Parse the name into parts
        parts = name.strip().split()
        if not parts:
            # Fallback to random email
            return self.context.fake().unique.email()

        # Handle various name formats
        if len(parts) == 1:
            # Single name: use as-is
            local_part = parts[0]
        else:
            # Multi-part name: first.last
            first_name = parts[0]
            last_name = parts[-1]  # Use last part as surname

            # Clean up names (remove suffixes like Jr., III, etc.)
            # and handle hyphenated names
            first_clean = first_name.replace("-", "").replace("'", "")
            last_clean = last_name.replace("-", "").replace("'", "")

            local_part = f"{first_clean}{separator}{last_clean}"

        if lowercase:
            local_part = local_part.lower()

        # Remove any non-alphanumeric characters except separator
        import re
        allowed_chars = f"[^a-zA-Z0-9{re.escape(separator)}]"
        local_part = re.sub(allowed_chars, "", local_part)

        # Pick a random domain
        domain = self.context.random().choice(domains)

        # Ensure uniqueness by appending number if needed
        email = f"{local_part}@{domain}"
        unique_key = f"{self.context.table_name}.email"

        counter = 1
        while self.context.is_unique_value_used(
            self.context.table_name, "email", email
        ):
            email = f"{local_part}{counter}@{domain}"
            counter += 1
            if counter > 1000:
                # Fallback to random email
                return self.context.fake().unique.email()

        self.context.register_unique_value(self.context.table_name, "email", email)
        return email

    def _derive_username_from_name(
        self, name: str, config: dict[str, Any]
    ) -> str:
        """
        Derive a username from a person's name.

        Args:
            name: Full name (e.g., "John Doe")
            config: Config with optional 'separator' and 'style'

        Returns:
            Username like "johndoe" or "john_doe"
        """
        separator = config.get("separator", "")
        style = config.get("style", "firstlast")  # firstlast, first_last, first.last

        parts = name.strip().split()
        if not parts:
            return self.context.fake().user_name()

        if len(parts) == 1:
            username = parts[0].lower()
        else:
            first_name = parts[0].lower()
            last_name = parts[-1].lower()

            if style == "first_last":
                username = f"{first_name}_{last_name}"
            elif style == "first.last":
                username = f"{first_name}.{last_name}"
            elif style == "flast":
                username = f"{first_name[0]}{last_name}"
            else:  # firstlast
                username = f"{first_name}{separator}{last_name}"

        # Clean up
        import re
        username = re.sub(r"[^a-z0-9._]", "", username)

        return username

    def _derive_html_from_text(
        self, text: str, config: dict[str, Any]
    ) -> str:
        """
        Derive HTML content from plain text.

        Args:
            text: Plain text content
            config: Config with optional 'style' (basic, paragraphs, rich)

        Returns:
            HTML formatted version of the text
        """
        import html

        style = config.get("style", "paragraphs")

        # Escape HTML entities in the source text
        escaped_text = html.escape(text)

        if style == "basic":
            # Simple: just wrap in <p> and convert newlines to <br>
            html_content = escaped_text.replace("\n", "<br>\n")
            return f"<p>{html_content}</p>"

        elif style == "paragraphs":
            # Convert double newlines to paragraphs, single newlines to <br>
            paragraphs = escaped_text.split("\n\n")
            html_paragraphs = []
            for para in paragraphs:
                para = para.strip()
                if para:
                    # Convert single newlines within paragraph to <br>
                    para = para.replace("\n", "<br>\n")
                    html_paragraphs.append(f"<p>{para}</p>")
            return "\n".join(html_paragraphs)

        elif style == "rich":
            # More elaborate: add DOCTYPE, html/body wrapper
            paragraphs = escaped_text.split("\n\n")
            html_paragraphs = []
            for para in paragraphs:
                para = para.strip()
                if para:
                    para = para.replace("\n", "<br>\n")
                    html_paragraphs.append(f"  <p>{para}</p>")
            body_content = "\n".join(html_paragraphs)
            return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
{body_content}
</body>
</html>"""

        else:
            # Default to paragraphs style
            return self._derive_html_from_text(text, {"style": "paragraphs"})

    def _order_fields_for_generation(
        self,
        field_names: list[str],
        table_name: str,
    ) -> list[str]:
        """
        Order fields for generation based on:
        1. Explicit field_order config (for context-aware fields like YEAR, MONTH, DAY)
        2. Derived field dependencies (source fields before derived)
        3. Remaining fields in original order

        Args:
            field_names: List of field names to order
            table_name: Current table name

        Returns:
            Ordered list of field names
        """
        result = []
        remaining = set(field_names)

        # 1. Apply explicit field_order from config
        field_order = self.config.get("field_order", {}).get(table_name, [])
        for field_name in field_order:
            if field_name in remaining:
                result.append(field_name)
                remaining.remove(field_name)

        # 2. Apply derivation ordering to remaining fields
        derived_config = self.config.get("derived_fields", {}).get(table_name, {})

        if derived_config:
            # Build dependency graph: derived_field -> source_field
            dependencies = {}
            for field_name, config in derived_config.items():
                source_field = config.get("from_field")
                if source_field and field_name in remaining:
                    dependencies[field_name] = source_field

            if dependencies:
                source_fields = set(dependencies.values())
                derived_fields = set(dependencies.keys())

                # Add source fields first (if not already added)
                for f in list(remaining):
                    if f in source_fields and f not in derived_fields:
                        result.append(f)
                        remaining.remove(f)

                # Add non-derived fields
                for f in list(remaining):
                    if f not in derived_fields:
                        result.append(f)
                        remaining.remove(f)

                # Add derived fields last
                for f in list(remaining):
                    if f in derived_fields:
                        result.append(f)
                        remaining.remove(f)

        # 3. Add any remaining fields in original order
        for f in field_names:
            if f in remaining:
                result.append(f)

        return result

    def _apply_cross_table_consistency(
        self, data: dict[str, list[dict[str, Any]]]
    ) -> None:
        """
        Apply cross-table consistency checks after all data is generated.

        This ensures fields that depend on related table data are accurate.
        For example, threads.last_email_at should match the created_at of
        the most recent email in that thread.
        """
        # Create receiver copies for sent emails and generate proper email_recipients
        if "emails" in data and "users" in data:
            self._create_email_sender_receiver_structure(data)

        # Update threads.last_email_at based on actual emails
        if "threads" in data and "emails" in data:
            threads = data["threads"]
            emails = data["emails"]

            # Group emails by thread_id
            emails_by_thread: dict[str, list[dict[str, Any]]] = {}
            for email in emails:
                thread_id = email.get("thread_id")
                if thread_id:
                    if thread_id not in emails_by_thread:
                        emails_by_thread[thread_id] = []
                    emails_by_thread[thread_id].append(email)

            # Update each thread's email_count and last_email_at
            for thread in threads:
                thread_id = thread.get("id")
                if not thread_id:
                    continue

                thread_emails = emails_by_thread.get(thread_id, [])

                # Update email_count to match actual number of emails
                thread["email_count"] = len(thread_emails)

                if thread_emails:
                    # Find the most recent email's created_at timestamp
                    # Filter to emails with valid created_at and parse to datetime for proper comparison
                    emails_with_timestamp = [
                        e for e in thread_emails if e.get("created_at")
                    ]
                    if emails_with_timestamp:
                        latest_email = max(
                            emails_with_timestamp,
                            key=lambda e: datetime.fromisoformat(
                                e["created_at"].replace("Z", "+00:00")
                            ),
                        )
                        thread["last_email_at"] = latest_email["created_at"]
                else:
                    # No emails in this thread, set last_email_at to None
                    thread["last_email_at"] = None

        # Propagate deletion status in label hierarchy
        if "labels" in data:
            self._propagate_label_deletion(data)

        # Filter out deleted labels from thread_labels
        if "thread_labels" in data and "labels" in data:
            self._filter_deleted_labels_from_threads(data)

        # Limit thread_labels to maximum 4 per thread
        if "thread_labels" in data and "threads" in data:
            self._limit_thread_labels_per_thread(data)

        # Ensure thread_labels.user_id matches label.owner_id
        if "thread_labels" in data and "labels" in data:
            self._ensure_thread_label_user_matches_label_owner(data)

    def _propagate_label_deletion(
        self, data: dict[str, list[dict[str, Any]]]
    ) -> None:
        """
        Propagate deletion status in label hierarchy.

        If a parent label is deleted, all its children (and their children)
        should also be marked as deleted to maintain data integrity.
        """
        import logging

        logger = logging.getLogger(__name__)

        labels = data.get("labels", [])
        if not labels:
            return

        # Build a map of label_id -> label for quick lookup
        label_map = {label["id"]: label for label in labels}

        # Build a map of parent_id -> list of children
        children_map: dict[str, list[dict[str, Any]]] = {}
        for label in labels:
            parent_id = label.get("parent_id")
            if parent_id:
                if parent_id not in children_map:
                    children_map[parent_id] = []
                children_map[parent_id].append(label)

        # Recursively mark children as deleted if parent is deleted
        def mark_children_deleted(parent_label_id: str) -> int:
            """Mark all children (and descendants) of a label as deleted."""
            count = 0
            children = children_map.get(parent_label_id, [])
            for child in children:
                if not child.get("is_deleted", False):
                    child["is_deleted"] = True
                    count += 1
                    # Recursively mark grandchildren
                    count += mark_children_deleted(child["id"])
            return count

        # Find all deleted labels and propagate to their children
        deleted_count = 0
        for label in labels:
            if label.get("is_deleted", False):
                # This label is deleted, mark all its children as deleted
                propagated = mark_children_deleted(label["id"])
                if propagated > 0:
                    deleted_count += propagated

        if deleted_count > 0:
            logger.info(
                f"Propagated deletion to {deleted_count} child label(s) based on parent deletion status"
            )

    def _filter_deleted_labels_from_threads(
        self, data: dict[str, list[dict[str, Any]]]
    ) -> None:
        """
        Remove thread_labels that reference deleted labels.

        Deleted labels should not be assigned to threads to maintain data consistency.
        """
        import logging

        logger = logging.getLogger(__name__)

        labels = data.get("labels", [])
        thread_labels = data.get("thread_labels", [])

        if not labels or not thread_labels:
            return

        # Build set of deleted label IDs
        deleted_label_ids = {
            label["id"] for label in labels if label.get("is_deleted", False)
        }

        if not deleted_label_ids:
            # No deleted labels, nothing to filter
            return

        # Filter out thread_labels that reference deleted labels
        original_count = len(thread_labels)
        filtered_thread_labels = [
            el for el in thread_labels if el["label_id"] not in deleted_label_ids
        ]

        removed_count = original_count - len(filtered_thread_labels)

        if removed_count > 0:
            data["thread_labels"] = filtered_thread_labels
            logger.info(
                f"Removed {removed_count} thread_label(s) that referenced deleted labels. "
                f"Remaining: {len(filtered_thread_labels)}"
            )

    def _limit_thread_labels_per_thread(
        self, data: dict[str, list[dict[str, Any]]]
    ) -> None:
        """
        Limit the number of labels per thread to a maximum of 4.

        If a thread has more than 4 labels, keep only the first 4.
        This ensures the UI doesn't become cluttered with too many labels.
        """
        import logging

        logger = logging.getLogger(__name__)

        thread_labels = data.get("thread_labels", [])
        if not thread_labels:
            return

        # Group thread_labels by thread_id
        labels_by_thread: dict[str, list[dict[str, Any]]] = {}
        for thread_label in thread_labels:
            thread_id = thread_label.get("thread_id")
            if thread_id:
                if thread_id not in labels_by_thread:
                    labels_by_thread[thread_id] = []
                labels_by_thread[thread_id].append(thread_label)

        # Filter to keep only first 4 labels per thread
        kept_labels = []
        removed_count = 0

        for thread_id, labels in labels_by_thread.items():
            if len(labels) > 4:
                # Keep first 4 labels
                kept_labels.extend(labels[:4])
                removed_count += len(labels) - 4
            else:
                kept_labels.extend(labels)

        # Update the data with filtered labels
        data["thread_labels"] = kept_labels

        if removed_count > 0:
            logger.info(
                f"Limited thread_labels: removed {removed_count} labels to maintain max 4 labels per thread. "
                f"Total thread_labels: {len(kept_labels)}"
            )

    def _ensure_thread_label_user_matches_label_owner(
        self, data: dict[str, list[dict[str, Any]]]
    ) -> None:
        """
        Ensure thread_labels.user_id matches the owner_id of the referenced label.

        Each user can only apply their own labels to threads. This method updates
        thread_labels to ensure user_id matches the owner_id of the label being applied.
        """
        import logging

        logger = logging.getLogger(__name__)

        labels = data.get("labels", [])
        thread_labels = data.get("thread_labels", [])

        if not labels or not thread_labels:
            return

        # Build a map of label_id -> owner_id
        label_owner_map = {label["id"]: label["owner_id"] for label in labels}

        # Update each thread_label to use the label's owner_id as user_id
        updated_count = 0
        for thread_label in thread_labels:
            label_id = thread_label.get("label_id")
            if label_id in label_owner_map:
                correct_user_id = label_owner_map[label_id]
                current_user_id = thread_label.get("user_id")

                if current_user_id != correct_user_id:
                    thread_label["user_id"] = correct_user_id
                    updated_count += 1

        if updated_count > 0:
            logger.info(
                f"Updated {updated_count} thread_label(s) to match label owner_id. "
                f"Total thread_labels: {len(thread_labels)}"
            )

    def _create_email_sender_receiver_structure(
        self, data: dict[str, list[dict[str, Any]]]
    ) -> None:
        """
        Create sender and receiver email copies following the backend pattern.

        For each email, set folder based on status:
        - sent -> folder=sent, is_read=true
        - received -> folder=inbox, is_read=false
        - draft -> folder=drafts
        - queued -> folder=drafts
        - archived -> folder=inbox (archived)
        - cancelled -> folder=drafts

        For each sent email:
        - Original record becomes the sender copy
        - Create N receiver copies (status=received, folder=inbox, is_read=false)
        - Generate proper email_recipients for both sender and receiver copies
        """
        import uuid
        from datetime import datetime
        import logging

        logger = logging.getLogger(__name__)

        emails = data["emails"]
        users = data["users"]
        user_ids = [u["id"] for u in users]

        # First pass: Set folder based on status for ALL emails
        updated_count = 0
        for email in emails:
            status = email.get("status", "draft")
            old_folder = email.get("folder")
            if status == "sent":
                email["folder"] = "sent"
                email["is_read"] = True
                updated_count += 1
            elif status == "received":
                email["folder"] = "inbox"
                email["is_read"] = False
                updated_count += 1
            elif status == "draft":
                email["folder"] = "drafts"
                updated_count += 1
            elif status == "queued":
                email["folder"] = "drafts"
                updated_count += 1
            elif status == "archived":
                email["folder"] = "inbox"  # Archived emails stay in inbox
                updated_count += 1
            elif status == "cancelled":
                email["folder"] = "drafts"
                updated_count += 1

        logger.info(f"Updated folder field for {updated_count} emails")

        # Second pass: Process emails to create proper sender/receiver structure
        # For "sent" emails: keep as sender copy and create receiver copies
        # For "received" emails: convert to receiver copy and create sender copy
        sent_emails = [e for e in emails if e.get("status") == "sent"]
        received_emails = [e for e in emails if e.get("status") == "received"]
        logger.info(f"Processing {len(sent_emails)} sent emails and {len(received_emails)} received emails")

        # Lists to collect new copies and email_recipients
        new_email_copies = []
        email_recipients_list = []

        # Process sent emails (create receiver copies)
        for sender_email in sent_emails:
            # Determine number of recipients (1-3 for realistic data)
            num_recipients = self.context.random().randint(1, 3)

            # Select random recipient users (different from sender)
            sender_id = sender_email.get("sender_id")
            available_recipients = [uid for uid in user_ids if uid != sender_id]

            if not available_recipients:
                continue

            # Sample recipients (with replacement if not enough users)
            if len(available_recipients) >= num_recipients:
                recipient_ids = self.context.random().sample(available_recipients, num_recipients)
            else:
                recipient_ids = self.context.random().choices(available_recipients, k=num_recipients)

            # Update sender copy properties (folder and is_read already set in first pass)
            if not sender_email.get("sent_at"):
                sender_email["sent_at"] = sender_email.get("created_at") or datetime.utcnow().isoformat()

            # Create email_recipients for sender copy (one for each recipient)
            for idx, recipient_id in enumerate(recipient_ids):
                recipient_user = next((u for u in users if u["id"] == recipient_id), None)
                if not recipient_user:
                    continue

                recipient_type = "to" if idx == 0 else self.context.random().choice(["to", "cc"])

                email_recipients_list.append({
                    "id": str(self.context.fake().uuid4()),
                    "email_id": sender_email["id"],
                    "recipient_id": recipient_id,
                    "recipient_email": recipient_user.get("email"),
                    "recipient_name": f"{recipient_user.get('first_name', '')} {recipient_user.get('last_name', '')}".strip(),
                    "recipient_type": recipient_type,
                })

            # Create receiver copies (one per recipient)
            for recipient_id in recipient_ids:
                recipient_user = next((u for u in users if u["id"] == recipient_id), None)
                if not recipient_user:
                    continue

                # Create receiver copy
                receiver_email = {
                    "id": str(self.context.fake().uuid4()),
                    "subject": sender_email["subject"],
                    "body": sender_email.get("body"),
                    "html_body": sender_email.get("html_body"),
                    "status": "received",
                    "folder": "inbox",  # Receiver copy goes to inbox
                    "is_read": False,
                    "is_starred": sender_email.get("is_starred", False),
                    "is_important": sender_email.get("is_important", False),
                    "category": sender_email.get("category", "primary"),
                    "snooze_until": None,
                    "scheduled_send_at": None,
                    "sender_id": sender_email["sender_id"],  # Same sender
                    "thread_id": sender_email.get("thread_id"),
                    "parent_email_id": None,
                    "sent_at": sender_email.get("sent_at"),
                    "received_at": sender_email.get("sent_at"),  # Received when sent
                    "is_deleted": False,
                    "created_at": sender_email.get("created_at"),
                    "updated_at": sender_email.get("updated_at"),
                }
                new_email_copies.append(receiver_email)

                # Create email_recipient for receiver copy (points to this recipient)
                email_recipients_list.append({
                    "id": str(self.context.fake().uuid4()),
                    "email_id": receiver_email["id"],
                    "recipient_id": recipient_id,
                    "recipient_email": recipient_user.get("email"),
                    "recipient_name": f"{recipient_user.get('first_name', '')} {recipient_user.get('last_name', '')}".strip(),
                    "recipient_type": "to",
                })

        logger.info(f"Created {len(new_email_copies)} receiver copies from sent emails")

        # Process received emails (create sender copies for them)
        # Track which (subject, sender_id, thread_id) combinations already have sent copies
        existing_sent_keys = set()
        for email in emails:
            if email.get("status") == "sent":
                key = (email.get("subject"), email.get("sender_id"), email.get("thread_id"))
                existing_sent_keys.add(key)

        for receiver_email in received_emails:
            # This is a standalone "received" email - treat it as a receiver copy
            # and create a sender copy for it

            sender_id = receiver_email.get("sender_id")
            subject = receiver_email.get("subject")
            thread_id = receiver_email.get("thread_id")

            # Check if a sender copy with same (subject, sender_id, thread_id) already exists
            sender_copy_key = (subject, sender_id, thread_id)
            if sender_copy_key in existing_sent_keys:
                # Sender copy already exists (e.g., from seed data), skip creating duplicate
                logger.debug(f"Skipping sender copy creation for received email {receiver_email['id'][:8]}... - sent copy already exists")

                # Still need to create email_recipient for this receiver copy
                # Determine recipient for this received email
                available_recipients = [uid for uid in user_ids if uid != sender_id]
                if available_recipients:
                    recipient_id = self.context.random().choice(available_recipients)
                    recipient_user = next((u for u in users if u["id"] == recipient_id), None)
                    if recipient_user:
                        email_recipients_list.append({
                            "id": str(self.context.fake().uuid4()),
                            "email_id": receiver_email["id"],
                            "recipient_id": recipient_id,
                            "recipient_email": recipient_user.get("email"),
                            "recipient_name": f"{recipient_user.get('first_name', '')} {recipient_user.get('last_name', '')}".strip(),
                            "recipient_type": "to",
                        })
                continue

            # Get recipient ID from the email owner/context (or select random user)
            # For a received email, we need to determine who received it
            # Let's pick a random user that's NOT the sender
            available_recipients = [uid for uid in user_ids if uid != sender_id]

            if not available_recipients:
                # If no other users, skip this email
                continue

            # Pick one recipient for this received email
            recipient_id = self.context.random().choice(available_recipients)
            recipient_user = next((u for u in users if u["id"] == recipient_id), None)

            if not recipient_user:
                continue

            # Mark this sent copy key as existing
            existing_sent_keys.add(sender_copy_key)

            # Create sender copy (the original email that was sent)
            sender_email = {
                "id": str(self.context.fake().uuid4()),
                "subject": receiver_email["subject"],
                "body": receiver_email.get("body"),
                "html_body": receiver_email.get("html_body"),
                "status": "sent",
                "folder": "sent",  # Sender copy goes to sent folder
                "is_read": True,
                "is_starred": receiver_email.get("is_starred", False),
                "is_important": receiver_email.get("is_important", False),
                "category": receiver_email.get("category", "primary"),
                "snooze_until": None,
                "scheduled_send_at": None,
                "sender_id": sender_id,
                "thread_id": receiver_email.get("thread_id"),
                "parent_email_id": None,
                "sent_at": receiver_email.get("received_at") or receiver_email.get("created_at"),
                "received_at": None,
                "is_deleted": False,
                "created_at": receiver_email.get("created_at"),
                "updated_at": receiver_email.get("updated_at"),
            }
            new_email_copies.append(sender_email)

            # Ensure receiver email has received_at set
            if not receiver_email.get("received_at"):
                receiver_email["received_at"] = receiver_email.get("created_at")

            # Create email_recipient for sender copy (points to the recipient)
            email_recipients_list.append({
                "id": str(self.context.fake().uuid4()),
                "email_id": sender_email["id"],
                "recipient_id": recipient_id,
                "recipient_email": recipient_user.get("email"),
                "recipient_name": f"{recipient_user.get('first_name', '')} {recipient_user.get('last_name', '')}".strip(),
                "recipient_type": "to",
            })

            # Create email_recipient for receiver copy
            email_recipients_list.append({
                "id": str(self.context.fake().uuid4()),
                "email_id": receiver_email["id"],
                "recipient_id": recipient_id,
                "recipient_email": recipient_user.get("email"),
                "recipient_name": f"{recipient_user.get('first_name', '')} {recipient_user.get('last_name', '')}".strip(),
                "recipient_type": "to",
            })

        logger.info(f"Created {len(received_emails)} sender copies from received emails")

        # Add new email copies to emails list
        data["emails"].extend(new_email_copies)
        logger.info(f"Total new email copies created: {len(new_email_copies)}")

        # Preserve existing email_recipients (from seed data) for emails that are NOT sent/received
        # These are typically draft, queued, archived, cancelled emails
        existing_recipients = data.get("email_recipients", [])
        processed_email_ids = {e["id"] for e in sent_emails + received_emails}
        preserved_recipients = [
            r for r in existing_recipients
            if r["email_id"] not in processed_email_ids
        ]

        # Combine preserved seed recipients with newly generated recipients
        all_recipients = preserved_recipients + email_recipients_list
        data["email_recipients"] = all_recipients
        logger.info(
            f"Created {len(email_recipients_list)} new email_recipient records, "
            f"preserved {len(preserved_recipients)} existing records, "
            f"total {len(all_recipients)} records"
        )

    def _sort_self_referencing_tables(
        self, data: dict[str, list[dict[str, Any]]]
    ) -> None:
        """
        Sort records in self-referencing tables to ensure parents come before children.

        This is necessary for tables like folders (parent_folder_id), labels (parent_id),
        and emails (parent_email_id) to avoid foreign key violations during insertion.
        """
        # Define self-referencing relationships: table -> parent_column
        self_ref_tables = {
            "folders": "parent_folder_id",
            "labels": "parent_id",
            "emails": "parent_email_id",
        }

        for table_name, parent_column in self_ref_tables.items():
            if table_name not in data:
                continue

            records = data[table_name]
            if not records:
                continue

            # Perform topological sort
            sorted_records = self._topological_sort(records, parent_column)
            data[table_name] = sorted_records

    def _topological_sort(
        self,
        records: list[dict[str, Any]],
        parent_column: str,
    ) -> list[dict[str, Any]]:
        """
        Topologically sort records based on parent-child relationships.

        Args:
            records: List of records to sort.
            parent_column: Name of the column containing parent ID reference.

        Returns:
            Sorted list where parents come before children.
        """
        # Build ID to record mapping
        id_to_record = {r["id"]: r for r in records}

        # Build dependency graph (child -> parent)
        dependencies: dict[str, str | None] = {}
        for record in records:
            record_id = record["id"]
            parent_id = record.get(parent_column)
            dependencies[record_id] = parent_id

        # Perform topological sort using DFS
        visited = set()
        sorted_ids = []

        def visit(record_id: str) -> None:
            if record_id in visited:
                return

            visited.add(record_id)

            # Visit parent first (if it exists in our dataset)
            parent_id = dependencies.get(record_id)
            if parent_id and parent_id in id_to_record:
                visit(parent_id)

            sorted_ids.append(record_id)

        # Visit all records
        for record_id in dependencies.keys():
            visit(record_id)

        # Return records in sorted order
        return [id_to_record[record_id] for record_id in sorted_ids]

    def _get_default_rows(self, table_name: str, fallback: int = 100) -> int:
        """Get default row count for a table from config."""
        table_defaults = self.config.get("table_defaults", {})
        return table_defaults.get(table_name, fallback)

    def _get_seed_data(self, table_name: str) -> list[dict[str, Any]]:
        """
        Get seed data for a table from config with complete field values.

        Looks for config key 'seed_{table_name}' and fills in defaults
        for any missing fields using the regular generator infrastructure.
        """
        config_key = f"seed_{table_name}"
        seed_records = self.config.get(config_key, [])
        if not seed_records:
            return []

        # Get table schema and analyze fields
        table_schema = self.tables.get(table_name, {})
        properties = get_table_properties(table_schema)
        required_fields = get_required_fields(table_schema)

        # Analyze all fields once
        field_semantics = {}
        for field_name, field_schema in properties.items():
            semantics = self.analyzer.analyze(field_name, field_schema, table_name)
            if field_name in required_fields:
                semantics.is_required = True
            field_semantics[field_name] = semantics

        complete_records = []

        for idx, seed in enumerate(seed_records):
            # Set up context for this seed record
            self.context.new_row(table_name, idx + 1)

            record = {}

            # Fill in all fields from schema
            for field_name, field_schema in properties.items():
                if field_name in seed:
                    # Use provided value
                    value = seed[field_name]
                else:
                    # Generate value using regular generator
                    semantics = field_semantics[field_name]
                    value = self._generate_field(semantics)

                record[field_name] = value
                self.context.set_field_value(field_name, value)

            # Apply consistency rules
            record = self.consistency.apply(record, table_name)

            complete_records.append(record)

            # Register seed ID for FK resolution
            if "id" in record and record["id"] is not None:
                # Get attributes to register from config
                attrs = self._get_registration_attributes(table_name, record)
                self.context.register_id(table_name, record["id"], **attrs)

        return complete_records

    def _get_registration_attributes(
        self, table_name: str, record: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Get attributes to register with an ID for FK filtering.

        Reads from config 'id_registration_attributes' which specifies
        which fields to track per table.
        """
        reg_config = self.config.get("id_registration_attributes", {})
        attr_fields = reg_config.get(table_name, [])

        attrs = {}
        for field_name in attr_fields:
            if field_name in record and record[field_name] is not None:
                attrs[field_name] = record[field_name]

        return attrs

    def _register_ids_with_attributes(
        self, table_name: str, records: list[dict[str, Any]]
    ) -> None:
        """Register IDs with attributes for FK filtering based on config."""
        reg_config = self.config.get("id_registration_attributes", {})
        attr_fields = reg_config.get(table_name, [])

        # Skip if no attributes to track for this table
        if not attr_fields:
            return

        for record in records:
            record_id = record.get("id")
            if record_id is None:
                continue

            attrs = {}
            for field_name in attr_fields:
                if field_name in record and record[field_name] is not None:
                    attrs[field_name] = record[field_name]

            if attrs:
                self.context.register_id(table_name, record_id, **attrs)

    def _is_junction_table(self, field_semantics: dict) -> list[str]:
        """
        Check if table is a junction table (all PK fields are also FKs).

        Returns list of composite PK field names if junction table, empty list otherwise.
        """
        pk_fk_fields = [
            name for name, sem in field_semantics.items()
            if sem.is_primary_key and sem.is_foreign_key
        ]
        # It's a junction table if there are 2+ fields that are both PK and FK
        if len(pk_fk_fields) >= 2:
            return pk_fk_fields
        return []

    def _generate_table_records(
        self,
        table_name: str,
        num_rows: int,
    ) -> list[dict[str, Any]]:
        """
        Generate records for a single table.

        Args:
            table_name: Name of the table.
            num_rows: Number of rows to generate.

        Returns:
            List of generated records.
        """
        table_schema = self.tables[table_name]
        properties = get_table_properties(table_schema)
        required_fields = get_required_fields(table_schema)
        unique_constraints = get_unique_constraints(table_schema)

        # Analyze all fields once
        field_semantics = {}
        for field_name, field_schema in properties.items():
            semantics = self.analyzer.analyze(field_name, field_schema, table_name)
            # Mark as required if in required list
            if field_name in required_fields:
                semantics.is_required = True
            field_semantics[field_name] = semantics

        # Check if this is a junction table with composite PK
        composite_pk_fields = self._is_junction_table(field_semantics)

        # Track used combinations for composite PKs and unique constraints
        used_combinations: dict[str, set[tuple]] = {}
        if composite_pk_fields:
            used_combinations["_composite_pk"] = set()
        for constraint in unique_constraints:
            constraint_key = "_".join(sorted(constraint))
            used_combinations[constraint_key] = set()

        # Pre-populate from existing DB records (loaded via load_existing_data)
        for constraint in unique_constraints:
            constraint_key = "_".join(sorted(constraint))
            existing = self.context.get_existing_composite_uniques(table_name, constraint)
            used_combinations[constraint_key].update(existing)

        # Pre-populate unique constraints with seed data to avoid duplicates
        if self.use_seed:
            seed_records = self._get_seed_data(table_name)
            if seed_records:
                # Add seed data combinations to used_combinations
                if composite_pk_fields:
                    for seed_record in seed_records:
                        pk_combo = tuple(seed_record.get(f) for f in composite_pk_fields)
                        used_combinations["_composite_pk"].add(pk_combo)

                for constraint in unique_constraints:
                    constraint_key = "_".join(sorted(constraint))
                    for seed_record in seed_records:
                        combo = tuple(seed_record.get(f) for f in constraint)
                        used_combinations[constraint_key].add(combo)

                # Special handling for emails table to prevent logical duplicates
                # Track (subject, sender_id, thread_id, status) from seed emails
                if table_name == "emails":
                    used_combinations["_email_logical_key"] = set()
                    for seed_record in seed_records:
                        logical_key = (
                            seed_record.get("subject"),
                            seed_record.get("sender_id"),
                            seed_record.get("thread_id"),
                            seed_record.get("status")
                        )
                        used_combinations["_email_logical_key"].add(logical_key)

        records = []

        for i in range(1, num_rows + 1):
            # Start new row in context
            self.context.new_row(table_name, i)

            max_retries = 100
            retry_count = 0
            record: dict[str, Any] = {}

            # Generate fields in order (PKs first, then others)
            pk_fields = [n for n, s in field_semantics.items() if s.is_primary_key]
            other_fields = [n for n, s in field_semantics.items() if not s.is_primary_key]

            # For junction tables and unique constraints, retry until we get unique values
            skip_row = False

            while True:
                for field_name in pk_fields:
                    semantics = field_semantics[field_name]
                    value = self._generate_field(semantics)
                    record[field_name] = value
                    self.context.set_field_value(field_name, value)

                # Check for duplicate composite key in junction tables
                if composite_pk_fields:
                    combo = tuple(record[f] for f in composite_pk_fields)
                    if combo in used_combinations.get("_composite_pk", set()):
                        retry_count += 1
                        if retry_count >= max_retries:
                            # Can't find unique combination, skip this row
                            skip_row = True
                            break
                        continue  # Try again
                    used_combinations["_composite_pk"].add(combo)
                break  # Success, exit retry loop

            # Skip row if we couldn't find unique combination
            if skip_row:
                continue

            # Generate non-PK fields (ordered for derivation and field_order config)
            ordered_fields = self._order_fields_for_generation(other_fields, table_name)
            for field_name in ordered_fields:
                semantics = field_semantics[field_name]

                # Check if this is a derived field
                derived_config = self._get_derived_field_config(table_name, field_name)
                if derived_config:
                    value = self._generate_derived_field(
                        table_name, field_name, derived_config
                    )
                else:
                    value = self._generate_field(semantics)

                record[field_name] = value
                self.context.set_field_value(field_name, value)

                # Register value by semantic type for context-aware generators
                self.context.register_semantic_type_value(semantics.semantic_type, value)

            # Check single-column unique FK fields after all fields are generated.
            # Non-FK unique fields (e.g., email) are handled by their own generators,
            # so we only need row-level enforcement for unique foreign keys.
            constraint_violated = False
            unique_fk_values_to_register = []
            for field_name, sem in field_semantics.items():
                if sem.is_unique and sem.is_foreign_key and not sem.is_primary_key:
                    value = record.get(field_name)
                    if value is not None and self.context.is_unique_value_used(table_name, field_name, value):
                        constraint_violated = True
                        break
                    if value is not None:
                        unique_fk_values_to_register.append((field_name, value))

            # Check composite unique constraints after all fields are generated
            if not constraint_violated:
                for constraint in unique_constraints:
                    constraint_key = "_".join(sorted(constraint))
                    combo = tuple(record.get(f) for f in constraint)
                    if combo in used_combinations.get(constraint_key, set()):
                        constraint_violated = True
                        break
                    used_combinations[constraint_key].add(combo)

            # Check email logical key (subject, sender_id, thread_id, status)
            if table_name == "emails" and "_email_logical_key" in used_combinations:
                logical_key = (
                    record.get("subject"),
                    record.get("sender_id"),
                    record.get("thread_id"),
                    record.get("status")
                )
                if logical_key in used_combinations["_email_logical_key"]:
                    constraint_violated = True
                else:
                    used_combinations["_email_logical_key"].add(logical_key)

            if constraint_violated:
                # Skip this row - violates unique constraint
                continue

            # Register primary key for FK resolution
            if not composite_pk_fields:
                # Single-column PK: register regardless of column name
                for field_name in pk_fields:
                    self.context.register_id(table_name, record[field_name])
            else:
                # Composite PK: register each component field for FK resolution
                for field_name in composite_pk_fields:
                    self.context.register_id(table_name, record[field_name])

            # Register single-column unique FK values now that the row is accepted
            for field_name, value in unique_fk_values_to_register:
                self.context.register_unique_value(table_name, field_name, value)

            # Apply consistency rules
            record = self.consistency.apply(record, table_name)

            records.append(record)

        return records

    def _generate_field(self, semantics) -> Any:
        """Generate a value for a field using the appropriate generator."""
        # Check if field is in a field group (for coordinated nullability)
        group_null = self._check_field_group_null(
            semantics.table_name, semantics.field_name
        )
        if group_null is True:
            return None  # Group decided to be null
        elif group_null is False:
            # Group decided not null - ensure generator produces a value
            semantics.is_nullable = False

        # Check for field_values config first (highest priority for non-PK/FK fields)
        field_value_config = self._get_field_value_config(
            semantics.table_name, semantics.field_name
        )
        if field_value_config:
            value = self._generate_field_from_config(semantics, field_value_config)
            if value is not None or semantics.is_nullable:
                return value
            # Fall through to registry if config returned None for required field

        # Get matching generator from registry
        gen = GeneratorRegistry.get_generator(semantics)

        if gen:
            value = gen.generate(semantics, self.context)
        else:
            # Fallback for unknown types
            value = None

        # Ensure required fields are not None
        if semantics.is_required and value is None:
            # Try again without null possibility
            if gen:
                # Temporarily mark as not nullable
                semantics.is_nullable = False
                value = gen.generate(semantics, self.context)
                semantics.is_nullable = True

        return value

    def to_json(self, output_dir: str | Path, separate_files: bool = True) -> None:
        """
        Write generated data to JSON files.

        Args:
            output_dir: Directory to write files to.
            separate_files: If True, creates one file per table.
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        if separate_files:
            for table_name, records in self.generated_data.items():
                file_path = output_dir / f"{table_name}.json"
                with open(file_path, "w") as f:
                    json.dump(records, f, indent=2)
        else:
            file_path = output_dir / "all_tables.json"
            with open(file_path, "w") as f:
                json.dump(self.generated_data, f, indent=2)

    def to_jsonl(self, output_dir: str | Path) -> None:
        """
        Write generated data to JSONL (JSON Lines) files.

        Note: JSONL is only supported for single-table output.

        Args:
            output_dir: Directory to write files to.
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        for table_name, records in self.generated_data.items():
            file_path = output_dir / f"{table_name}.jsonl"
            with open(file_path, "w") as f:
                for record in records:
                    f.write(json.dumps(record) + "\n")

    def to_csv(self, output_dir: str | Path) -> None:
        """
        Write generated data to CSV files (one per table).

        Args:
            output_dir: Directory to write files to.
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        for table_name, records in self.generated_data.items():
            if not records:
                continue

            file_path = output_dir / f"{table_name}.csv"
            fieldnames = list(records[0].keys())

            with open(file_path, "w", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(records)

    def to_zip(
        self,
        output_path: str | Path,
        format: Literal["json", "jsonl", "csv"] = "json",
    ) -> None:
        """
        Write generated data to a ZIP archive.

        Args:
            output_path: Path to the output ZIP file.
            format: Format for files inside the ZIP (json, jsonl, or csv).
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for table_name, records in self.generated_data.items():
                if not records:
                    continue

                if format == "json":
                    content = json.dumps(records, indent=2)
                    zf.writestr(f"{table_name}.json", content)

                elif format == "jsonl":
                    lines = [json.dumps(record) for record in records]
                    content = "\n".join(lines) + "\n"
                    zf.writestr(f"{table_name}.jsonl", content)

                elif format == "csv":
                    output = io.StringIO()
                    fieldnames = list(records[0].keys())
                    writer = csv.DictWriter(output, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(records)
                    zf.writestr(f"{table_name}.csv", output.getvalue())

    def write(
        self,
        output_dir: str | Path,
        format: Literal["json", "jsonl", "csv"] = "json",
        single_file: bool = False,
        zip_output: bool = False,
    ) -> str:
        """
        Write generated data in the specified format.

        Args:
            output_dir: Directory to write files to.
            format: Output format (json, jsonl, or csv).
            single_file: If True, combines all tables into single file (json only).
            zip_output: If True, creates a ZIP archive instead of loose files.

        Returns:
            Path to the output file or directory.
        """
        output_dir = Path(output_dir)

        if zip_output:
            zip_path = output_dir / f"data.{format}.zip"
            self.to_zip(zip_path, format)
            return str(zip_path)

        if format == "json":
            self.to_json(output_dir, separate_files=not single_file)
        elif format == "jsonl":
            self.to_jsonl(output_dir)
        elif format == "csv":
            self.to_csv(output_dir)

        return str(output_dir)

    def reset(self) -> None:
        """Reset all generated data."""
        self.generated_data.clear()
        self.context.generated_ids.clear()


def generate_all(
    schema_path: str | Path | None = None,
    config_path: str | Path | None = None,
    row_counts: dict[str, int] | None = None,
    default_rows: int = 100,
    seed: int | None = None,
    start_ids: dict[str, int] | None = None,
    default_start_id: int = 1,
) -> dict[str, list[dict[str, Any]]]:
    """
    Convenience function to generate all tables.

    Args:
        schema_path: Optional path to schema file.
        config_path: Optional path to config YAML file.
        row_counts: Optional dict mapping table names to row counts.
        default_rows: Default number of rows.
        seed: Optional random seed.
        start_ids: Optional dict mapping table names to starting ID values.
        default_start_id: Default starting ID for tables not in start_ids.

    Returns:
        Dict mapping table names to list of generated records.
    """
    generator = DataGenerator(schema_path, config_path, seed, start_ids, default_start_id)
    return generator.generate_all(row_counts, default_rows)


def generate_table(
    table_name: str,
    num_rows: int,
    schema_path: str | Path | None = None,
    config_path: str | Path | None = None,
    include_dependencies: bool = True,
    seed: int | None = None,
    start_ids: dict[str, int] | None = None,
    default_start_id: int = 1,
) -> dict[str, list[dict[str, Any]]]:
    """
    Convenience function to generate a single table.

    Args:
        table_name: Name of the table to generate.
        num_rows: Number of rows to generate.
        schema_path: Optional path to schema file.
        config_path: Optional path to config YAML file.
        include_dependencies: If True, generates required parent tables.
        seed: Optional random seed.
        start_ids: Optional dict mapping table names to starting ID values.
        default_start_id: Default starting ID for tables not in start_ids.

    Returns:
        Dict mapping table names to list of generated records.
    """
    generator = DataGenerator(schema_path, config_path, seed, start_ids, default_start_id)
    return generator.generate_table(table_name, num_rows, include_dependencies)
