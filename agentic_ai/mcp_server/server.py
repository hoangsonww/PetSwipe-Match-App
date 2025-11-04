"""
MCP Server
==========

Main server implementation for the Model Context Protocol.
"""

from typing import Dict, Any, Optional
import asyncio
import logging
from datetime import datetime
import json

from .handlers import RequestHandler
from .protocol import MCPProtocol
from ..workflows import AssemblyLinePipeline, WorkflowBuilder


class MCPServer:
    """
    Model Context Protocol Server for Agentic AI.

    Provides a standardized interface for AI model interactions
    and workflow orchestration.
    """

    def __init__(
        self,
        host: str = "0.0.0.0",
        port: int = 8765,
        config: Optional[Dict[str, Any]] = None
    ):
        self.host = host
        self.port = port
        self.config = config or {}
        self.logger = logging.getLogger("mcp_server")

        # Initialize components
        self.protocol = MCPProtocol()
        self.handler = RequestHandler(config)

        # Server state
        self.server = None
        self.is_running = False
        self.active_connections = set()

        # Metrics
        self.request_count = 0
        self.error_count = 0

    async def start(self) -> None:
        """Start the MCP server."""
        self.logger.info(f"Starting MCP server on {self.host}:{self.port}")

        try:
            # Start WebSocket server
            import websockets

            self.server = await websockets.serve(
                self._handle_connection,
                self.host,
                self.port
            )

            self.is_running = True
            self.logger.info("MCP server started successfully")

            # Keep server running
            await asyncio.Future()  # run forever

        except Exception as e:
            self.logger.error(f"Failed to start server: {str(e)}")
            raise

    async def stop(self) -> None:
        """Stop the MCP server."""
        self.logger.info("Stopping MCP server")

        self.is_running = False

        # Close all active connections
        for connection in self.active_connections:
            await connection.close()

        # Stop server
        if self.server:
            self.server.close()
            await self.server.wait_closed()

        self.logger.info("MCP server stopped")

    async def _handle_connection(self, websocket, path: str) -> None:
        """
        Handle incoming WebSocket connection.

        Args:
            websocket: WebSocket connection
            path: Request path
        """
        self.active_connections.add(websocket)
        self.logger.info(f"New connection from {websocket.remote_address}")

        try:
            async for message in websocket:
                await self._process_message(websocket, message)

        except Exception as e:
            self.logger.error(f"Connection error: {str(e)}")
            self.error_count += 1

        finally:
            self.active_connections.remove(websocket)
            self.logger.info(f"Connection closed: {websocket.remote_address}")

    async def _process_message(self, websocket, message: str) -> None:
        """
        Process incoming message.

        Args:
            websocket: WebSocket connection
            message: Message string
        """
        try:
            self.request_count += 1

            # Parse message
            request = json.loads(message)

            # Validate request
            if not self.protocol.validate_request(request):
                error_response = self.protocol.create_error_response(
                    request.get("id", "unknown"),
                    "INVALID_REQUEST",
                    "Invalid request format"
                )
                await websocket.send(json.dumps(error_response))
                return

            # Handle request
            response = await self.handler.handle_request(request)

            # Send response
            await websocket.send(json.dumps(response))

        except json.JSONDecodeError:
            error_response = self.protocol.create_error_response(
                "unknown",
                "PARSE_ERROR",
                "Failed to parse JSON"
            )
            await websocket.send(json.dumps(error_response))
            self.error_count += 1

        except Exception as e:
            self.logger.error(f"Error processing message: {str(e)}")
            error_response = self.protocol.create_error_response(
                request.get("id", "unknown"),
                "INTERNAL_ERROR",
                str(e)
            )
            await websocket.send(json.dumps(error_response))
            self.error_count += 1

    def get_stats(self) -> Dict[str, Any]:
        """
        Get server statistics.

        Returns:
            Statistics dictionary
        """
        return {
            "is_running": self.is_running,
            "active_connections": len(self.active_connections),
            "total_requests": self.request_count,
            "total_errors": self.error_count,
            "error_rate": (
                self.error_count / self.request_count
                if self.request_count > 0
                else 0
            ),
            "host": self.host,
            "port": self.port
        }

    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check.

        Returns:
            Health status dictionary
        """
        return {
            "status": "healthy" if self.is_running else "stopped",
            "timestamp": datetime.now().isoformat(),
            "uptime": "N/A",  # TODO: Calculate actual uptime
            "stats": self.get_stats()
        }


# CLI entry point
async def main():
    """Main entry point for MCP server."""
    import argparse

    parser = argparse.ArgumentParser(description="MCP Server for Agentic AI")
    parser.add_argument("--host", default="0.0.0.0", help="Server host")
    parser.add_argument("--port", type=int, default=8765, help="Server port")
    parser.add_argument("--config", help="Path to configuration file")

    args = parser.parse_args()

    # Load configuration
    config = {}
    if args.config:
        with open(args.config, "r") as f:
            config = json.load(f)

    # Start server
    server = MCPServer(host=args.host, port=args.port, config=config)

    try:
        await server.start()
    except KeyboardInterrupt:
        await server.stop()


if __name__ == "__main__":
    asyncio.run(main())
