"""
Numeric field generators for specialized types.

Handles sequence numbers, story points, ordering, and lexicographic ranking.
"""

from typing import Any

from .base import BaseGenerator
from ..core.analyzer import FieldSemantics, SemanticType
from ..core.context import GenerationContext
from ..core.registry import generator


@generator(SemanticType.SEQUENCE_NUM, priority=90)
class SequenceNumGenerator(BaseGenerator):
    """
    Generates per-project sequence numbers for tickets.

    Each project gets its own counter starting from 1.
    Format: tickets.sequence_num -> 1, 2, 3... per project_id
    """

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        # Get the project_id for this ticket
        project_id = context.get_field_value("project_id")

        if project_id is None:
            # If no project_id yet, return 1 as default
            return 1

        # Get or initialize counter for this project
        counter_key = f"sequence_counter_{project_id}"
        if not hasattr(context, '_sequence_counters'):
            context._sequence_counters = {}

        if counter_key not in context._sequence_counters:
            context._sequence_counters[counter_key] = 1

        sequence = context._sequence_counters[counter_key]
        context._sequence_counters[counter_key] += 1

        return sequence


@generator(SemanticType.STORY_POINTS, priority=90)
class StoryPointsGenerator(BaseGenerator):
    """
    Generates story points using Fibonacci sequence.

    Values: 1, 2, 3, 5, 8, 13, 21
    Often null for bugs and tasks.
    """

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        # Check ticket type - bugs and tasks often don't have story points
        ticket_type = context.get_field_value("type")

        if ticket_type in ("bug", "task"):
            if self.maybe_null(semantics, context, 0.7):
                return None
        elif self.maybe_null(semantics, context, 0.4):
            return None

        # Fibonacci sequence for story points
        fibonacci_points = [1, 2, 3, 5, 8, 13, 21]

        # Weight towards smaller values (more common)
        weights = [0.25, 0.25, 0.20, 0.15, 0.10, 0.04, 0.01]

        return context.random().choices(fibonacci_points, weights=weights)[0]


@generator(SemanticType.ORDER, priority=90)
class OrderGenerator(BaseGenerator):
    """
    Generates sequential order numbers.

    Used for board_columns.order, child_work_items.order, etc.
    Generates sequential numbers starting from 0 or 1.
    """

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context):
            return None

        # Get the current record count for this table to generate sequential order
        table_name = semantics.table_name

        # Initialize order counter if not present
        if not hasattr(context, '_order_counters'):
            context._order_counters = {}

        # Use parent field if available (e.g., board_id for board_columns)
        parent_field = None
        if table_name == "board_columns":
            parent_field = context.get_field_value("board_id")
        elif table_name == "child_work_items":
            parent_field = context.get_field_value("parent_ticket_id")

        counter_key = f"{table_name}_{parent_field}" if parent_field else table_name

        if counter_key not in context._order_counters:
            context._order_counters[counter_key] = 0

        order = context._order_counters[counter_key]
        context._order_counters[counter_key] += 1

        return order


@generator(SemanticType.RANK, priority=90)
class RankGenerator(BaseGenerator):
    """
    Generates lexicographic rank strings for drag-and-drop ordering.

    Format: "0|hzzzzz:" style strings used by lexorank algorithm.
    Allows for infinite insertions between any two items.
    """

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.2):
            return None

        # Generate a lexicographic rank string
        # Format: bucket|rank:
        # Bucket: 0, 1, or 2
        # Rank: base36 string

        bucket = context.random().choice(["0", "1", "2"])

        # Generate a random base36 string (6 characters)
        base36_chars = "0123456789abcdefghijklmnopqrstuvwxyz"
        rank = "".join(context.random().choice(base36_chars) for _ in range(6))

        return f"{bucket}|{rank}:"
