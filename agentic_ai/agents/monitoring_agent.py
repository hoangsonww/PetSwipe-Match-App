"""
Monitoring Agent
================

Monitors system performance, tracks metrics, logs events, and provides
observability for the agentic AI pipeline.
"""

from typing import Dict, Any, List
from .base_agent import BaseAgent, AgentState
from datetime import datetime
import json


class MonitoringAgent(BaseAgent):
    """
    Agent responsible for monitoring and observability.

    Capabilities:
    - Track pipeline performance
    - Log agent executions
    - Collect metrics
    - Alert on anomalies
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(
            name="Monitor",
            description="Monitors system performance and collects metrics",
            config=config
        )

        self.metrics_store = []
        self.event_log = []
        self.performance_thresholds = config.get("thresholds", {
            "max_processing_time": 5.0,  # seconds
            "min_success_rate": 0.95,
            "max_error_rate": 0.05
        })

    async def process(self, state: AgentState) -> AgentState:
        """
        Process monitoring data and collect metrics.

        Args:
            state: Current agent state with execution data

        Returns:
            Updated state with monitoring results
        """
        try:
            execution_data = state.data.get("execution_data", {})

            # Collect metrics
            metrics = self._collect_metrics(execution_data)

            # Log event
            self._log_event(execution_data, metrics)

            # Check for anomalies
            anomalies = self._detect_anomalies(metrics)

            # Update state
            state.update_data("metrics", metrics)
            state.update_data("anomalies", anomalies)
            state.update_data("health_status", self._get_health_status(anomalies))

            state.update_metadata("monitor_version", "1.0.0")
            state.update_metadata("monitoring_completed", True)

            if anomalies:
                self.logger.warning(f"Detected {len(anomalies)} anomalies")
            else:
                self.logger.info("System health check passed")

            return state

        except Exception as e:
            self.logger.error(f"Monitoring failed: {str(e)}")
            state.add_error(f"Monitoring error: {str(e)}")
            return state

    def _collect_metrics(self, execution_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Collect metrics from execution data.

        Args:
            execution_data: Pipeline execution data

        Returns:
            Metrics dictionary
        """
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "pipeline_id": execution_data.get("pipeline_id", "unknown"),
            "agents_executed": execution_data.get("agents_executed", []),
            "total_processing_time": execution_data.get("total_time", 0.0),
            "success": execution_data.get("success", False),
            "errors": len(execution_data.get("errors", [])),
            "agent_metrics": {}
        }

        # Collect per-agent metrics
        for agent_result in execution_data.get("agent_results", []):
            agent_name = agent_result.get("agent", "unknown")
            metrics["agent_metrics"][agent_name] = {
                "success": agent_result.get("success", False),
                "processing_time": agent_result.get("processing_time", 0.0),
                "errors": agent_result.get("errors", [])
            }

        # Store metrics
        self.metrics_store.append(metrics)

        return metrics

    def _log_event(self, execution_data: Dict[str, Any], metrics: Dict[str, Any]) -> None:
        """
        Log execution event.

        Args:
            execution_data: Execution data
            metrics: Collected metrics
        """
        event = {
            "timestamp": datetime.now().isoformat(),
            "event_type": "pipeline_execution",
            "pipeline_id": execution_data.get("pipeline_id"),
            "success": metrics.get("success"),
            "duration": metrics.get("total_processing_time"),
            "errors": metrics.get("errors")
        }

        self.event_log.append(event)
        self.logger.info(f"Logged event: {event['event_type']}")

    def _detect_anomalies(self, metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Detect anomalies in metrics.

        Args:
            metrics: Current metrics

        Returns:
            List of detected anomalies
        """
        anomalies = []

        # Check processing time
        if metrics["total_processing_time"] > self.performance_thresholds["max_processing_time"]:
            anomalies.append({
                "type": "high_processing_time",
                "severity": "warning",
                "value": metrics["total_processing_time"],
                "threshold": self.performance_thresholds["max_processing_time"],
                "message": "Pipeline processing time exceeded threshold"
            })

        # Check error rate
        total_agents = len(metrics.get("agents_executed", []))
        if total_agents > 0 and metrics["errors"] / total_agents > self.performance_thresholds["max_error_rate"]:
            anomalies.append({
                "type": "high_error_rate",
                "severity": "critical",
                "value": metrics["errors"] / total_agents,
                "threshold": self.performance_thresholds["max_error_rate"],
                "message": "Error rate exceeded threshold"
            })

        # Check agent-specific anomalies
        for agent_name, agent_metrics in metrics.get("agent_metrics", {}).items():
            if not agent_metrics.get("success"):
                anomalies.append({
                    "type": "agent_failure",
                    "severity": "error",
                    "agent": agent_name,
                    "errors": agent_metrics.get("errors", []),
                    "message": f"Agent {agent_name} failed"
                })

        return anomalies

    def _get_health_status(self, anomalies: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Get overall health status.

        Args:
            anomalies: List of anomalies

        Returns:
            Health status dictionary
        """
        if not anomalies:
            return {"status": "healthy", "details": "All systems operational"}

        critical_count = sum(1 for a in anomalies if a.get("severity") == "critical")
        error_count = sum(1 for a in anomalies if a.get("severity") == "error")
        warning_count = sum(1 for a in anomalies if a.get("severity") == "warning")

        if critical_count > 0:
            status = "critical"
        elif error_count > 0:
            status = "degraded"
        elif warning_count > 0:
            status = "warning"
        else:
            status = "healthy"

        return {
            "status": status,
            "critical": critical_count,
            "errors": error_count,
            "warnings": warning_count,
            "total_anomalies": len(anomalies)
        }

    def get_metrics_summary(self, last_n: int = 10) -> Dict[str, Any]:
        """
        Get summary of recent metrics.

        Args:
            last_n: Number of recent metrics to include

        Returns:
            Metrics summary
        """
        recent_metrics = self.metrics_store[-last_n:]

        if not recent_metrics:
            return {"message": "No metrics available"}

        total_executions = len(recent_metrics)
        successful = sum(1 for m in recent_metrics if m.get("success"))
        avg_time = sum(m.get("total_processing_time", 0) for m in recent_metrics) / total_executions
        total_errors = sum(m.get("errors", 0) for m in recent_metrics)

        return {
            "total_executions": total_executions,
            "successful": successful,
            "success_rate": successful / total_executions if total_executions > 0 else 0,
            "average_processing_time": avg_time,
            "total_errors": total_errors,
            "error_rate": total_errors / total_executions if total_executions > 0 else 0
        }

    def export_metrics(self, format: str = "json") -> str:
        """
        Export metrics in specified format.

        Args:
            format: Export format (json, csv)

        Returns:
            Exported metrics string
        """
        if format == "json":
            return json.dumps(self.metrics_store, indent=2)
        else:
            return "Unsupported format"
