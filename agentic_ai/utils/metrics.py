"""Metrics collection utilities."""

from typing import Dict, Any
from datetime import datetime
from prometheus_client import Counter, Histogram, Gauge


class MetricsCollector:
    """
    Collect and export metrics for monitoring.
    """

    def __init__(self):
        # Counters
        self.request_counter = Counter(
            "agentic_ai_requests_total",
            "Total number of requests",
            ["workflow", "status"]
        )

        self.error_counter = Counter(
            "agentic_ai_errors_total",
            "Total number of errors",
            ["agent", "error_type"]
        )

        # Histograms
        self.processing_time = Histogram(
            "agentic_ai_processing_seconds",
            "Processing time in seconds",
            ["workflow", "agent"]
        )

        # Gauges
        self.active_requests = Gauge(
            "agentic_ai_active_requests",
            "Number of active requests"
        )

    def record_request(self, workflow: str, status: str) -> None:
        """Record a request."""
        self.request_counter.labels(workflow=workflow, status=status).inc()

    def record_error(self, agent: str, error_type: str) -> None:
        """Record an error."""
        self.error_counter.labels(agent=agent, error_type=error_type).inc()

    def record_processing_time(self, workflow: str, agent: str, duration: float) -> None:
        """Record processing time."""
        self.processing_time.labels(workflow=workflow, agent=agent).observe(duration)

    def increment_active_requests(self) -> None:
        """Increment active requests."""
        self.active_requests.inc()

    def decrement_active_requests(self) -> None:
        """Decrement active requests."""
        self.active_requests.dec()
