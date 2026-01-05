"""Configuration loading and management."""

from pathlib import Path
from typing import Any
import yaml


def load_config(config_path: str | Path | None = None) -> dict[str, Any]:
    """
    Load configuration from YAML file.

    If config_path is provided, uses that file exclusively (complete override).
    Otherwise, loads built-in defaults.

    Args:
        config_path: Path to config file. If None, loads defaults.

    Returns:
        Configuration dictionary.
    """
    if config_path:
        # User config completely overrides defaults
        return _load_yaml(Path(config_path))
    else:
        # Load built-in defaults
        default_path = Path(__file__).parent / "defaults.yaml"
        return _load_yaml(default_path)


def get_default_config_path() -> Path:
    """Get path to default config file."""
    return Path(__file__).parent / "defaults.yaml"


def dump_default_config() -> str:
    """Return the default config as a YAML string."""
    default_path = get_default_config_path()
    if default_path.exists():
        with open(default_path, "r") as f:
            return f.read()
    return ""


def _load_yaml(path: Path) -> dict[str, Any]:
    """Load YAML file."""
    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")

    with open(path, "r") as f:
        return yaml.safe_load(f) or {}


__all__ = ["load_config", "dump_default_config", "get_default_config_path"]
