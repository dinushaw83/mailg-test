"""Tests for derived field generation.

Tests verify that:
1. Email can be derived from first_name/last_name
2. Field ordering ensures source fields are generated before derived fields
3. Uniqueness is maintained for derived emails
"""

import pytest
from data_generation.generator.data_generator import DataGenerator
from data_generation.generator.core.context import GenerationContext


class TestDerivedEmailFromName:
    """Tests for email_from_name derivation type."""

    def test_basic_email_derivation(self):
        """Test that email is derived from first_name."""
        generator = DataGenerator(seed=42)

        # Test the derivation method directly
        config = {
            "type": "email_from_name",
            "from_field": "first_name",
            "domains": ["example.com", "test.org"],
            "separator": ".",
            "lowercase": True,
        }

        # Set up context with a name
        generator.context.new_row("users", 1)
        generator.context.set_field_value("first_name", "John Doe")

        email = generator._generate_derived_field("users", "email", config)

        assert email is not None
        assert "@" in email
        # Should be john.doe@domain
        local_part = email.split("@")[0]
        assert local_part == "john.doe"
        assert email.split("@")[1] in ["example.com", "test.org"]

    def test_email_derivation_single_name(self):
        """Test email derivation with single-word name."""
        generator = DataGenerator(seed=42)

        config = {
            "type": "email_from_name",
            "from_field": "first_name",
            "domains": ["example.com"],
        }

        generator.context.new_row("users", 1)
        generator.context.set_field_value("first_name", "Madonna")

        email = generator._generate_derived_field("users", "email", config)

        assert email == "madonna@example.com"

    def test_email_derivation_multi_part_name(self):
        """Test email derivation with multi-part names (e.g., Mary Jane Watson)."""
        generator = DataGenerator(seed=42)

        config = {
            "type": "email_from_name",
            "from_field": "first_name",
            "domains": ["example.com"],
            "separator": ".",
        }

        generator.context.new_row("users", 1)
        generator.context.set_field_value("first_name", "Mary Jane Watson")

        email = generator._generate_derived_field("users", "email", config)

        # Should use first and last name
        assert email == "mary.watson@example.com"

    def test_email_derivation_with_special_chars(self):
        """Test email derivation handles special characters in names."""
        generator = DataGenerator(seed=42)

        config = {
            "type": "email_from_name",
            "from_field": "first_name",
            "domains": ["example.com"],
        }

        generator.context.new_row("users", 1)
        generator.context.set_field_value("first_name", "Jean-Pierre O'Connor")

        email = generator._generate_derived_field("users", "email", config)

        # Should clean up special chars
        local_part = email.split("@")[0]
        assert "'" not in local_part
        assert "-" not in local_part

    def test_email_uniqueness(self):
        """Test that duplicate names get unique emails."""
        generator = DataGenerator(seed=42)

        config = {
            "type": "email_from_name",
            "from_field": "first_name",
            "domains": ["example.com"],
        }

        emails = []
        for i in range(5):
            generator.context.new_row("users", i + 1)
            generator.context.set_field_value("first_name", "John Doe")
            email = generator._generate_derived_field("users", "email", config)
            emails.append(email)

        # All emails should be unique
        assert len(set(emails)) == 5

        # First should be plain, rest should have numbers
        assert emails[0] == "john.doe@example.com"
        assert "john.doe1@example.com" in emails
        assert "john.doe2@example.com" in emails

    def test_email_derivation_empty_name_fallback(self):
        """Test that empty name falls back to Faker-generated email."""
        generator = DataGenerator(seed=42)

        config = {
            "type": "email_from_name",
            "from_field": "first_name",
            "domains": ["example.com"],
        }

        generator.context.new_row("users", 1)
        generator.context.set_field_value("first_name", "")

        email = generator._derive_email_from_name("", config)

        # Should get a valid Faker-generated email
        assert email is not None
        assert "@" in email

    def test_email_derivation_whitespace_only_name_fallback(self):
        """Test that whitespace-only name falls back to Faker-generated email."""
        generator = DataGenerator(seed=42)

        config = {
            "type": "email_from_name",
            "from_field": "first_name",
            "domains": ["example.com"],
        }

        generator.context.new_row("users", 1)

        email = generator._derive_email_from_name("   ", config)

        # Should get a valid Faker-generated email
        assert email is not None
        assert "@" in email


