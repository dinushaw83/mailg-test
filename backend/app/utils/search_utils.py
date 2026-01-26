"""Utility functions for email search operations.

This module provides helper functions for:
- Parsing Gmail-style search operators
- Handling relative date filters
- Size value parsing with K/M/G units
- Advanced query parsing (OR, grouping, exact phrases, exclusions)
- Background task for saving search queries
"""

import logging
import re
from datetime import UTC, datetime, timedelta
from typing import Optional, List, Tuple
from uuid import UUID

logger = logging.getLogger(__name__)


def parse_size_value(size_str: str) -> int:
    """Parse size string like '10M', '500K', '1G' to bytes.
    
    Args:
        size_str: Size string with optional K/M/G suffix
        
    Returns:
        Size in bytes as integer
        
    Examples:
        parse_size_value('1024') -> 1024
        parse_size_value('10K') -> 10240
        parse_size_value('5M') -> 5242880
        parse_size_value('1G') -> 1073741824
    """
    match = re.match(r'(\d+)([KMG])?', size_str, re.IGNORECASE)
    if not match:
        return int(size_str)
    value = int(match.group(1))
    unit = (match.group(2) or '').upper()
    multipliers = {'K': 1024, 'M': 1024**2, 'G': 1024**3}
    return value * multipliers.get(unit, 1)


def parse_date_to_utc(date_str: str, tz_offset: Optional[int] = None) -> datetime:
    """Parse date string and convert to UTC using timezone offset.
    
    Args:
        date_str: Date in YYYY-MM-DD format
        tz_offset: Minutes to add to local time to get UTC (from JS getTimezoneOffset()).
                   Positive values = behind UTC (e.g., 300 for EST/UTC-5)
                   Negative values = ahead of UTC (e.g., -330 for IST/UTC+5:30)
                   Valid range: -840 to +720 (UTC+14 to UTC-12)
        
    Returns:
        UTC datetime object
        
    Examples:
        # No offset - treated as UTC midnight
        parse_date_to_utc('2024-01-01') -> 2024-01-01 00:00:00 UTC
        
        # EST (UTC-5), offset=300 - midnight local = 05:00 UTC
        parse_date_to_utc('2024-01-01', 300) -> 2024-01-01 05:00:00 UTC
        
        # IST (UTC+5:30), offset=-330 - midnight local = previous day 18:30 UTC
        parse_date_to_utc('2024-01-01', -330) -> 2023-12-31 18:30:00 UTC
    """
    dt = datetime.strptime(date_str, '%Y-%m-%d')
    
    if tz_offset is not None:
        # Validate offset is in reasonable range (-840 to +720 minutes)
        # UTC+14 (Line Islands) = -840, UTC-12 (Baker Island) = +720
        if -840 <= tz_offset <= 720:
            # JS getTimezoneOffset returns minutes to ADD to local to get UTC
            # So we ADD the offset to convert local midnight to UTC
            return dt.replace(tzinfo=UTC) + timedelta(minutes=tz_offset)
    
    # No offset or invalid offset - treat as UTC
    return dt.replace(tzinfo=UTC)


def extract_quoted_phrases(query: str) -> Tuple[List[str], str]:
    """Extract quoted phrases from query, return phrases and remaining query.
    
    Args:
        query: The search query string
        
    Returns:
        Tuple of (list of phrases, remaining query without phrases)
        
    Example:
        extract_quoted_phrases('hello "exact phrase" world') ->
        (['exact phrase'], 'hello  world')
    """
    phrases = re.findall(r'"([^"]+)"', query)
    remaining = re.sub(r'"[^"]+"', '', query)
    return phrases, remaining


def extract_exclusions(query: str) -> Tuple[List[str], str]:
    """Extract exclusion terms (prefixed with -) from query.
    
    Args:
        query: The search query string
        
    Returns:
        Tuple of (list of exclusion terms, remaining query)
        
    Example:
        extract_exclusions('meeting -spam -newsletter') ->
        (['spam', 'newsletter'], 'meeting  ')
        
    Note:
        Hyphens within words (e.g., "Multi-email") are NOT treated as exclusions.
        Only standalone -term at word boundaries are exclusions.
    """
    # Match -word or -"quoted phrase" only at word boundaries
    # (not in the middle of hyphenated words like "Multi-email")
    exclusions = []
    
    # First extract -"quoted phrases" (must be preceded by whitespace or start)
    quoted_exclusions = re.findall(r'(?:^|\s)-"([^"]+)"', query)
    exclusions.extend(quoted_exclusions)
    query = re.sub(r'(?:^|\s)-"[^"]+"', ' ', query)
    
    # Then extract -word (must be preceded by whitespace or start, not part of hyphenated word)
    # Use negative lookbehind to ensure hyphen is not preceded by alphanumeric
    word_exclusions = re.findall(r'(?<![a-zA-Z0-9])-(\w+)(?!:)', query)
    exclusions.extend(word_exclusions)
    query = re.sub(r'(?<![a-zA-Z0-9])-\w+(?!:)', '', query)
    
    return exclusions, query


