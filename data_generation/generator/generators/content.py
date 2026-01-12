"""
Content generators for text fields like subjects, bodies, descriptions.
"""

from typing import Any

from .base import BaseGenerator
from ..core.analyzer import FieldSemantics, SemanticType
from ..core.context import GenerationContext
from ..core.registry import generator


@generator(SemanticType.SUBJECT, priority=80)
class SubjectGenerator(BaseGenerator):
    """Generates email/ticket subject lines."""

    DEFAULT_TEMPLATES = [
        "Issue with {topic}",
        "Question about {topic}",
        "Help needed: {topic}",
        "Unable to {action}",
        "Error when {action}",
        "{topic} not working",
        "Request: {topic}",
        "Urgent: {topic} problem",
        "How to {action}?",
        "Feature request: {topic}",
    ]

    DEFAULT_TOPICS = [
        "login", "password reset", "billing", "subscription",
        "account access", "payment", "invoice", "user permissions",
        "integration", "API", "export", "import", "notifications",
        "email settings", "profile update", "mobile app",
    ]

    DEFAULT_ACTIONS = [
        "login", "reset password", "access account", "update profile",
        "export data", "import users", "configure settings",
        "connect integration", "view reports", "send notifications",
    ]

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None

        templates_cfg = context.config.get("templates", {})
        subjects_cfg = templates_cfg.get("subjects", {})

        # Support both formats:
        # 1. Flat list: subjects.patterns = [...]
        # 2. Categorized: subjects.personal = [...], subjects.professional = [...]
        if "patterns" in subjects_cfg:
            templates = subjects_cfg["patterns"]
        else:
            # Flatten all category lists into one
            templates = []
            for key, value in subjects_cfg.items():
                if isinstance(value, list):
                    templates.extend(value)
            if not templates:
                templates = self.DEFAULT_TEMPLATES

        template = context.random().choice(templates)
        return self._fill_placeholders(template, templates_cfg, context)

    def _fill_placeholders(
        self, template: str, config: dict, context: GenerationContext
    ) -> str:
        """
        Replace {placeholder} patterns with values from config.

        Supports three formats in config:
        1. Simple list: templates.names: ["Alex", "Jordan", ...]
        2. Source reference: templates.names: {source: samples.first_names}
        3. Generator: templates.name: {generator: FIRST_NAME}  # uses SemanticType

        If not found, keeps the placeholder as-is.
        """
        import re
        from ..core.registry import GeneratorRegistry

        def replace_match(match):
            placeholder = match.group(1)
            # Try singular, then plural form in config
            placeholder_config = config.get(placeholder) or config.get(f"{placeholder}s")

            if placeholder_config is None:
                return match.group(0)

            # Simple list
            if isinstance(placeholder_config, list):
                return context.random().choice(placeholder_config)

            # Dict with source or generator
            if isinstance(placeholder_config, dict):
                # Source reference - resolve from config path
                if "source" in placeholder_config:
                    values = self._resolve_source(placeholder_config["source"], context)
                    if values:
                        return context.random().choice(values)

                # Generator - use existing semantic type generators
                if "generator" in placeholder_config:
                    generator_name = placeholder_config["generator"]
                    try:
                        semantic_type = SemanticType[generator_name.upper()]
                        # Create minimal semantics for the generator
                        placeholder_semantics = FieldSemantics(
                            semantic_type=semantic_type,
                            confidence=1.0,
                            field_name=placeholder,
                            table_name=context.table_name,
                            field_schema={},
                        )
                        gen = GeneratorRegistry.get_generator(placeholder_semantics)
                        if gen:
                            value = gen.generate(placeholder_semantics, context)
                            return str(value) if value else match.group(0)
                    except KeyError:
                        pass  # Invalid semantic type

            return match.group(0)

        # Run until no more placeholders are resolved (handles nesting)
        result = template
        max_iterations = 5  # Prevent infinite loops
        for _ in range(max_iterations):
            new_result = re.sub(r"\{(\w+)\}", replace_match, result)
            if new_result == result:
                break
            result = new_result
        return result

    def _resolve_source(self, source_path: str, context: GenerationContext) -> list:
        """Resolve a dot-path source to a list of values."""
        parts = source_path.split(".")
        current = context.config
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return []
        return current if isinstance(current, list) else []


