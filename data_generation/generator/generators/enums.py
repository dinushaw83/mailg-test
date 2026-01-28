"""
Enum generators for fields with predefined value sets.

Uses configurable distributions for realistic data.
"""

from typing import Any

from .base import BaseGenerator
from ..core.analyzer import FieldSemantics, SemanticType
from ..core.context import GenerationContext
from ..core.registry import generator


@generator(SemanticType.ROLE, priority=80)
class RoleGenerator(BaseGenerator):
    """Generates user roles with realistic distribution."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        # First check if schema defines enum values - always prefer schema
        enum_values = semantics.field_schema.get("enum")
        if enum_values:
            # Use distribution if configured, otherwise equal weights
            equal_weight = 1.0 / len(enum_values)
            default_distribution = [(v, equal_weight) for v in enum_values]
            return context.get_distribution_value(
                semantics.table_name, semantics.field_name,
                default=default_distribution
            )

        return context.get_distribution_value(
            "users", "role",
            default=[
                ("end-user", 0.70),
                ("agent", 0.25),
                ("admin", 0.05),
            ]
        )


@generator(SemanticType.ROLE_TYPE, priority=80)
class RoleTypeGenerator(BaseGenerator):
    """Generates numeric role types."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.3):
            return None

        role = context.get_field_value("role")
        role_map = {"end-user": 0, "agent": 1, "admin": 2}
        return role_map.get(role, context.random().randint(0, 2))


@generator(SemanticType.STATUS, priority=80)
class StatusGenerator(BaseGenerator):
    """Generates ticket status with realistic distribution."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        table = semantics.table_name

        # First check if schema defines enum values - always prefer schema
        enum_values = semantics.field_schema.get("enum")
        if enum_values:
            # Use distribution if configured, otherwise equal weights
            equal_weight = 1.0 / len(enum_values)
            default_distribution = [(v, equal_weight) for v in enum_values]
            return context.get_distribution_value(
                semantics.table_name, semantics.field_name,
                default=default_distribution
            )

        if table == "tickets":
            return context.get_distribution_value(
                "tickets", "status",
                default=[
                    ("solved", 0.45),
                    ("closed", 0.20),
                    ("open", 0.15),
                    ("pending", 0.12),
                    ("new", 0.08),
                ]
            )
        elif table == "side_conversations":
            return context.get_distribution_value(
                "side_conversations", "status",
                default=[
                    ("closed", 0.60),
                    ("open", 0.40),
                ]
            )
        else:
            # Use config distribution if available, otherwise generic fallback
            return context.get_distribution_value(
                semantics.table_name, semantics.field_name,
                default=[
                    ("open", 0.40),
                    ("closed", 0.40),
                    ("pending", 0.20),
                ]
            )


@generator(SemanticType.APPROVAL_STATUS, priority=80)
class ApprovalStatusGenerator(BaseGenerator):
    """Generates approval request status."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        # First check if schema defines enum values - always prefer schema
        enum_values = semantics.field_schema.get("enum")
        if enum_values:
            # Use distribution if configured, otherwise equal weights
            equal_weight = 1.0 / len(enum_values)
            default_distribution = [(v, equal_weight) for v in enum_values]
            return context.get_distribution_value(
                semantics.table_name, semantics.field_name,
                default=default_distribution
            )

        return context.get_distribution_value(
            "approval_requests", "status",
            default=[
                ("approved", 0.50),
                ("pending", 0.35),
                ("denied", 0.15),
            ]
        )


@generator(SemanticType.PRIORITY, priority=80)
class PriorityGenerator(BaseGenerator):
    """Generates ticket priority with realistic distribution."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.05):
            return None

        # First check if schema defines enum values - always prefer schema
        enum_values = semantics.field_schema.get("enum")
        if enum_values:
            # Use distribution if configured, otherwise equal weights
            equal_weight = 1.0 / len(enum_values)
            default_distribution = [(v, equal_weight) for v in enum_values]
            return context.get_distribution_value(
                semantics.table_name, semantics.field_name,
                default=default_distribution
            )

        return context.get_distribution_value(
            "tickets", "priority",
            default=[
                ("normal", 0.50),
                ("low", 0.25),
                ("high", 0.18),
                ("urgent", 0.07),
            ]
        )


@generator(SemanticType.TICKET_TYPE, priority=80)
class TicketTypeGenerator(BaseGenerator):
    """Generates ticket type."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        # First check if schema defines enum values - always prefer schema
        enum_values = semantics.field_schema.get("enum")
        if enum_values:
            # Use distribution if configured, otherwise equal weights
            equal_weight = 1.0 / len(enum_values)
            default_distribution = [(v, equal_weight) for v in enum_values]
            return context.get_distribution_value(
                semantics.table_name, semantics.field_name,
                default=default_distribution
            )

        return context.get_distribution_value(
            "tickets", "type",
            default=[
                ("question", 0.45),
                ("incident", 0.30),
                ("problem", 0.15),
                ("task", 0.10),
            ]
        )


