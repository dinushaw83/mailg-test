"""
Tests for timestamp generator functions in consistency rules.
"""

import pytest
from datetime import datetime, timedelta
from data_generation.generator.rules.consistency import ConsistencyRules


class TestGeneratePastTimestamp:
    """Tests for generate_past_timestamp function."""

    def test_returns_valid_isoformat(self):
        """Result should be valid ISO format timestamp."""
        rules = ConsistencyRules({}, {})
        result = rules._parse_function_call("generate_past_timestamp(0, 30)", {})
        # Should not raise
        parsed = datetime.fromisoformat(result)
        assert isinstance(parsed, datetime)

    def test_timestamp_is_in_past(self):
        """Generated timestamp should be in the past."""
        rules = ConsistencyRules({}, {})
        result = rules._parse_function_call("generate_past_timestamp(1, 30)", {})
        parsed = datetime.fromisoformat(result)
        assert parsed < datetime.utcnow()

    def test_respects_min_days(self):
        """Timestamp should be at least min_days in the past."""
        rules = ConsistencyRules({}, {})
        result = rules._parse_function_call("generate_past_timestamp(5, 10)", {})
        parsed = datetime.fromisoformat(result)
        now = datetime.utcnow()
        days_ago = (now - parsed).days
        assert days_ago >= 5

    def test_respects_max_days(self):
        """Timestamp should be at most max_days in the past."""
        rules = ConsistencyRules({}, {})
        result = rules._parse_function_call("generate_past_timestamp(0, 3)", {})
        parsed = datetime.fromisoformat(result)
        now = datetime.utcnow()
        days_ago = (now - parsed).days
        assert days_ago <= 4  # Allow for hour variance

    def test_zero_days_is_today(self):
        """With 0,0 days should generate timestamp from today."""
        rules = ConsistencyRules({}, {})
        result = rules._parse_function_call("generate_past_timestamp(0, 0)", {})
        parsed = datetime.fromisoformat(result)
        now = datetime.utcnow()
        # Should be within the last 24 hours
        assert (now - parsed).days == 0


class TestGenerateFutureTimestamp:
    """Tests for generate_future_timestamp function."""

    def test_returns_valid_isoformat(self):
        """Result should be valid ISO format timestamp."""
        rules = ConsistencyRules({}, {})
        result = rules._parse_function_call("generate_future_timestamp(0, 7)", {})
        parsed = datetime.fromisoformat(result)
        assert isinstance(parsed, datetime)

    def test_timestamp_is_in_future(self):
        """Generated timestamp should be in the future."""
        rules = ConsistencyRules({}, {})
        result = rules._parse_function_call("generate_future_timestamp(1, 7)", {})
        parsed = datetime.fromisoformat(result)
        assert parsed > datetime.utcnow()

    def test_respects_min_days(self):
        """Timestamp should be at least min_days in the future."""
        rules = ConsistencyRules({}, {})
        result = rules._parse_function_call("generate_future_timestamp(5, 10)", {})
        parsed = datetime.fromisoformat(result)
        now = datetime.utcnow()
        days_ahead = (parsed - now).days
        assert days_ahead >= 5

    def test_respects_max_days(self):
        """Timestamp should be at most max_days in the future."""
        rules = ConsistencyRules({}, {})
        result = rules._parse_function_call("generate_future_timestamp(0, 3)", {})
        parsed = datetime.fromisoformat(result)
        now = datetime.utcnow()
        days_ahead = (parsed - now).days
        assert days_ahead <= 4  # Allow for hour variance


