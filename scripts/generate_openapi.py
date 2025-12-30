"""
Generate API_CONTRACT_OPENAPI.md from the FastAPI backend.

This script exports the OpenAPI schema from `backend/app/main.py` and
converts it directly to Markdown documentation:
- `servers: [{ url: /api/v1 }]`
- `paths` are relative to `/api/v1` (prefix stripped)
- root-level endpoints (/, /health) are excluded
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = REPO_ROOT / "backend"
DEFAULT_OUTPUT = REPO_ROOT / "API_CONTRACT_OPENAPI.md"

# Set UTF-8 encoding for Windows compatibility (avoid cp1252 UnicodeEncodeError)
if sys.platform == "win32":
    import codecs

    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())


# -----------------------------------------------------------------------------
# FastAPI Import & Schema Extraction
# -----------------------------------------------------------------------------


def _import_fastapi_app():
    # Ensure `app.*` imports resolve (backend/app is a Python package named `app`).
    backend_dir_str = str(BACKEND_DIR)
    if backend_dir_str not in sys.path:
        sys.path.insert(0, backend_dir_str)

    from app.main import app  # noqa: WPS433 (runtime import is intentional)

    return app


def _strip_api_prefix(
    schema: Dict[str, Any],
    api_prefix: str,
    *,
    exclude_non_api_paths: bool = True,
) -> Dict[str, Any]:
    """Move /api/v1 prefix from path keys into `servers`."""
    paths = schema.get("paths") or {}
    new_paths: Dict[str, Any] = {}

    for path, path_item in paths.items():
        if exclude_non_api_paths and not path.startswith(api_prefix.rstrip("/") + "/"):
            continue

        if path == api_prefix:
            rel = "/"
        elif path.startswith(api_prefix):
            rel = path[len(api_prefix) :] or "/"
        else:
            rel = path

        if not rel.startswith("/"):
            rel = "/" + rel

        new_paths[rel] = path_item

    schema["paths"] = new_paths
    schema["servers"] = [{"url": api_prefix, "description": "API v1 base path"}]
    return schema


def _apply_contract_metadata(schema: Dict[str, Any]) -> Dict[str, Any]:
    """Align info/title/description with the existing contract tone."""
    info = schema.setdefault("info", {})
    info["title"] = "Deskzen API Contract"
    info["version"] = "2.0.0"
    info["description"] = (
        "Comprehensive API contract for Deskzen with all request and response bodies.\n"
        "Generated from the FastAPI backend OpenAPI schema."
    )
    info.setdefault("contact", {"name": "Deskzen API Support"})
    return schema


def _reorder_top_level(schema: Dict[str, Any]) -> Dict[str, Any]:
    """Make output resemble the existing contract ordering."""
    preferred = [
        "openapi",
        "info",
        "servers",
        "paths",
        "components",
        "security",
        "tags",
        "externalDocs",
    ]

    ordered: Dict[str, Any] = {}
    for key in preferred:
        if key in schema:
            ordered[key] = schema[key]

    for key, value in schema.items():
        if key not in ordered:
            ordered[key] = value

    return ordered


# -----------------------------------------------------------------------------
# Markdown Generation
# -----------------------------------------------------------------------------


def _slugify_heading(text: str) -> str:
    """
    Approximate GitHub-style anchor slugs.
    Good enough for internal doc navigation.
    """
    text = text.strip().lower()
    text = re.sub(r"[`_*~()\[\]{}<>!@#$%^&=+|;:'\",.?/\\]", "", text)
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text


def _titleize_tag(tag: str) -> str:
    # "approval-requests" -> "Approval Requests"
    parts = re.split(r"[-_/ ]+", tag.strip())
    parts = [p for p in parts if p]
    return " ".join(p.capitalize() if p.islower() else p for p in parts) or tag


def _pick_base_url(openapi: Dict[str, Any]) -> str:
    servers = openapi.get("servers") or []
    if servers and isinstance(servers, list) and isinstance(servers[0], dict):
        url = servers[0].get("url")
        if isinstance(url, str) and url.strip():
            return url.strip()
    # fall back to conventional
    return "/api/v1"


def _resolve_ref(openapi: Dict[str, Any], ref: str) -> Any:
    # Only handle local component refs like "#/components/schemas/Foo"
    if not ref.startswith("#/"):
        return None
    cur: Any = openapi
    for part in ref[2:].split("/"):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def _merge_all_of(openapi: Dict[str, Any], schema: Dict[str, Any], seen_refs: Set[str]) -> Dict[str, Any]:
    merged: Dict[str, Any] = {"type": "object", "properties": {}}
    for sub in schema.get("allOf", []):
        sub_schema = _normalize_schema(openapi, sub, seen_refs)
        if sub_schema.get("type") == "object":
            merged["properties"].update(sub_schema.get("properties") or {})
            if "required" in sub_schema:
                merged.setdefault("required", [])
                merged["required"] = sorted(set(merged["required"]) | set(sub_schema["required"]))
        else:
            # If allOf mixes non-object, keep a best-effort placeholder.
            merged = sub_schema
    return merged


def _normalize_schema(openapi: Dict[str, Any], schema: Any, seen_refs: Set[str]) -> Dict[str, Any]:
    if not isinstance(schema, dict):
        return {}

    if "$ref" in schema and isinstance(schema["$ref"], str):
        ref = schema["$ref"]
        if ref in seen_refs:
            return {"type": "object"}  # break cycles
        seen_refs.add(ref)
        resolved = _resolve_ref(openapi, ref) or {}
        resolved_norm = _normalize_schema(openapi, resolved, seen_refs)
        # keep title/ref name if available
        if "title" not in resolved_norm:
            resolved_norm["title"] = ref.split("/")[-1]
        return resolved_norm

    if "allOf" in schema and isinstance(schema["allOf"], list):
        return _merge_all_of(openapi, schema, seen_refs)

    if "anyOf" in schema and isinstance(schema["anyOf"], list):
        # Prefer first non-null option.
        for opt in schema["anyOf"]:
            if isinstance(opt, dict) and opt.get("type") == "null":
                continue
            return _normalize_schema(openapi, opt, seen_refs)
        return _normalize_schema(openapi, schema["anyOf"][0], seen_refs) if schema["anyOf"] else {}

    if "oneOf" in schema and isinstance(schema["oneOf"], list) and schema["oneOf"]:
        return _normalize_schema(openapi, schema["oneOf"][0], seen_refs)

    return dict(schema)


def _example_for_schema(
    openapi: Dict[str, Any],
    schema: Any,
    *,
    depth: int = 0,
    max_depth: int = 3,
    seen_refs: Optional[Set[str]] = None,
) -> Any:
    if seen_refs is None:
        seen_refs = set()

    if depth > max_depth:
        return None

    schema_norm = _normalize_schema(openapi, schema, seen_refs=set(seen_refs))

    if "default" in schema_norm:
        return schema_norm["default"]

    enum = schema_norm.get("enum")
    if isinstance(enum, list) and enum:
        return enum[0]

    schema_type = schema_norm.get("type")
    fmt = schema_norm.get("format")

    if schema_type == "object" or ("properties" in schema_norm and isinstance(schema_norm.get("properties"), dict)):
        props = schema_norm.get("properties") or {}
        required = set(schema_norm.get("required") or [])
        out: Dict[str, Any] = {}
        for name, prop_schema in props.items():
            # include required; include a few optional too (bounded)
            if name in required or len(out) < 6:
                out[name] = _example_for_schema(
                    openapi,
                    prop_schema,
                    depth=depth + 1,
                    max_depth=max_depth,
                    seen_refs=set(seen_refs),
                )
        return out

    if schema_type == "array":
        items = schema_norm.get("items", {})
        return [_example_for_schema(openapi, items, depth=depth + 1, max_depth=max_depth, seen_refs=set(seen_refs))]

    if schema_type == "integer":
        return 0
    if schema_type == "number":
        return 0.0
    if schema_type == "boolean":
        return False
    if schema_type == "string":
        if fmt == "date-time":
            return "2024-01-01T00:00:00Z"
        if fmt == "date":
            return "2024-01-01"
        if fmt == "uuid":
            return "00000000-0000-0000-0000-000000000000"
        if fmt == "email":
            return "user@example.com"
        return "string"

    # If type is missing, try some heuristics.
    if "properties" in schema_norm:
        return _example_for_schema(openapi, {"type": "object", "properties": schema_norm.get("properties")}, depth=depth + 1)

    return None


def _format_json(obj: Any) -> str:
    return json.dumps(obj, indent=2, ensure_ascii=False)


def _iter_operations(openapi: Dict[str, Any]) -> Iterable[Tuple[str, str, Dict[str, Any]]]:
    paths = openapi.get("paths") or {}
    for path, item in paths.items():
        if not isinstance(item, dict):
            continue
        for method, op in item.items():
            if method.lower() not in {"get", "post", "put", "patch", "delete", "options", "head"}:
                continue
            if not isinstance(op, dict):
                continue
            yield path, method.upper(), op


def _collect_by_tag(openapi: Dict[str, Any]) -> Dict[str, List[Tuple[str, str, Dict[str, Any]]]]:
    by_tag: Dict[str, List[Tuple[str, str, Dict[str, Any]]]] = {}
    for path, method, op in _iter_operations(openapi):
        tags = op.get("tags") or ["Untagged"]
        if not isinstance(tags, list) or not tags:
            tags = ["Untagged"]
        for tag in tags:
            tag_str = str(tag)
            by_tag.setdefault(tag_str, []).append((path, method, op))

    # stable sort within each tag: path then method
    for tag, ops in by_tag.items():
        ops.sort(key=lambda t: (t[0], t[1]))
    return dict(sorted(by_tag.items(), key=lambda kv: kv[0].lower()))


def _render_params(params: List[Dict[str, Any]], kind: str) -> str:
    # kind is "query" or "path" or "header"
    lines: List[str] = []
    for p in params:
        if p.get("in") != kind:
            continue
        name = p.get("name", "")
        required = bool(p.get("required"))
        schema = p.get("schema") or {}
        schema_type = schema.get("type")
        desc = p.get("description") or schema.get("description") or ""
        req = "required" if required else "optional"
        type_str = schema_type or "object"
        suffix = f": {desc}" if desc else ""
        lines.append(f"- `{name}` ({req}, {type_str}){suffix}")
    return "\n".join(lines)


def _render_request_body(openapi: Dict[str, Any], op: Dict[str, Any]) -> str:
    rb = op.get("requestBody")
    if not isinstance(rb, dict):
        return ""

    content = rb.get("content") or {}
    if not isinstance(content, dict) or not content:
        return ""

    # Prefer application/json.
    media = None
    if "application/json" in content:
        media = content["application/json"]
    else:
        # pick first
        media = next(iter(content.values()))

    if not isinstance(media, dict):
        return ""

    schema = media.get("schema") or {}
    example_obj = _example_for_schema(openapi, schema)
    if example_obj is None:
        return ""

    return (
        "**Request Body**:\n\n"
        "```json\n"
        f"{_format_json(example_obj)}\n"
        "```\n"
    )


def _render_responses(openapi: Dict[str, Any], op: Dict[str, Any]) -> str:
    responses = op.get("responses") or {}
    if not isinstance(responses, dict) or not responses:
        return ""

    out_lines: List[str] = ["**Responses**:"]
    for code, resp in responses.items():
        if not isinstance(resp, dict):
            continue
        desc = resp.get("description") or ""
        out_lines.append(f"\n- `{code}`: {desc}".rstrip())

        content = resp.get("content") or {}
        if not isinstance(content, dict) or not content:
            continue

        media = None
        if "application/json" in content:
            media = content["application/json"]
        else:
            media = next(iter(content.values()))

        if not isinstance(media, dict):
            continue

        schema = media.get("schema") or {}
        example_obj = _example_for_schema(openapi, schema)
        if example_obj is None:
            continue

        out_lines.append("\n```json")
        out_lines.append(_format_json(example_obj))
        out_lines.append("```")

    return "\n".join(out_lines) + "\n"


def _render_common_types(openapi: Dict[str, Any]) -> str:
    components = openapi.get("components") or {}
    schemas = components.get("schemas") or {}
    if not isinstance(schemas, dict):
        return ""

    enum_schemas: List[Tuple[str, List[Any]]] = []
    for name, schema in schemas.items():
        if not isinstance(schema, dict):
            continue
        enum = schema.get("enum")
        if isinstance(enum, list) and enum:
            enum_schemas.append((name, enum))

    if not enum_schemas:
        return (
            "## Common Types\n\n"
            "_No enum-style common types were found in the OpenAPI components._\n\n"
            "---\n\n"
        )

    lines: List[str] = ["## Common Types", ""]
    for name, enum in sorted(enum_schemas, key=lambda t: t[0].lower()):
        lines.append(f"### {name}")
        lines.append("")
        for v in enum:
            lines.append(f"- `{v}`")
        lines.append("")
    lines.append("---")
    lines.append("")
    return "\n".join(lines)


def _render_error_responses(openapi: Dict[str, Any]) -> str:
    # Best-effort: use FastAPI's default validation error schema if present.
    lines: List[str] = ["## Error Responses", ""]

    candidates = [
        ("422 Unprocessable Entity", "#/components/schemas/HTTPValidationError"),
        ("400 Bad Request", "#/components/schemas/HTTPValidationError"),
        ("500 Internal Server Error", "#/components/schemas/HTTPValidationError"),
    ]

    any_rendered = False
    for title, ref in candidates:
        schema = _resolve_ref(openapi, ref)
        if not schema:
            continue
        example_obj = _example_for_schema(openapi, {"$ref": ref})
        if example_obj is None:
            continue

        any_rendered = True
        lines.append(f"### {title}")
        lines.append("")
        lines.append("```json")
        lines.append(_format_json(example_obj))
        lines.append("```")
        lines.append("")

    if not any_rendered:
        return ""

    return "\n".join(lines).rstrip() + "\n"


def _generate_md(openapi: Dict[str, Any]) -> str:
    base_url = _pick_base_url(openapi)
    by_tag = _collect_by_tag(openapi)
    common_types = _render_common_types(openapi)

    # Table of contents entries with nested endpoint links
    toc_lines: List[str] = []
    for tag, ops in by_tag.items():
        title = f"{_titleize_tag(tag)} API"
        toc_lines.append(f"- [{title}](#{_slugify_heading(title)})")
        # Add sub-entries for each endpoint
        for path, method, op in ops:
            summary = op.get("summary") or f"{method} {path}"
            toc_lines.append(f"  - [{summary}](#{_slugify_heading(summary)})")
    toc_lines.append(f"- [Common Types](#{_slugify_heading('Common Types')})")
    toc_lines.append(f"- [Error Responses](#{_slugify_heading('Error Responses')})")

    lines: List[str] = [
        "# Deskzen REST API Contract",
        "",
        "This document describes the REST API endpoints for the Deskzen application.",
        "",
        f"**Base URL**: `{base_url}`",
        "",
        "---",
        "",
        "## Table of Contents",
        "",
        *toc_lines,
        "",
        "---",
        "",
    ]

    # Per-tag sections
    for tag, ops in by_tag.items():
        section_title = f"{_titleize_tag(tag)} API"
        lines.append(f"## {section_title}")
        lines.append("")

        for path, method, op in ops:
            summary = op.get("summary") or f"{method} {path}"
            description = op.get("description") or ""

            # Use full path with base url for display (Mira style)
            display_path = f"{base_url.rstrip('/')}{path}" if path.startswith("/") else f"{base_url.rstrip('/')}/{path}"

            lines.append(f"### {summary}")
            lines.append("")
            lines.append(f"**{method}** `{display_path}`")
            lines.append("")

            if description:
                lines.append(description.strip())
                lines.append("")

            params = op.get("parameters") or []
            if isinstance(params, list) and params:
                path_params = _render_params(params, "path")
                query_params = _render_params(params, "query")
                header_params = _render_params(params, "header")

                if path_params:
                    lines.append("**Path Parameters**:")
                    lines.append("")
                    lines.append(path_params)
                    lines.append("")

                if query_params:
                    lines.append("**Query Parameters**:")
                    lines.append("")
                    lines.append(query_params)
                    lines.append("")

                if header_params:
                    lines.append("**Header Parameters**:")
                    lines.append("")
                    lines.append(header_params)
                    lines.append("")

            req_block = _render_request_body(openapi, op)
            if req_block:
                lines.append(req_block.rstrip())
                lines.append("")

            resp_block = _render_responses(openapi, op)
            if resp_block:
                lines.append(resp_block.rstrip())
                lines.append("")

            lines.append("---")
            lines.append("")

    if common_types:
        lines.append(common_types.rstrip())
        lines.append("")

    error_responses = _render_error_responses(openapi)
    if error_responses:
        lines.append(error_responses.rstrip())
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------


def main() -> int:
    output_path = Path(os.getenv("OPENAPI_MD_OUT", str(DEFAULT_OUTPUT))).resolve()

    app = _import_fastapi_app()

    # Use FastAPI's schema builder (includes custom security schemes from custom_openapi()).
    schema: Dict[str, Any] = app.openapi()

    # Normalize: match the existing contract's server base url and relative paths.
    api_prefix = "/api/v1"
    try:
        from app.config import API_V1_PREFIX  # noqa: WPS433

        api_prefix = API_V1_PREFIX
    except Exception:
        # Fall back to the conventional default.
        pass

    _strip_api_prefix(schema, api_prefix, exclude_non_api_paths=True)
    _apply_contract_metadata(schema)
    schema = _reorder_top_level(schema)

    # Generate Markdown directly from the schema
    md_content = _generate_md(schema)
    output_path.write_text(md_content, encoding="utf-8")

    print(f"Wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