@generator(SemanticType.TAG_TYPE, priority=80)
class TagTypeGenerator(BaseGenerator):
    """Generates tag types."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        return context.get_distribution_value(
            "tags", "type",
            default=[
                ("ticket", 0.60),
                ("user", 0.25),
                ("article", 0.15),
            ]
        )


@generator(SemanticType.CONVERSATION_TYPE, priority=80)
class ConversationTypeGenerator(BaseGenerator):
    """Generates conversation types."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        return context.get_distribution_value(
            "conversations", "type",
            default=[
                ("Comment", 0.70),
                ("Reply", 0.30),
            ]
        )


@generator(SemanticType.SIDE_CONV_TYPE, priority=80)
class SideConversationTypeGenerator(BaseGenerator):
    """Generates side conversation types."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        return context.get_distribution_value(
            "side_conversations", "type",
            default=[
                ("email", 0.60),
                ("slack", 0.25),
                ("child_ticket", 0.15),
            ]
        )


@generator(SemanticType.LEVEL, priority=80)
class LogLevelGenerator(BaseGenerator):
    """Generates log levels."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        return context.get_distribution_value(
            "api_logs", "level",
            default=[
                ("INFO", 0.85),
                ("WARNING", 0.10),
                ("ERROR", 0.05),
            ]
        )


@generator(SemanticType.OPERATION, priority=80)
class OperationGenerator(BaseGenerator):
    """Generates API operation types."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        return context.get_distribution_value(
            "api_logs", "operation",
            default=[
                ("READ", 0.60),
                ("UPDATE", 0.20),
                ("CREATE", 0.12),
                ("DELETE", 0.05),
                ("RESTORE", 0.03),
            ]
        )


@generator(SemanticType.HTTP_METHOD, priority=80)
class HttpMethodGenerator(BaseGenerator):
    """Generates HTTP methods."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        operation = context.get_field_value("operation")
        method_map = {
            "READ": "GET",
            "CREATE": "POST",
            "UPDATE": "PUT",
            "DELETE": "DELETE",
            "RESTORE": "POST",
        }
        return method_map.get(operation, "GET")


@generator(SemanticType.RESOURCE_TYPE, priority=80)
class ResourceTypeGenerator(BaseGenerator):
    """Generates API resource types."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        return context.get_distribution_value(
            "api_logs", "resource",
            default=[
                ("ticket", 0.50),
                ("user", 0.25),
                ("organization", 0.10),
                ("article", 0.08),
                ("group", 0.07),
            ]
        )


@generator(SemanticType.CHANNEL, priority=80)
class ChannelGenerator(BaseGenerator):
    """Generates communication channels."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.1):
            return None

        return context.get_distribution_value(
            "conversations", "via_channel",
            default=[
                ("web", 0.45),
                ("email", 0.35),
                ("api", 0.15),
                ("chat", 0.05),
            ]
        )


@generator(SemanticType.STATUS_CATEGORY, priority=80)
class StatusCategoryGenerator(BaseGenerator):
    """Generates status categories for custom statuses."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        return context.get_distribution_value(
            "statuses", "status_category",
            default=[
                ("OPEN", 0.25),
                ("PENDING", 0.20),
                ("SOLVED", 0.25),
                ("NEW", 0.15),
                ("HOLD", 0.15),
            ]
        )


@generator(SemanticType.SEARCH_TYPE, priority=80)
class SearchTypeGenerator(BaseGenerator):
    """Generates saved search types."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        return context.get_distribution_value(
            "saved_searches", "search_type",
            default=[
                ("tickets", 0.60),
                ("users", 0.20),
                ("organizations", 0.12),
                ("articles", 0.08),
            ]
        )


@generator(SemanticType.STATUS_CODE, priority=80)
class StatusCodeGenerator(BaseGenerator):
    """Generates HTTP status codes."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None

        level = context.get_field_value("level")

        if level == "ERROR":
            return context.random().choices(
                [400, 401, 403, 404, 500, 502, 503],
                weights=[0.25, 0.15, 0.15, 0.20, 0.15, 0.05, 0.05]
            )[0]
        elif level == "WARNING":
            return context.random().choices(
                [200, 201, 400, 404],
                weights=[0.3, 0.1, 0.4, 0.2]
            )[0]
        else:
            return context.random().choices(
                [200, 201, 204],
                weights=[0.70, 0.20, 0.10]
            )[0]


@generator(SemanticType.DURATION, priority=80)
class DurationGenerator(BaseGenerator):
    """Generates duration in milliseconds."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.05):
            return None

        level = context.get_field_value("level")

        # Slower for errors
        if level == "ERROR":
            return context.random().randint(500, 30000)
        elif level == "WARNING":
            return context.random().randint(200, 5000)
        else:
            # Most requests are fast
            if context.random().random() < 0.8:
                return context.random().randint(10, 200)
            else:
                return context.random().randint(200, 2000)
