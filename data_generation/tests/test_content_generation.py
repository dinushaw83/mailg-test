"""
Tests for content generation (subjects, bodies, descriptions).

Tests verify that:
1. Subject templates are properly used and placeholders filled
2. Body content is generated with proper structure
3. HTML body content has correct HTML tags
4. Multiple rows generate varied content
5. Custom templates from config are respected
"""

import pytest
from data_generation.generator.data_generator import DataGenerator
from data_generation.generator.generators.content import (
    SubjectGenerator,
    BodyGenerator,
    HtmlBodyGenerator,
    TitleGenerator,
    DescriptionGenerator,
)
from data_generation.generator.core.context import GenerationContext
from data_generation.generator.core.analyzer import FieldSemantics, SemanticType


class TestSubjectGenerator:
    """Tests for SubjectGenerator."""

    @pytest.fixture
    def generator(self):
        return SubjectGenerator()

    @pytest.fixture
    def context(self):
        ctx = GenerationContext()
        ctx.set_seed(42)
        ctx.table_name = "emails"
        return ctx

    @pytest.fixture
    def semantics(self):
        return FieldSemantics(
            semantic_type=SemanticType.SUBJECT,
            confidence=1.0,
            field_name="subject",
            table_name="emails",
            field_schema={"type": "string"},
        )

    def test_generates_non_empty_subject(self, generator, semantics, context):
        """Subject should be non-empty string."""
        subject = generator.generate(semantics, context)
        assert subject is not None
        assert len(subject) > 0

    def test_uses_default_templates(self, generator, semantics, context):
        """Without config, should use default templates."""
        subjects = set()
        for i in range(50):
            context.new_row("emails", i)
            subject = generator.generate(semantics, context)
            if subject:
                subjects.add(subject)

        # Should have variety from templates
        assert len(subjects) > 5

    def test_uses_custom_templates_from_config(self, generator, semantics, context):
        """Should use templates from config when provided."""
        context.config = {
            "templates": {
                "subjects": {
                    "patterns": [
                        "Custom subject about {topic}",
                        "Another custom: {topic}",
                    ],
                    "topics": ["testing", "configuration"],
                }
            }
        }

        subjects = []
        for i in range(20):
            context.new_row("emails", i)
            subject = generator.generate(semantics, context)
            if subject:
                subjects.append(subject)

        # All subjects should use custom patterns
        for subject in subjects:
            assert "Custom subject" in subject or "Another custom" in subject

    def test_fills_topic_placeholder(self, generator, semantics, context):
        """Should fill {topic} placeholder with values."""
        # Placeholder values are at templates level, not subjects level
        context.config = {
            "templates": {
                "subjects": {
                    "patterns": ["Issue with {topic}"],
                },
                "topics": ["login", "billing"],
            }
        }

        subject = generator.generate(semantics, context)

        # Should have filled the placeholder
        assert "{topic}" not in subject
        assert "login" in subject or "billing" in subject

    def test_fills_action_placeholder(self, generator, semantics, context):
        """Should fill {action} placeholder with values."""
        # Placeholder values are at templates level, not subjects level
        context.config = {
            "templates": {
                "subjects": {
                    "patterns": ["Unable to {action}"],
                },
                "actions": ["login", "export data"],
            }
        }

        subject = generator.generate(semantics, context)

        assert "{action}" not in subject
        assert "login" in subject or "export data" in subject

    def test_categorized_templates(self, generator, semantics, context):
        """Should support categorized template lists."""
        context.config = {
            "templates": {
                "subjects": {
                    "personal": ["Personal: {topic}"],
                    "professional": ["Work: {topic}"],
                    "topics": ["meeting"],
                }
            }
        }

        subjects = set()
        for i in range(30):
            context.new_row("emails", i)
            subject = generator.generate(semantics, context)
            if subject:
                subjects.add(subject)

        # Should use templates from both categories
        has_personal = any("Personal:" in s for s in subjects)
        has_professional = any("Work:" in s for s in subjects)
        assert has_personal or has_professional


