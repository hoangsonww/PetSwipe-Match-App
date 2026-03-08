"""
PetSwipe Agentic AI package.

The package intentionally avoids heavy wildcard imports at module import time,
so lightweight modules (config, schemas, utilities) can be imported without
eagerly loading model/runtime dependencies.
"""

__version__ = "1.0.0"
__author__ = "PetSwipe Team"

__all__ = ["__version__", "__author__"]
