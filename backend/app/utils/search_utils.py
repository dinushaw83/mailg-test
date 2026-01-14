"""Utility functions for email search operations.

This module provides helper functions for:
- Parsing Gmail-style search operators
- Handling relative date filters
"""

import re
from datetime import UTC, datetime, timedelta
from typing import Optional


def parse_search_query(query: str) -> dict:
    """Parse Gmail-style search operators from query string.
    
    Extracts structured search parameters from a free-text query.
    
    Examples:
        "from:john@example.com subject:meeting" ->
        {"from_email": "john@example.com", "subject": "meeting"}
        
        "is:starred has:attachment report" ->
        {"is_starred": True, "has_attachment": True, "text": "report"}
        
    Args:
        query: The search query string
        
    Returns:
        Dict with parsed search parameters
    """
    operators = {}
    remaining_text = []
    
    # Pattern definitions
    patterns = [
        (r'from:(\S+)', 'from_email'),
        (r'to:(\S+)', 'to_email'),
        (r'cc:(\S+)', 'cc_email'),
        (r'subject:("[^"]+"|\'[^\']+\'|\S+)', 'subject'),
        (r'has:attachment', ('has_attachment', True)),
        (r'has:star', ('is_starred', True)),
        (r'is:read', ('is_read', True)),
        (r'is:unread', ('is_read', False)),
        (r'is:starred', ('is_starred', True)),
        (r'is:important', ('is_important', True)),
        (r'in:(\w+)', 'folder_type'),
        (r'label:(\S+)', 'label_name'),
        (r'before:(\d{4}-\d{2}-\d{2})', 'date_to'),
        (r'after:(\d{4}-\d{2}-\d{2})', 'date_from'),
        (r'newer_than:(\d+[dmyw])', 'newer_than'),
        (r'older_than:(\d+[dmyw])', 'older_than'),
    ]
    
    query_copy = query
    
    for pattern, key in patterns:
        if isinstance(key, tuple):
            # Boolean pattern (no capture group)
            if re.search(pattern, query_copy, re.IGNORECASE):
                operators[key[0]] = key[1]
                query_copy = re.sub(pattern, '', query_copy, flags=re.IGNORECASE)
        else:
            # Value pattern (with capture group)
            match = re.search(pattern, query_copy, re.IGNORECASE)
            if match:
                value = match.group(1)
                # Remove quotes if present
                if value.startswith('"') or value.startswith("'"):
                    value = value[1:-1]
                operators[key] = value
                query_copy = re.sub(pattern, '', query_copy, flags=re.IGNORECASE)
    
    # Handle relative date filters
    if 'newer_than' in operators:
        operators['date_from'] = parse_relative_date(operators.pop('newer_than'))
    if 'older_than' in operators:
        operators['date_to'] = parse_relative_date(operators.pop('older_than'))
    
    # Remaining text is the search query
    remaining = query_copy.strip()
    if remaining:
        operators['text'] = remaining
    
    return operators


def parse_relative_date(relative: str) -> Optional[datetime]:
    """Parse relative date string like '7d', '1m', '1y'.
    
    Args:
        relative: Relative date string (e.g., '7d', '2w', '1m', '1y')
        
    Returns:
        datetime object representing the calculated date, or None if invalid
    """
    match = re.match(r'(\d+)([dmyw])', relative)
    if not match:
        return None
    
    value = int(match.group(1))
    unit = match.group(2)
    
    now = datetime.now(UTC)
    if unit == 'd':
        return now - timedelta(days=value)
    elif unit == 'm':
        return now - timedelta(days=value * 30)
    elif unit == 'w':
        return now - timedelta(weeks=value)
    elif unit == 'y':
        return now - timedelta(days=value * 365)
    
    return now
