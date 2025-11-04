# Lambda Function Deployment with Terraform

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  default = "us-east-1"
}

variable "function_name" {
  default = "agentic-ai-lambda"
}

variable "openai_api_key" {
  type      = string
  sensitive = true
}

# Lambda Layer for Dependencies
resource "aws_lambda_layer_version" "dependencies" {
  filename            = "layer.zip"
  layer_name          = "${var.function_name}-dependencies"
  compatible_runtimes = ["python3.11"]
  description         = "Dependencies for Agentic AI"
}

# Lambda Execution Role
resource "aws_iam_role" "lambda_role" {
  name = "${var.function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Secrets Manager for API Keys
resource "aws_secretsmanager_secret" "openai_key" {
  name = "${var.function_name}/openai-key"
}

resource "aws_secretsmanager_secret_version" "openai_key" {
  secret_id     = aws_secretsmanager_secret.openai_key.id
  secret_string = var.openai_api_key
}

# Lambda Function
resource "aws_lambda_function" "agentic_ai" {
  filename         = "function.zip"
  function_name    = var.function_name
  role            = aws_iam_role.lambda_role.arn
  handler         = "handler.lambda_handler"
  source_code_hash = filebase64sha256("function.zip")
  runtime         = "python3.11"
  timeout         = 300
  memory_size     = 2048

  layers = [aws_lambda_layer_version.dependencies.arn]

  environment {
    variables = {
      OPENAI_API_KEY_SECRET = aws_secretsmanager_secret.openai_key.arn
      MODEL                 = "gpt-4o-mini"
      TEMPERATURE           = "0.7"
      MIN_SCORE_THRESHOLD   = "0.5"
    }
  }
}

# API Gateway
resource "aws_apigatewayv2_api" "lambda_api" {
  name          = "${var.function_name}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["POST", "GET", "OPTIONS"]
    allow_headers = ["*"]
  }
}

resource "aws_apigatewayv2_stage" "lambda_stage" {
  api_id      = aws_apigatewayv2_api.lambda_api.id
  name        = "prod"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id           = aws_apigatewayv2_api.lambda_api.id
  integration_type = "AWS_PROXY"

  integration_method = "POST"
  integration_uri    = aws_lambda_function.agentic_ai.invoke_arn
}

resource "aws_apigatewayv2_route" "lambda_route" {
  api_id    = aws_apigatewayv2_api.lambda_api.id
  route_key = "POST /execute"

  target = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.agentic_ai.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.lambda_api.execution_arn}/*/*"
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = 14
}

# Outputs
output "api_endpoint" {
  value = aws_apigatewayv2_stage.lambda_stage.invoke_url
}

output "function_name" {
  value = aws_lambda_function.agentic_ai.function_name
}