@generator(SemanticType.TITLE, priority=80)
class TitleGenerator(BaseGenerator):
    """Generates article/document titles."""

    DEFAULT_TEMPLATES = [
        "How to {action}",
        "Getting started with {topic}",
        "Understanding {topic}",
        "{topic} best practices",
        "Troubleshooting {topic}",
        "Complete guide to {topic}",
        "{topic} FAQ",
        "Setting up {topic}",
        "{topic} configuration guide",
        "Introduction to {topic}",
    ]

    DEFAULT_TOPICS = [
        "user management", "ticket workflows", "automation rules",
        "reporting", "integrations", "API access", "security settings",
        "team collaboration", "customer portal", "knowledge base",
        "SLA policies", "custom fields", "triggers and automations",
    ]

    DEFAULT_ACTIONS = [
        "set up your account", "manage users", "create custom views",
        "configure notifications", "use the mobile app",
        "integrate with Slack", "export your data",
    ]

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.02):
            return None

        # Get templates from config or use defaults
        templates_cfg = context.config.get("templates", {}).get("titles", {})
        templates = templates_cfg.get("patterns", self.DEFAULT_TEMPLATES)
        topics = templates_cfg.get("topics", self.DEFAULT_TOPICS)
        actions = templates_cfg.get("actions", self.DEFAULT_ACTIONS)

        template = context.random().choice(templates)
        topic = context.random().choice(topics)
        action = context.random().choice(actions)

        return template.format(topic=topic, action=action)


@generator(SemanticType.BODY, priority=80)
class BodyGenerator(BaseGenerator):
    """Generates message/article body content."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.05):
            return None

        paragraphs = context.random().randint(1, 3)
        return "\n\n".join(context.fake().paragraph(nb_sentences=4) for _ in range(paragraphs))


@generator(SemanticType.BODY_HTML, priority=80)
class HtmlBodyGenerator(BaseGenerator):
    """Generates HTML formatted body content."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.05):
            return None

        paragraphs = context.random().randint(1, 3)
        html_parts = []

        for _ in range(paragraphs):
            text = context.fake().paragraph(nb_sentences=3)
            html_parts.append(f"<p>{text}</p>")

        return "\n".join(html_parts)


@generator(SemanticType.BODY_PLAIN, priority=80)
class PlainBodyGenerator(BaseGenerator):
    """Generates plain text body content."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.05):
            return None

        return context.fake().paragraph(nb_sentences=4)


@generator(SemanticType.DESCRIPTION, priority=80)
class DescriptionGenerator(BaseGenerator):
    """Generates description text."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.1):
            return None

        # Ensure minimum length of 20 characters
        min_length = semantics.field_schema.get("minLength", 20)
        for _ in range(5):  # Try up to 5 times
            text = context.fake().paragraph(nb_sentences=context.random().randint(2, 5))
            if len(text) >= min_length:
                return text
        # Fallback: pad with additional sentence if needed
        return text + " " + context.fake().sentence()


@generator(SemanticType.MESSAGE, priority=80)
class MessageGenerator(BaseGenerator):
    """Generates short messages."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.15):
            return None

        return context.fake().sentence(nb_words=context.random().randint(6, 15))


@generator(SemanticType.NOTE, priority=80)
class NoteGenerator(BaseGenerator):
    """Generates note/comment text."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.3):
            return None

        return context.fake().paragraph(nb_sentences=context.random().randint(1, 3))


@generator(SemanticType.SIGNATURE, priority=80)
class SignatureGenerator(BaseGenerator):
    """Generates email signatures."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.4):
            return None

        name = context.fake().name()
        title = context.fake().job()
        company = context.fake().company()

        return f"Best regards,\n{name}\n{title}\n{company}"
