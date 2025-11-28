# ═══════════════════════════════════════════════════════════════════════════
# Automated Secret Rotation
# AWS Secrets Manager with automatic rotation for database credentials
# ═══════════════════════════════════════════════════════════════════════════

# ─── Lambda for Secret Rotation ──────────────────────────────────────────────

resource "aws_lambda_function" "secret_rotation" {
  filename         = "${path.module}/../lambda/secret-rotation.zip"
  function_name    = "${var.project}-${var.environment}-secret-rotation"
  role             = aws_iam_role.secret_rotation.arn
  handler          = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/../lambda/secret-rotation.zip")
  runtime          = "python3.11"
  timeout          = 300
  memory_size      = 256

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.security_group_ids
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-secret-rotation"
  })
}

resource "aws_iam_role" "secret_rotation" {
  name = "${var.project}-${var.environment}-secret-rotation-role"

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

  tags = local.common_tags
}

resource "aws_iam_role_policy" "secret_rotation" {
  name = "${var.project}-${var.environment}-secret-rotation-policy"
  role = aws_iam_role.secret_rotation.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage"
        ]
        Resource = aws_secretsmanager_secret.db_credentials.arn
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetRandomPassword"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances",
          "rds:ModifyDBInstance"
        ]
        Resource = aws_db_instance.postgres.arn
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface"
        ]
        Resource = "*"
      }
    ]
  })
}

# ─── Secret Rotation Configuration ───────────────────────────────────────────

resource "aws_secretsmanager_secret_rotation" "db_credentials" {
  secret_id           = aws_secretsmanager_secret.db_credentials.id
  rotation_lambda_arn = aws_lambda_function.secret_rotation.arn

  rotation_rules {
    automatically_after_days = 30
  }
}

resource "aws_lambda_permission" "secret_rotation" {
  statement_id  = "AllowExecutionFromSecretsManager"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.secret_rotation.function_name
  principal     = "secretsmanager.amazonaws.com"
}

# ─── Additional Secrets for API Keys ─────────────────────────────────────────

resource "aws_secretsmanager_secret" "api_keys" {
  name        = "${var.project}-${var.environment}-api-keys"
  description = "API keys and tokens"
  kms_key_id  = var.enable_kms_encryption ? aws_kms_key.main[0].arn : null

  rotation_rules {
    automatically_after_days = 90
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-api-keys"
  })
}

resource "aws_secretsmanager_secret_version" "api_keys" {
  secret_id = aws_secretsmanager_secret.api_keys.id
  secret_string = jsonencode({
    stripe_api_key    = var.stripe_api_key
    sendgrid_api_key  = var.sendgrid_api_key
    twilio_auth_token = var.twilio_auth_token
  })
}

# ─── JWT Secret Rotation ─────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${var.project}-${var.environment}-jwt-secret"
  description = "JWT signing secret"
  kms_key_id  = var.enable_kms_encryption ? aws_kms_key.main[0].arn : null

  rotation_rules {
    automatically_after_days = 90
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-jwt-secret"
  })
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

# ─── CloudWatch Alarms for Rotation Failures ─────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "secret_rotation_failed" {
  alarm_name          = "${var.project}-${var.environment}-secret-rotation-failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Secret rotation has failed"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.secret_rotation.function_name
  }

  tags = local.common_tags
}

# ─── SNS Topic for Rotation Notifications ────────────────────────────────────

resource "aws_sns_topic" "secret_rotation_notifications" {
  name              = "${var.project}-${var.environment}-secret-rotation"
  kms_master_key_id = var.enable_kms_encryption ? aws_kms_key.main[0].id : null

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-secret-rotation-notifications"
  })
}

resource "aws_sns_topic_subscription" "secret_rotation_email" {
  topic_arn = aws_sns_topic.secret_rotation_notifications.arn
  protocol  = "email"
  endpoint  = var.ops_email
}

# ─── EventBridge Rule for Manual Rotation Trigger ────────────────────────────

resource "aws_cloudwatch_event_rule" "manual_secret_rotation" {
  name        = "${var.project}-${var.environment}-manual-secret-rotation"
  description = "Trigger manual secret rotation via EventBridge"

  event_pattern = jsonencode({
    source      = ["custom.secretrotation"]
    detail-type = ["Manual Secret Rotation Requested"]
  })

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "manual_secret_rotation" {
  rule      = aws_cloudwatch_event_rule.manual_secret_rotation.name
  target_id = "TriggerSecretRotation"
  arn       = aws_lambda_function.secret_rotation.arn
}

resource "aws_lambda_permission" "manual_secret_rotation" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.secret_rotation.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.manual_secret_rotation.arn
}

# ─── Outputs ─────────────────────────────────────────────────────────────────

output "secret_rotation_lambda_arn" {
  description = "Secret rotation Lambda ARN"
  value       = aws_lambda_function.secret_rotation.arn
}

output "db_credentials_secret_arn" {
  description = "Database credentials secret ARN"
  value       = aws_secretsmanager_secret.db_credentials.arn
}
