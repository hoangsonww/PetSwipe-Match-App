"""
PetSwipe Agentic AI Pipeline
============================

A sophisticated agentic AI system using LangGraph and LangChain for intelligent
pet matching, recommendation, and user interaction processing.

Features:
- Multi-agent assembly line architecture
- LangGraph workflow orchestration
- Model Context Protocol (MCP) server
- Production-ready deployment configurations for AWS and Azure
"""

__version__ = "1.0.0"
__author__ = "PetSwipe Team"

from .agents import *
from .workflows import *
from .mcp_server import *
from .config import *
