"""
Content generators for text fields like subjects, bodies, descriptions.
"""

from typing import Any

from .base import BaseGenerator, fake
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

        table_name = semantics.table_name

        # For emails table, use category-specific subject templates
        if table_name == "emails":
            category = context.get_field_value("category") or "primary"
            templates_cfg = context.config.get("templates", {}).get("subjects", {})

            # Try to get category-specific templates
            category_templates = templates_cfg.get(category, [])
            if category_templates:
                template = context.random().choice(category_templates)
                # Get replacement values from config
                topics = templates_cfg.get("topics", self.DEFAULT_TOPICS)
                actions = templates_cfg.get("actions", self.DEFAULT_ACTIONS)
                greetings = templates_cfg.get("greetings", ["Hello"])
                events = templates_cfg.get("events", ["Meeting"])
                products = templates_cfg.get("products", ["Product"])

                # Replace placeholders
                subject = template
                if "{topic}" in subject:
                    subject = subject.replace("{topic}", context.random().choice(topics))
                if "{action}" in subject:
                    subject = subject.replace("{action}", context.random().choice(actions))
                if "{greeting}" in subject:
                    subject = subject.replace("{greeting}", context.random().choice(greetings))
                if "{event}" in subject:
                    subject = subject.replace("{event}", context.random().choice(events))
                if "{product}" in subject:
                    subject = subject.replace("{product}", context.random().choice(products))
                if "{percentage}" in subject:
                    subject = subject.replace("{percentage}", str(context.random().choice([10, 15, 20, 25, 30, 50])))
                if "{date}" in subject:
                    subject = subject.replace("{date}", fake.date_this_month().strftime("%B %d"))
                if "{project}" in subject:
                    subject = subject.replace("{project}", context.random().choice(["Q1 Project", "Dashboard", "API"]))
                if "{document}" in subject:
                    subject = subject.replace("{document}", context.random().choice(["Report", "Proposal", "Document"]))

                return subject

        # Default behavior for other tables or if no templates found
        templates_cfg = context.config.get("templates", {}).get("subjects", {})
        templates = templates_cfg.get("patterns", self.DEFAULT_TEMPLATES)
        topics = templates_cfg.get("topics", self.DEFAULT_TOPICS)
        actions = templates_cfg.get("actions", self.DEFAULT_ACTIONS)

        template = context.random().choice(templates)
        topic = context.random().choice(topics)
        action = context.random().choice(actions)

        return template.format(topic=topic, action=action)


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
        return "\n\n".join(fake.paragraph(nb_sentences=4) for _ in range(paragraphs))


@generator(SemanticType.BODY_HTML, priority=80)
class HtmlBodyGenerator(BaseGenerator):
    """Generates HTML formatted body content."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.05):
            return None

        paragraphs = context.random().randint(1, 3)
        html_parts = []

        for _ in range(paragraphs):
            text = fake.paragraph(nb_sentences=3)
            html_parts.append(f"<p>{text}</p>")

        return "\n".join(html_parts)


@generator(SemanticType.BODY_PLAIN, priority=80)
class PlainBodyGenerator(BaseGenerator):
    """Generates plain text body content."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.05):
            return None

        return fake.paragraph(nb_sentences=4)


@generator(SemanticType.DESCRIPTION, priority=80)
class DescriptionGenerator(BaseGenerator):
    """Generates description text."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.1):
            return None

        # Ensure minimum length of 20 characters
        min_length = semantics.field_schema.get("minLength", 20)
        for _ in range(5):  # Try up to 5 times
            text = fake.paragraph(nb_sentences=context.random().randint(2, 5))
            if len(text) >= min_length:
                return text
        # Fallback: pad with additional sentence if needed
        return text + " " + fake.sentence()


@generator(SemanticType.MESSAGE, priority=80)
class MessageGenerator(BaseGenerator):
    """Generates short messages."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.15):
            return None

        return fake.sentence(nb_words=context.random().randint(6, 15))


@generator(SemanticType.NOTE, priority=80)
class NoteGenerator(BaseGenerator):
    """Generates note/comment text."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.3):
            return None

        return fake.paragraph(nb_sentences=context.random().randint(1, 3))


@generator(SemanticType.SIGNATURE, priority=80)
class SignatureGenerator(BaseGenerator):
    """Generates email signatures."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.4):
            return None

        name = fake.name()
        title = fake.job()
        company = fake.company()

        return f"Best regards,\n{name}\n{title}\n{company}"
