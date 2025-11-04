"""
MCP Protocol
============

Defines the Model Context Protocol message format and validation.
"""

from typing import Dict, Any, Optional
from datetime import datetime


class MCPProtocol:
    """
    Model Context Protocol implementation.

    Defines message formats for requests and responses.
    """

    VERSION = "1.0.0"

    def validate_request(self, request: Dict[str, Any]) -> bool:
        """
        Validate MCP request format.

        Args:
            request: Request dictionary

        Returns:
            True if valid, False otherwise
        """
        required_fields = ["id", "type", "version"]

        for field in required_fields:
            if field not in request:
                return False

        return True

    def create_success_response(
        self,
        request_id: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a success response.

        Args:
            request_id: Request ID
            data: Response data

        Returns:
            Response dictionary
        """
        return {
            "id": request_id,
            "version": self.VERSION,
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "data": data
        }

    def create_error_response(
        self,
        request_id: str,
        error_code: str,
        error_message: str
    ) -> Dict[str, Any]:
        """
        Create an error response.

        Args:
            request_id: Request ID
            error_code: Error code
            error_message: Error message

        Returns:
            Error response dictionary
        """
        return {
            "id": request_id,
            "version": self.VERSION,
            "status": "error",
            "timestamp": datetime.now().isoformat(),
            "error": {
                "code": error_code,
                "message": error_message
            }
        }

    def create_request(
        self,
        request_type: str,
        data: Dict[str, Any],
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create an MCP request.

        Args:
            request_type: Type of request
            data: Request data
            request_id: Optional request ID

        Returns:
            Request dictionary
        """
        import uuid

        return {
            "id": request_id or str(uuid.uuid4()),
            "type": request_type,
            "version": self.VERSION,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
