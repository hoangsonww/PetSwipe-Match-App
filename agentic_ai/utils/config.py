"""Configuration utilities."""

import yaml
import os
from typing import Any, Dict, Optional


_config_cache: Optional[Dict[str, Any]] = None


def load_config(config_path: str = "config/config.yaml") -> Dict[str, Any]:
    """
    Load configuration from YAML file.

    Args:
        config_path: Path to configuration file

    Returns:
        Configuration dictionary
    """
    global _config_cache

    if _config_cache is not None:
        return _config_cache

    with open(config_path, "r") as f:
        _config_cache = yaml.safe_load(f)

    return _config_cache


def get_config_value(key: str, default: Any = None) -> Any:
    """
    Get configuration value.

    Args:
        key: Configuration key (supports dot notation)
        default: Default value if key not found

    Returns:
        Configuration value
    """
    config = load_config()

    keys = key.split(".")
    value = config

    for k in keys:
        if isinstance(value, dict) and k in value:
            value = value[k]
        else:
            return default

    return value