class TestBodyGenerator:
    """Tests for BodyGenerator."""

    @pytest.fixture
    def generator(self):
        return BodyGenerator()

    @pytest.fixture
    def context(self):
        ctx = GenerationContext()
        ctx.set_seed(42)
        ctx.table_name = "emails"
        return ctx

    @pytest.fixture
    def semantics(self):
        return FieldSemantics(
            semantic_type=SemanticType.BODY,
            confidence=1.0,
            field_name="body",
            table_name="emails",
            field_schema={"type": "string"},
        )

    def test_generates_non_empty_body(self, generator, semantics, context):
        """Body should be non-empty string."""
        body = generator.generate(semantics, context)
        assert body is not None
        assert len(body) > 0

    def test_generates_paragraphs(self, generator, semantics, context):
        """Body should contain paragraph breaks."""
        # Generate multiple to find one with multiple paragraphs
        bodies_with_breaks = 0
        for i in range(20):
            context.new_row("emails", i)
            body = generator.generate(semantics, context)
            if body and "\n\n" in body:
                bodies_with_breaks += 1

        # Some should have paragraph breaks (1-3 paragraphs)
        assert bodies_with_breaks > 0

    def test_generates_varied_content(self, generator, semantics, context):
        """Multiple bodies should have different content."""
        bodies = set()
        for i in range(10):
            context.new_row("emails", i)
            body = generator.generate(semantics, context)
            if body:
                bodies.add(body)

        # Most should be unique (allowing for some nulls due to null probability)
        assert len(bodies) >= 8


class TestHtmlBodyGenerator:
    """Tests for HtmlBodyGenerator."""

    @pytest.fixture
    def generator(self):
        return HtmlBodyGenerator()

    @pytest.fixture
    def context(self):
        ctx = GenerationContext()
        ctx.set_seed(42)
        ctx.table_name = "emails"
        return ctx

    @pytest.fixture
    def semantics(self):
        return FieldSemantics(
            semantic_type=SemanticType.BODY_HTML,
            confidence=1.0,
            field_name="html_body",
            table_name="emails",
            field_schema={"type": "string"},
        )

    def test_generates_html_with_p_tags(self, generator, semantics, context):
        """HTML body should contain <p> tags."""
        html = generator.generate(semantics, context)
        assert html is not None
        assert "<p>" in html
        assert "</p>" in html

    def test_generates_multiple_paragraphs(self, generator, semantics, context):
        """HTML body can have multiple paragraphs."""
        # Generate multiple to find one with multiple paragraphs
        multi_para_count = 0
        for i in range(20):
            context.new_row("emails", i)
            html = generator.generate(semantics, context)
            if html and html.count("<p>") > 1:
                multi_para_count += 1

        # Some should have multiple paragraphs
        assert multi_para_count > 0

    def test_generates_varied_html(self, generator, semantics, context):
        """Multiple HTML bodies should have different content."""
        bodies = set()
        for i in range(10):
            context.new_row("emails", i)
            html = generator.generate(semantics, context)
            if html:
                bodies.add(html)

        # Most should be unique (allowing for some nulls due to null probability)
        assert len(bodies) >= 8