class TestGenerateTimestampAfter:
    """Tests for generate_timestamp_after function."""

    def test_returns_valid_isoformat(self):
        """Result should be valid ISO format timestamp."""
        rules = ConsistencyRules({}, {})
        base_time = datetime.utcnow() - timedelta(days=10)
        record = {"created_at": base_time.isoformat()}
        result = rules._parse_function_call(
            "generate_timestamp_after(created_at, 1, 24)", record
        )
        parsed = datetime.fromisoformat(result)
        assert isinstance(parsed, datetime)

    def test_timestamp_is_after_reference(self):
        """Generated timestamp should be after the reference field."""
        rules = ConsistencyRules({}, {})
        base_time = datetime.utcnow() - timedelta(days=10)
        record = {"created_at": base_time.isoformat()}
        result = rules._parse_function_call(
            "generate_timestamp_after(created_at, 1, 24)", record
        )
        parsed = datetime.fromisoformat(result)
        assert parsed > base_time

    def test_respects_min_hours(self):
        """Timestamp should be at least min_hours after reference."""
        rules = ConsistencyRules({}, {})
        base_time = datetime.utcnow() - timedelta(days=10)
        record = {"created_at": base_time.isoformat()}
        result = rules._parse_function_call(
            "generate_timestamp_after(created_at, 5, 10)", record
        )
        parsed = datetime.fromisoformat(result)
        hours_diff = (parsed - base_time).total_seconds() / 3600
        assert hours_diff >= 5

    def test_respects_max_hours(self):
        """Timestamp should be at most max_hours after reference."""
        rules = ConsistencyRules({}, {})
        base_time = datetime.utcnow() - timedelta(days=10)
        record = {"created_at": base_time.isoformat()}
        result = rules._parse_function_call(
            "generate_timestamp_after(created_at, 1, 10)", record
        )
        parsed = datetime.fromisoformat(result)
        hours_diff = (parsed - base_time).total_seconds() / 3600
        assert hours_diff <= 10

    def test_missing_field_returns_past_timestamp(self):
        """When reference field is missing, should return past timestamp."""
        rules = ConsistencyRules({}, {})
        record = {}  # No created_at field
        result = rules._parse_function_call(
            "generate_timestamp_after(created_at, 1, 24)", record
        )
        parsed = datetime.fromisoformat(result)
        # Should be a past timestamp (fallback behavior)
        assert parsed < datetime.utcnow()

    def test_does_not_exceed_current_time(self):
        """Result should not be in the future even if calculated time would be."""
        rules = ConsistencyRules({}, {})
        # Base time is very recent
        base_time = datetime.utcnow() - timedelta(hours=1)
        record = {"created_at": base_time.isoformat()}
        result = rules._parse_function_call(
            "generate_timestamp_after(created_at, 10, 100)", record
        )
        parsed = datetime.fromisoformat(result)
        # Should be capped at current time
        assert parsed <= datetime.utcnow()

    def test_handles_z_suffix(self):
        """Should handle timestamps with Z suffix."""
        rules = ConsistencyRules({}, {})
        base_time = datetime.utcnow() - timedelta(days=10)
        record = {"created_at": base_time.isoformat() + "Z"}
        result = rules._parse_function_call(
            "generate_timestamp_after(created_at, 1, 24)", record
        )
        parsed = datetime.fromisoformat(result)
        assert isinstance(parsed, datetime)


class TestFunctionParsing:
    """Tests for function string parsing."""

    def test_non_function_string_returned_as_is(self):
        """Non-function strings should be returned unchanged."""
        rules = ConsistencyRules({}, {})
        result = rules._parse_function_call("just a string", {})
        assert result == "just a string"

    def test_invalid_function_returned_as_is(self):
        """Invalid function syntax should return string as-is."""
        rules = ConsistencyRules({}, {})
        result = rules._parse_function_call("generate_unknown(1, 2)", {})
        assert result == "generate_unknown(1, 2)"

    def test_whitespace_in_args_handled(self):
        """Whitespace between arguments should be handled."""
        rules = ConsistencyRules({}, {})
        result = rules._parse_function_call("generate_past_timestamp(0,  30)", {})
        parsed = datetime.fromisoformat(result)
        assert isinstance(parsed, datetime)