class TestDerivedHtmlFromText:
    """Tests for html_from_text derivation type."""

    def test_basic_html_derivation(self):
        """Test basic text to HTML conversion."""
        generator = DataGenerator(seed=42)

        text = "Hello world"
        result = generator._derive_html_from_text(text, {"style": "basic"})

        assert "<p>" in result
        assert "Hello world" in result

    def test_paragraphs_style(self):
        """Test paragraphs style wraps double newlines in <p> tags."""
        generator = DataGenerator(seed=42)

        text = "First paragraph.\n\nSecond paragraph."
        result = generator._derive_html_from_text(text, {"style": "paragraphs"})

        assert result.count("<p>") == 2
        assert result.count("</p>") == 2
        assert "First paragraph." in result
        assert "Second paragraph." in result

    def test_rich_style_has_html_structure(self):
        """Test rich style includes DOCTYPE and html/body tags."""
        generator = DataGenerator(seed=42)

        text = "Some content"
        result = generator._derive_html_from_text(text, {"style": "rich"})

        assert "<!DOCTYPE html>" in result
        assert "<html>" in result
        assert "<body>" in result
        assert "</body>" in result
        assert "</html>" in result

    def test_html_escaping(self):
        """Test that HTML special characters are escaped."""
        generator = DataGenerator(seed=42)

        text = "Use <script> & 'quotes'"
        result = generator._derive_html_from_text(text, {"style": "basic"})

        assert "&lt;script&gt;" in result
        assert "&amp;" in result

    def test_single_newlines_become_br(self):
        """Test that single newlines become <br> tags."""
        generator = DataGenerator(seed=42)

        text = "Line one\nLine two"
        result = generator._derive_html_from_text(text, {"style": "basic"})

        assert "<br>" in result

    def test_default_style_is_paragraphs(self):
        """Test that default style is paragraphs."""
        generator = DataGenerator(seed=42)

        text = "Para 1\n\nPara 2"
        result = generator._derive_html_from_text(text, {})

        assert result.count("<p>") == 2


class TestDerivedUsernameFromName:
    """Tests for username_from_name derivation type."""

    def test_basic_username_derivation(self):
        """Test username derivation with default style."""
        generator = DataGenerator(seed=42)

        config = {
            "type": "username_from_name",
            "from_field": "first_name",
            "style": "firstlast",
        }

        generator.context.new_row("users", 1)
        generator.context.set_field_value("first_name", "John Doe")

        username = generator._derive_username_from_name("John Doe", config)

        assert username == "johndoe"

    def test_username_underscore_style(self):
        """Test username with first_last style."""
        generator = DataGenerator(seed=42)

        config = {
            "type": "username_from_name",
            "from_field": "first_name",
            "style": "first_last",
        }

        username = generator._derive_username_from_name("John Doe", config)

        assert username == "john_doe"

    def test_username_flast_style(self):
        """Test username with flast style (first initial + last name)."""
        generator = DataGenerator(seed=42)

        config = {
            "type": "username_from_name",
            "from_field": "first_name",
            "style": "flast",
        }

        username = generator._derive_username_from_name("John Doe", config)

        assert username == "jdoe"

    def test_username_empty_name_fallback(self):
        """Test that empty name falls back to Faker-generated username."""
        generator = DataGenerator(seed=42)

        config = {
            "type": "username_from_name",
            "from_field": "first_name",
            "style": "firstlast",
        }

        generator.context.new_row("users", 1)

        username = generator._derive_username_from_name("", config)

        # Should get a valid Faker-generated username
        assert username is not None
        assert len(username) > 0

    def test_username_whitespace_only_name_fallback(self):
        """Test that whitespace-only name falls back to Faker-generated username."""
        generator = DataGenerator(seed=42)

        config = {
            "type": "username_from_name",
            "from_field": "first_name",
            "style": "firstlast",
        }

        generator.context.new_row("users", 1)

        username = generator._derive_username_from_name("   ", config)

        # Should get a valid Faker-generated username
        assert username is not None
        assert len(username) > 0


class TestFieldOrdering:
    """Tests for field ordering with derived fields."""

    def test_source_field_before_derived(self):
        """Test that source fields are ordered before derived fields."""
        generator = DataGenerator(seed=42)

        # Simulate config with email derived from first_name
        generator.config["derived_fields"] = {
            "users": {
                "email": {
                    "type": "email_from_name",
                    "from_field": "first_name",
                }
            }
        }

        fields = ["id", "email", "first_name", "role"]
        ordered = generator._order_fields_for_generation(fields, "users")

        # first_name should come before email
        first_name_idx = ordered.index("first_name")
        email_idx = ordered.index("email")
        assert first_name_idx < email_idx

    def test_non_derived_fields_preserved(self):
        """Test that non-derived fields are preserved in order."""
        generator = DataGenerator(seed=42)

        generator.config["derived_fields"] = {
            "users": {
                "email": {
                    "from_field": "first_name",
                }
            }
        }

        fields = ["role", "photo", "company"]
        ordered = generator._order_fields_for_generation(fields, "users")

        # All fields should be present
        assert set(ordered) == set(fields)


class TestDerivedFieldsIntegration:
    """Integration tests for derived fields with full generator."""

    def test_user_generation_with_derived_email(self):
        """Test that generated users have emails matching their names."""
        generator = DataGenerator(seed=42, use_seed=False)

        # Ensure derived_fields config is set using first_name (mailg schema)
        generator.config["derived_fields"] = {
            "users": {
                "email": {
                    "type": "email_from_name",
                    "from_field": "first_name",
                    "domains": ["test.com"],
                    "separator": ".",
                }
            }
        }

        # Generate a few users
        data = generator.generate_table("users", 5, include_dependencies=True)
        users = data.get("users", [])

        assert len(users) > 0

        for user in users:
            first_name = user.get("first_name")
            email = user.get("email")

            if first_name and email:
                # Email should contain parts of the name
                local_part = email.split("@")[0]
                name_parts = first_name.lower().split()

                # At minimum, the first name should be in the email
                if len(name_parts) >= 1:
                    first_name_clean = name_parts[0].replace("-", "").replace("'", "")
                    assert first_name_clean in local_part or local_part.startswith(first_name_clean[:3])