def extract_or_groups(query: str) -> Tuple[List[List[str]], str]:
    """Extract OR groups from query.

    Handles both explicit OR syntax and brace syntax.

    Uses simple string operations to avoid ReDoS vulnerabilities.

    Args:
        query: The search query string

    Returns:
        Tuple of (list of OR groups, remaining query)

    Examples:
        extract_or_groups('meeting OR conference') ->
        ([['meeting', 'conference']], '')

        extract_or_groups('{urgent important}') ->
        ([['urgent', 'important']], '')
    """
    or_groups = []

    # Handle brace syntax: {term1 term2 term3}
    while '{' in query:
        start = query.find('{')
        end = query.find('}', start)
        if end == -1:
            break
        content = query[start+1:end]
        terms = content.split()
        if len(terms) > 1:
            or_groups.append(terms)
        # Remove the brace group from query
        query = query[:start] + ' ' + query[end+1:]

    # Handle explicit OR: term1 OR term2
    # Use case-insensitive string search to split by OR
    parts = []
    query_upper = query.upper()
    start = 0

    while True:
        # Find next occurrence of " OR " (with spaces)
        pos = query_upper.find(' OR ', start)
        if pos == -1:
            # No more OR found, add remaining part
            parts.append(query[start:])
            break

        # Add part before OR
        parts.append(query[start:pos])
        # Move past " OR "
        start = pos + 4

    if len(parts) > 1:
        # Process pairs of adjacent parts
        for i in range(len(parts) - 1):
            left_words = parts[i].strip().split()
            right_words = parts[i+1].strip().split()

            if left_words and right_words:
                # Take last word from left and first word from right
                or_groups.append([left_words[-1], right_words[0]])
                # Remove these words from the parts
                parts[i] = ' '.join(left_words[:-1]) if len(left_words) > 1 else ''
                parts[i+1] = ' '.join(right_words[1:]) if len(right_words) > 1 else ''

    # Join remaining parts
    remaining = ' '.join(p for p in parts if p.strip())
    return or_groups, remaining


def extract_grouped_terms(query: str) -> Tuple[dict, str]:
    """Extract grouped terms like subject:(term1 term2).

    Args:
        query: The search query string

    Returns:
        Tuple of (dict with operator as key and list of terms, remaining query)

    Example:
        extract_grouped_terms('subject:(dinner movie)') ->
        ({'subject': ['dinner', 'movie']}, '')
    """
    grouped = {}

    # Match operator:(term1 term2 ...)
    # Use non-greedy quantifier and limit identifier length to prevent ReDoS
    matches = re.findall(r'([A-Za-z_]\w{0,50}):\(([\w\s\-]+?)\)', query)
    for operator, terms_str in matches:
        terms = terms_str.split()
        grouped[operator.lower()] = terms

    query = re.sub(r'[A-Za-z_]\w{0,50}:\([\w\s\-]+?\)', '', query)

    return grouped, query


def extract_exact_matches(query: str) -> Tuple[List[str], str]:
    """Extract exact match terms (prefixed with +) from query.
    
    Args:
        query: The search query string
        
    Returns:
        Tuple of (list of exact match terms, remaining query)
        
    Example:
        extract_exact_matches('+urgent +meeting') ->
        (['urgent', 'meeting'], '  ')
    """
    exact_matches = re.findall(r'\+(\S+)', query)
    query = re.sub(r'\+\S+', '', query)
    return exact_matches, query


