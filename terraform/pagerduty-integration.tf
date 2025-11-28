# ═══════════════════════════════════════════════════════════════════════════
# PagerDuty Integration for Advanced Alerting and Incident Management
# ═══════════════════════════════════════════════════════════════════════════

# ─── SNS to PagerDuty Lambda Integration ─────────────────────────────────────

resource "aws_lambda_function" "pagerduty_forwarder" {
  count = var.enable_pagerduty ? 1 : 0

  filename         = "${path.module}/../lambda/pagerduty-forwarder.zip"
  function_name    = "${var.project}-${var.environment}-pagerduty-forwarder"
  role             = aws_iam_role.pagerduty_forwarder[0].arn
  handler          = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/../lambda/pagerduty-forwarder.zip")
  runtime          = "nodejs18.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      PAGERDUTY_INTEGRATION_KEY = var.pagerduty_integration_key
      SEVERITY_MAPPING          = jsonencode({
        CRITICAL = "critical"
        HIGH     = "error"
        MEDIUM   = "warning"
        LOW      = "info"
      })
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-pagerduty-forwarder"
  })
}

resource "aws_iam_role" "pagerduty_forwarder" {
  count = var.enable_pagerduty ? 1 : 0

  name = "${var.project}-${var.environment}-pagerduty-forwarder-role"

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

resource "aws_iam_role_policy" "pagerduty_forwarder" {
  count = var.enable_pagerduty ? 1 : 0

  name = "${var.project}-${var.environment}-pagerduty-forwarder-policy"
  role = aws_iam_role.pagerduty_forwarder[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = "arn:aws:logs:*:*:*"
    }]
  })
}

# ─── SNS Topic for PagerDuty Alerts ──────────────────────────────────────────

resource "aws_sns_topic" "pagerduty_critical" {
  count = var.enable_pagerduty ? 1 : 0

  name              = "${var.project}-${var.environment}-pagerduty-critical"
  kms_master_key_id = var.enable_kms_encryption ? aws_kms_key.main[0].id : null

  tags = merge(local.common_tags, {
    Name     = "${var.project}-${var.environment}-pagerduty-critical"
    Severity = "critical"
  })
}

resource "aws_sns_topic_subscription" "pagerduty_critical" {
  count = var.enable_pagerduty ? 1 : 0

  topic_arn = aws_sns_topic.pagerduty_critical[0].arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.pagerduty_forwarder[0].arn
}

resource "aws_lambda_permission" "pagerduty_critical" {
  count = var.enable_pagerduty ? 1 : 0

  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pagerduty_forwarder[0].function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.pagerduty_critical[0].arn
}

# ─── Critical Alarms with PagerDuty Integration ──────────────────────────────

resource "aws_cloudwatch_metric_alarm" "critical_service_down" {
  count = var.enable_pagerduty ? 1 : 0

  alarm_name          = "${var.project}-${var.environment}-critical-service-down"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Minimum"
  threshold           = "1"
  alarm_description   = "CRITICAL: All service instances are unhealthy"
  alarm_actions       = [aws_sns_topic.pagerduty_critical[0].arn]
  treat_missing_data  = "breaching"

  dimensions = {
    TargetGroup  = aws_lb_target_group.main.arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = merge(local.common_tags, {
    Severity = "critical"
  })
}

resource "aws_cloudwatch_metric_alarm" "critical_database_down" {
  count = var.enable_pagerduty ? 1 : 0

  alarm_name          = "${var.project}-${var.environment}-critical-database-down"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "60"
  statistic           = "Maximum"
  threshold           = "1"
  alarm_description   = "CRITICAL: Database has no connections (may be down)"
  alarm_actions       = [aws_sns_topic.pagerduty_critical[0].arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }

  tags = merge(local.common_tags, {
    Severity = "critical"
  })
}

resource "aws_cloudwatch_metric_alarm" "critical_cpu_sustained" {
  count = var.enable_pagerduty ? 1 : 0

  alarm_name          = "${var.project}-${var.environment}-critical-cpu-sustained"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "5"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "95"
  alarm_description   = "CRITICAL: Sustained high CPU usage"
  alarm_actions       = [aws_sns_topic.pagerduty_critical[0].arn]

  dimensions = {
    ServiceName = aws_ecs_service.backend.name
    ClusterName = aws_ecs_cluster.cluster.name
  }

  tags = merge(local.common_tags, {
    Severity = "critical"
  })
}

# ─── Outputs ─────────────────────────────────────────────────────────────────

output "pagerduty_lambda_arn" {
  description = "PagerDuty forwarder Lambda ARN"
  value       = var.enable_pagerduty ? aws_lambda_function.pagerduty_forwarder[0].arn : null
}
