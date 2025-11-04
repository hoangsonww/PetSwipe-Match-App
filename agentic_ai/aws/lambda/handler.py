"""
AWS Lambda Handler
==================

Lambda function handler for serverless deployment of the Agentic AI pipeline.
"""

import json
import os
import logging
from typing import Dict, Any

# Import agentic AI components
import sys
sys.path.append('/opt/python')

from workflows import WorkflowBuilder


# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize workflows (cold start)
config = {
    "model": os.environ.get("MODEL", "gpt-4o-mini"),
    "temperature": float(os.environ.get("TEMPERATURE", "0.7")),
    "openai_api_key": os.environ.get("OPENAI_API_KEY"),
    "min_score_threshold": float(os.environ.get("MIN_SCORE_THRESHOLD", "0.5"))
}

workflows = {
    "recommendation": WorkflowBuilder.build_recommendation_workflow(config),
    "conversation": WorkflowBuilder.build_conversation_workflow(config),
    "analysis": WorkflowBuilder.build_analysis_workflow(config)
}


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler function.

    Args:
        event: Lambda event data
        context: Lambda context

    Returns:
        Response dictionary
    """
    try:
        logger.info(f"Processing request: {event.get('requestContext', {}).get('requestId')}")

        # Parse request body
        body = json.loads(event.get("body", "{}"))

        workflow_type = body.get("workflow", "recommendation")
        input_data = body.get("data", {})

        # Validate workflow type
        if workflow_type not in workflows:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({
                    "error": "INVALID_WORKFLOW",
                    "message": f"Unknown workflow: {workflow_type}"
                })
            }

        # Execute workflow (synchronous)
        import asyncio
        workflow = workflows[workflow_type]
        result = asyncio.run(workflow.execute(input_data))

        # Return response
        return {
            "statusCode": 200 if result.get("success") else 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "success": result.get("success"),
                "data": result.get("data"),
                "metadata": result.get("metadata"),
                "errors": result.get("errors", [])
            })
        }

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}", exc_info=True)

        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "error": "INTERNAL_ERROR",
                "message": str(e)
            })
        }


def health_check_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Health check endpoint for Lambda.

    Args:
        event: Lambda event
        context: Lambda context

    Returns:
        Health status response
    """
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps({
            "status": "healthy",
            "workflows": list(workflows.keys()),
            "function": context.function_name,
            "version": context.function_version
        })
    }