def parse_search_query(query: str, tz_offset: Optional[int] = None) -> dict:
    """Parse Gmail-style search operators from query string.
    
    Extracts structured search parameters from a free-text query.
    Supports advanced operators like OR, grouping, exact phrases, and exclusions.
    
    Examples:
        "from:john@example.com subject:meeting" ->
        {"from_email": "john@example.com", "subject": "meeting"}
        
        "is:starred has:attachment report" ->
        {"is_starred": True, "has_attachment": True, "text": "report"}
        
        "meeting -spam" ->
        {"text": "meeting", "exclusions": ["spam"]}
        
        '"exact phrase" OR alternative' ->
        {"exact_phrases": ["exact phrase"], "or_groups": [["OR", "alternative"]]}
        
    Args:
        query: The search query string
        tz_offset: UTC offset in minutes from browser's getTimezoneOffset().
                   Used to convert date operators (before:, after:) to UTC.
                   Positive = behind UTC (e.g., 300 for EST), Negative = ahead of UTC.
        
    Returns:
        Dict with parsed search parameters
    """
    operators = {}
    
    query_copy = query
    
    # Extract exact phrases first (before other processing)
    exact_phrases, query_copy = extract_quoted_phrases(query_copy)
    if exact_phrases:
        operators['exact_phrases'] = exact_phrases
    
    # Extract exclusions
    exclusions, query_copy = extract_exclusions(query_copy)
    if exclusions:
        operators['exclusions'] = exclusions
    
    # Extract OR groups
    or_groups, query_copy = extract_or_groups(query_copy)
    if or_groups:
        operators['or_groups'] = or_groups
    
    # Extract grouped terms like subject:(dinner movie)
    grouped_terms, query_copy = extract_grouped_terms(query_copy)
    if grouped_terms:
        operators['grouped_terms'] = grouped_terms
    
    # Extract exact match terms (+word)
    exact_matches, query_copy = extract_exact_matches(query_copy)
    if exact_matches:
        operators['exact_matches'] = exact_matches
    
    # Pattern definitions for simple operators
    patterns = [
        # Basic filters
        (r'from:(\S+)', 'from_email'),
        (r'to:(\S+)', 'to_email'),
        (r'cc:(\S+)', 'cc_email'),
        (r'bcc:(\S+)', 'bcc_email'),
        (r'subject:("[^"]+"|\'[^\']+\'|\S+)', 'subject'),
        (r'deliveredto:(\S+)', 'deliveredto'),
        
        # Size filters
        (r'size:(\d+[KMG]?)', 'size'),
        (r'larger:(\d+[KMG]?)', 'size_larger'),
        (r'smaller:(\d+[KMG]?)', 'size_smaller'),
        
        # Attachment filters
        (r'has:attachment', ('has_attachment', True)),
        (r'filename:(\S+)', 'filename'),
        
        # Status filters
        (r'has:star', ('is_starred', True)),
        (r'is:read', ('is_read', True)),
        (r'is:unread', ('is_read', False)),
        (r'is:starred', ('is_starred', True)),
        (r'is:important', ('is_important', True)),
        
        # Label filters
        (r'has:userlabels', ('has_userlabels', True)),
        (r'has:nouserlabels', ('has_userlabels', False)),
        
        # Location filters
        (r'in:anywhere', ('in_anywhere', True)),
        (r'in:archive', ('in_archive', True)),
        (r'in:archived', ('in_archive', True)),
        (r'is:archived', ('in_archive', True)),
        (r'in:snoozed', ('is_snoozed', True)),
        (r'in:starred', ('is_starred', True)),
        (r'in:(\w+)', 'folder_type'),
        
        # Label and category
        (r'label:(\S+)', 'label_name'),
        (r'category:(\w+)', 'category'),
        
        # Date filters
        (r'before:(\d{4}-\d{2}-\d{2})', 'date_to'),
        (r'after:(\d{4}-\d{2}-\d{2})', 'date_from'),
        (r'newer_than:(\d+[dmyw])', 'newer_than'),
        (r'older_than:(\d+[dmyw])', 'older_than'),
    ]
    
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
    
    # Handle relative date filters (no tz_offset needed - relative to current UTC time)
    if 'newer_than' in operators:
        operators['date_from'] = parse_relative_date(operators.pop('newer_than'))
    if 'older_than' in operators:
        operators['date_to'] = parse_relative_date(operators.pop('older_than'))
    
    # Convert absolute dates (before:/after:) to UTC using tz_offset
    # Only apply tz_offset if the date wasn't already set by relative filters
    if 'date_from' in operators and isinstance(operators['date_from'], str):
        operators['date_from'] = parse_date_to_utc(operators['date_from'], tz_offset)
    if 'date_to' in operators and isinstance(operators['date_to'], str):
        operators['date_to'] = parse_date_to_utc(operators['date_to'], tz_offset)
    
    # Convert size values to bytes
    if 'size' in operators:
        operators['size'] = parse_size_value(operators['size'])
    if 'size_larger' in operators:
        operators['size_larger'] = parse_size_value(operators['size_larger'])
    if 'size_smaller' in operators:
        operators['size_smaller'] = parse_size_value(operators['size_smaller'])
    
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


def save_search_query_background(user_id: UUID, query: str, run_id: str):
    """Save or update search query in database as a background task.
    
    This function runs after the response is sent to the client.
    If the query already exists for this user, it updates use_count and last_used_at.
    Otherwise, it creates a new SavedSearch entry.
    
    Args:
        user_id: The ID of the user who performed the search.
        query: The search query string to save.
        run_id: The run ID for the database connection.
    """
    # Import here to avoid circular imports
    from app.db.session import get_db_session
    from app.models.saved_search import SavedSearch
    
    if not query or not query.strip():
        return
    
    query = query.strip()
    
    # Create a new database session for the background task
    db = get_db_session(run_id)
    try:
        # Check if this query already exists for the user
        existing_search = db.query(SavedSearch).filter(
            SavedSearch.owner_id == user_id,
            SavedSearch.query == query
        ).first()
        
        if existing_search:
            # Update existing search
            existing_search.use_count = (existing_search.use_count or 0) + 1
            existing_search.last_used_at = datetime.utcnow()
        else:
            # Create new search entry with query as name (truncated to 100 chars)
            filters = parse_search_query(query)
            # Use query as name, truncated if needed (max 100 chars per schema)
            name = query[:100] if len(query) > 100 else query
            new_search = SavedSearch(
                name=name,
                query=query,
                filters=filters,
                owner_id=user_id,
                use_count=1,
                last_used_at=datetime.utcnow()
            )
            db.add(new_search)
        
        db.commit()
        logger.debug(f"Search query saved/updated for user {user_id}: {query[:50]}...")
    except Exception as e:
        db.rollback()
        logger.warning(f"Failed to save search query in background: {e}")
    finally:
        db.close()
