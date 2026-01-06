"""
Dependency resolver for determining table generation order.

Uses topological sort to ensure parent tables are generated before
tables that reference them via foreign keys.

Handles circular dependencies by ignoring nullable and deferred foreign keys
only for edges that are part of the cycle, preserving other dependencies.
"""

from typing import Any
from .schema_loader import get_tables, get_foreign_keys, get_table_properties, get_required_fields


def get_all_edges(schema: dict[str, Any]) -> list[dict]:
    """
    Get all FK edges with their metadata.

    Returns:
        List of edge dictionaries with from, to, column, and breakable info.
    """
    tables = get_tables(schema)
    edges = []

    for table_name, table_schema in tables.items():
        props = get_table_properties(table_schema)
        required_fields = get_required_fields(table_schema)
        fks = get_foreign_keys(table_schema)

        for fk_field, fk_ref in fks.items():
            ref_table = fk_ref.split(".")[0]

            # Skip self-references
            if ref_table == table_name:
                continue

            if ref_table not in tables:
                continue

            field_def = props.get(fk_field, {})
            is_nullable = field_def.get("nullable", False)
            is_required = fk_field in required_fields
            is_deferred = field_def.get("deferred", False)

            edges.append({
                "from": table_name,
                "to": ref_table,
                "column": fk_field,
                "nullable": is_nullable,
                "required": is_required,
                "deferred": is_deferred,
                "breakable": is_nullable or not is_required or is_deferred,
            })

    return edges


def build_graph_from_edges(tables: dict, edges: list[dict], excluded: set = None) -> dict[str, set[str]]:
    """Build dependency graph from edges, excluding specified ones."""
    excluded = excluded or set()
    deps = {name: set() for name in tables}

    for edge in edges:
        edge_key = (edge["from"], edge["column"])
        if edge_key in excluded:
            continue
        if edge["to"] in deps:
            deps[edge["from"]].add(edge["to"])

    return deps


def topological_sort(deps: dict[str, set[str]]) -> list[str]:
    """
    Perform topological sort on dependency graph.

    Returns:
        List of table names in generation order (dependencies first).

    Raises:
        ValueError: If circular dependency detected, includes cycle tables.
    """
    # Calculate in-degrees (how many tables each table depends on)
    in_degree = {node: len(neighbors) for node, neighbors in deps.items()}

    # Build reverse dependency map
    reverse_deps: dict[str, set[str]] = {node: set() for node in deps}
    for node, neighbors in deps.items():
        for neighbor in neighbors:
            if neighbor in reverse_deps:
                reverse_deps[neighbor].add(node)

    # Start with nodes that have no dependencies
    queue = [node for node, degree in in_degree.items() if degree == 0]
    result = []

    while queue:
        node = queue.pop(0)
        result.append(node)

        # For each table that depends on this node
        for dependent in reverse_deps[node]:
            in_degree[dependent] -= 1
            if in_degree[dependent] == 0:
                queue.append(dependent)

    if len(result) != len(deps):
        remaining = set(deps.keys()) - set(result)
        raise ValueError(f"Circular dependency detected involving: {remaining}", remaining)

    return result


def find_cycle_tables(deps: dict[str, set[str]]) -> set[str]:
    """Find tables involved in cycles."""
    try:
        topological_sort(deps)
        return set()
    except ValueError as e:
        if len(e.args) >= 2:
            return e.args[1]
        return set()


def get_generation_order(schema: dict[str, Any]) -> list[str]:
    """
    Get the order in which tables should be generated.

    First tries with all dependencies. If a cycle is detected, only excludes
    nullable/deferred FK edges that are part of the cycle.

    Args:
        schema: The parsed schema dictionary.

    Returns:
        List of table names in dependency order.
    """
    tables = get_tables(schema)
    edges = get_all_edges(schema)

    # First, try with all dependencies
    deps = build_graph_from_edges(tables, edges)
    cycle_tables = find_cycle_tables(deps)

    if not cycle_tables:
        return topological_sort(deps)

    # Only exclude breakable edges that are part of the cycle
    excluded = set()
    for edge in edges:
        if edge["breakable"] and edge["from"] in cycle_tables and edge["to"] in cycle_tables:
            excluded.add((edge["from"], edge["column"]))

    deps = build_graph_from_edges(tables, edges, excluded)
    return topological_sort(deps)


def get_table_dependencies(schema: dict[str, Any], table_name: str) -> set[str]:
    """
    Get all tables that must be generated before a given table.

    Args:
        schema: The parsed schema dictionary.
        table_name: Name of the table.

    Returns:
        Set of table names that are dependencies.
    """
    tables = get_tables(schema)
    edges = get_all_edges(schema)
    deps = build_graph_from_edges(tables, edges)

    # Recursive collection of all dependencies
    all_deps: set[str] = set()
    to_process = list(deps.get(table_name, set()))

    while to_process:
        dep = to_process.pop()
        if dep not in all_deps:
            all_deps.add(dep)
            to_process.extend(deps.get(dep, set()))

    return all_deps