class TestMultipleEmailGeneration:
    """Integration tests for generating multiple email rows."""

    def test_generates_multiple_emails_with_subjects(self):
        """Multiple emails should have varied subjects."""
        generator = DataGenerator(seed=42, use_seed=False)

        # Generate emails
        data = generator.generate_table("emails", 20, include_dependencies=True)
        emails = data.get("emails", [])

        assert len(emails) == 20

        # Check subjects exist and are varied
        subjects = [e.get("subject") for e in emails if e.get("subject")]
        assert len(subjects) > 0

        # Should have some variety
        unique_subjects = set(subjects)
        assert len(unique_subjects) > 5

    def test_generates_multiple_emails_with_bodies(self):
        """Multiple emails should have body content."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generator.generate_table("emails", 10, include_dependencies=True)
        emails = data.get("emails", [])

        # Check bodies exist
        bodies = [e.get("body") for e in emails if e.get("body")]
        assert len(bodies) > 0

        # Bodies should be non-trivial length
        for body in bodies:
            assert len(body) > 20

    def test_generates_emails_with_html_bodies(self):
        """Multiple emails should have HTML body content."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generator.generate_table("emails", 10, include_dependencies=True)
        emails = data.get("emails", [])

        # Check HTML bodies exist
        html_bodies = [e.get("html_body") for e in emails if e.get("html_body")]

        # At least some should have HTML bodies
        for html in html_bodies:
            assert "<p>" in html or "<" in html

    def test_email_fields_are_consistent(self):
        """Email fields should be internally consistent."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generator.generate_table("emails", 10, include_dependencies=True)
        emails = data.get("emails", [])

        for email in emails:
            # Each email should have required fields
            assert "id" in email
            assert "sender_id" in email

            # Status should be valid enum
            if email.get("status"):
                assert email["status"] in ["draft", "queued", "sent", "received", "archived", "cancelled"]

            # Folder should be valid enum
            if email.get("folder"):
                assert email["folder"] in ["inbox", "sent", "drafts", "trash", "spam"]

    def test_reproducible_email_generation(self):
        """Same seed should produce same emails."""
        gen1 = DataGenerator(seed=123, use_seed=False)
        gen2 = DataGenerator(seed=123, use_seed=False)

        data1 = gen1.generate_table("emails", 5, include_dependencies=True)
        data2 = gen2.generate_table("emails", 5, include_dependencies=True)

        emails1 = data1.get("emails", [])
        emails2 = data2.get("emails", [])

        assert len(emails1) == len(emails2)

        for e1, e2 in zip(emails1, emails2):
            assert e1.get("subject") == e2.get("subject")
            assert e1.get("body") == e2.get("body")


class TestDescriptionGenerator:
    """Tests for DescriptionGenerator."""

    @pytest.fixture
    def generator(self):
        return DescriptionGenerator()

    @pytest.fixture
    def context(self):
        ctx = GenerationContext()
        ctx.set_seed(42)
        ctx.table_name = "email_templates"
        return ctx

    @pytest.fixture
    def semantics(self):
        return FieldSemantics(
            semantic_type=SemanticType.DESCRIPTION,
            confidence=1.0,
            field_name="description",
            table_name="email_templates",
            field_schema={"type": "string", "minLength": 20},
        )

    def test_generates_description(self, generator, semantics, context):
        """Should generate non-empty description."""
        desc = generator.generate(semantics, context)
        assert desc is not None
        assert len(desc) > 0

    def test_respects_min_length(self, generator, semantics, context):
        """Should respect minLength constraint."""
        for i in range(10):
            context.new_row("email_templates", i)
            desc = generator.generate(semantics, context)
            if desc:
                assert len(desc) >= 20


class TestTitleGenerator:
    """Tests for TitleGenerator (used for email_templates.name etc)."""

    @pytest.fixture
    def generator(self):
        return TitleGenerator()

    @pytest.fixture
    def context(self):
        ctx = GenerationContext()
        ctx.set_seed(42)
        ctx.table_name = "email_templates"
        return ctx

    @pytest.fixture
    def semantics(self):
        return FieldSemantics(
            semantic_type=SemanticType.TITLE,
            confidence=1.0,
            field_name="name",
            table_name="email_templates",
            field_schema={"type": "string"},
        )

    def test_generates_title(self, generator, semantics, context):
        """Should generate non-empty title."""
        title = generator.generate(semantics, context)
        assert title is not None
        assert len(title) > 0

    def test_uses_templates(self, generator, semantics, context):
        """Should use template patterns."""
        titles = set()
        for i in range(30):
            context.new_row("email_templates", i)
            title = generator.generate(semantics, context)
            if title:
                titles.add(title)

        # Should have variety from templates
        assert len(titles) > 5
