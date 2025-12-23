"""Configuration utilities."""

import yaml
import os
from typing import Any, Dict, Optional
from pathlib import Path


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
        _config_cache = yaml.safe_load(f) or {}

    _config_cache = _apply_env_overrides(_config_cache)
    _ensure_paths(_config_cache)
    validate_costs(_config_cache)

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


def resolve_agent_config(config: Dict[str, Any], agent_key: str) -> Dict[str, Any]:
    """Resolve agent config with model defaults and secrets."""
    models = config.get("models", {})
    agents = config.get("agents", {})
    agent_config = agents.get(agent_key, {})

    default_model = (
        agent_config.get("model")
        or models.get("default_model")
        or config.get("model")
    )
    default_temperature = (
        agent_config.get("temperature")
        or models.get("temperature")
        or config.get("temperature")
    )
    default_max_tokens = models.get("max_tokens", config.get("max_tokens", 2048))
    default_timeout = models.get("request_timeout", config.get("request_timeout", 30))
    default_retries = models.get("max_retries", config.get("max_retries", 2))

    openai_key = (
        config.get("secrets", {}).get("openai_api_key")
        or config.get("openai_api_key")
        or os.getenv("OPENAI_API_KEY")
    )

    resolved = {
        "model": default_model,
        "temperature": default_temperature if default_temperature is not None else 0.7,
        "max_tokens": agent_config.get("max_tokens", default_max_tokens),
        "request_timeout": agent_config.get(
            "request_timeout", default_timeout
        ),
        "max_retries": agent_config.get("max_retries", default_retries),
        "openai_api_key": openai_key,
    }

    resolved.update(agent_config)
    return resolved


def _apply_env_overrides(config: Dict[str, Any]) -> Dict[str, Any]:
    """Apply environment overrides for secrets and common settings."""
    config = dict(config)

    secrets = dict(config.get("secrets", {}))
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        secrets["openai_api_key"] = openai_key

    api_key = os.getenv("AGENTIC_AI_API_KEY")
    if api_key:
        security = dict(config.get("security", {}))
        security["api_key"] = api_key
        config["security"] = security

    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        cache = dict(config.get("cache", {}))
        cache["redis_url"] = redis_url
        config["cache"] = cache

    log_level = os.getenv("LOG_LEVEL")
    if log_level:
        logging_cfg = dict(config.get("logging", {}))
        logging_cfg["level"] = log_level
        config["logging"] = logging_cfg

    if secrets:
        config["secrets"] = secrets

    return config


def _ensure_paths(config: Dict[str, Any]) -> None:
    """Ensure log and storage paths exist."""
    logging_cfg = config.get("logging", {})
    log_file = logging_cfg.get("file", {}).get("path")
    if log_file:
        Path(log_file).parent.mkdir(parents=True, exist_ok=True)

    storage_cfg = config.get("storage", {})
    storage_path = storage_cfg.get("local_path")
    if storage_path:
        Path(storage_path).mkdir(parents=True, exist_ok=True)

    costs_cfg = config.get("costs", {})
    export_path = costs_cfg.get("export_path")
    if export_path:
        Path(export_path).parent.mkdir(parents=True, exist_ok=True)


def validate_costs(config: Dict[str, Any]) -> None:
    """Validate that configured models have pricing entries."""
    costs_cfg = config.get("costs", {})
    if not costs_cfg.get("enabled", False):
        return

    if not costs_cfg.get("require_known_models", True):
        return

    pricing = costs_cfg.get("models", {})
    if not pricing:
        raise ValueError("Cost tracking is enabled but costs.models is empty")

    model_names = set(pricing.keys())
    used_models = set()

    models_cfg = config.get("models", {})
    default_model = models_cfg.get("default_model") or config.get("model")
    fallback_model = models_cfg.get("fallback_model")
    if default_model:
        used_models.add(default_model)
    if fallback_model:
        used_models.add(fallback_model)

    for agent_cfg in config.get("agents", {}).values():
        if isinstance(agent_cfg, dict) and agent_cfg.get("model"):
            used_models.add(agent_cfg["model"])

    missing = sorted(name for name in used_models if name not in model_names)
    if missing:
        raise ValueError(f"Missing pricing entries for models: {', '.join(missing)}")
