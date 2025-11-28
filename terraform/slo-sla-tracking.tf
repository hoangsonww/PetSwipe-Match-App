# ═══════════════════════════════════════════════════════════════════════════
# SLO/SLA Tracking and Error Budget Implementation
# Service Level Objectives, Service Level Agreements, and Error Budget Management
# ═══════════════════════════════════════════════════════════════════════════

# ─── SLO Definitions ─────────────────────────────────────────────────────────

locals {
  slo_targets = {
    availability = {
      target      = 99.9  # 99.9% availability
      measurement_window = 2592000  # 30 days in seconds
    }
    latency_p50 = {
      target      = 200  # 200ms P50 latency
      measurement_window = 86400  # 24 hours
    }
    latency_p95 = {
      target      = 500  # 500ms P95 latency
      measurement_window = 86400
    }
    latency_p99 = {
      target      = 1000  # 1000ms P99 latency
      measurement_window = 86400
    }
    error_rate = {
      target      = 0.1  # 0.1% error rate
      measurement_window = 3600  # 1 hour
    }
  }
}

# ─── CloudWatch Metrics for SLO Tracking ─────────────────────────────────────

resource "aws_cloudwatch_log_metric_filter" "slo_availability" {
  name           = "${var.project}-${var.environment}-slo-availability"
  log_group_name = aws_cloudwatch_log_group.alb.name
  pattern        = "[request_id, timestamp, client_ip, target_ip, request_processing_time, target_processing_time, response_processing_time, elb_status_code=200||201||202||203||204||206||301||302||303||304||307, ...]"

  metric_transformation {
    name      = "SuccessfulRequests"
    namespace = "PetSwipe/SLO"
    value     = "1"
    unit      = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "slo_errors" {
  name           = "${var.project}-${var.environment}-slo-errors"
  log_group_name = aws_cloudwatch_log_group.alb.name
  pattern        = "[request_id, timestamp, client_ip, target_ip, request_processing_time, target_processing_time, response_processing_time, elb_status_code=5*, ...]"

  metric_transformation {
    name      = "ErrorRequests"
    namespace = "PetSwipe/SLO"
    value     = "1"
    unit      = "Count"
  }
}

# ─── SLI Composite Alarms ────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "slo_availability_breach" {
  alarm_name          = "${var.project}-${var.environment}-slo-availability-breach"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "12"  # 1 hour with 5-min periods
  threshold           = local.slo_targets.availability.target
  alarm_description   = "SLO availability breach - below ${local.slo_targets.availability.target}%"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.slo_alerts.arn]

  metric_query {
    id          = "availability"
    expression  = "(successful / total) * 100"
    label       = "Availability %"
    return_data = true
  }

  metric_query {
    id = "successful"
    metric {
      metric_name = "SuccessfulRequests"
      namespace   = "PetSwipe/SLO"
      period      = 300
      stat        = "Sum"
    }
  }

  metric_query {
    id = "total"
    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions = {
        LoadBalancer = aws_lb.main.arn_suffix
      }
    }
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "slo_latency_p99_breach" {
  alarm_name          = "${var.project}-${var.environment}-slo-latency-p99-breach"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "p99"
  threshold           = local.slo_targets.latency_p99.target / 1000  # Convert to seconds
  alarm_description   = "SLO P99 latency breach - above ${local.slo_targets.latency_p99.target}ms"
  alarm_actions       = [aws_sns_topic.slo_alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "slo_error_rate_breach" {
  alarm_name          = "${var.project}-${var.environment}-slo-error-rate-breach"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  threshold           = local.slo_targets.error_rate.target
  alarm_description   = "SLO error rate breach - above ${local.slo_targets.error_rate.target}%"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.slo_alerts.arn]

  metric_query {
    id          = "error_rate"
    expression  = "(errors / total) * 100"
    label       = "Error Rate %"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "HTTPCode_Target_5XX_Count"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions = {
        LoadBalancer = aws_lb.main.arn_suffix
      }
    }
  }

  metric_query {
    id = "total"
    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions = {
        LoadBalancer = aws_lb.main.arn_suffix
      }
    }
  }

  tags = local.common_tags
}

# ─── Error Budget Calculation Lambda ─────────────────────────────────────────

resource "aws_lambda_function" "error_budget_calculator" {
  filename         = "${path.module}/../lambda/error-budget.zip"
  function_name    = "${var.project}-${var.environment}-error-budget"
  role             = aws_iam_role.error_budget.arn
  handler          = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/../lambda/error-budget.zip")
  runtime          = "python3.11"
  timeout          = 60
  memory_size      = 256

  environment {
    variables = {
      SLO_AVAILABILITY_TARGET = local.slo_targets.availability.target
      SLO_ERROR_RATE_TARGET   = local.slo_targets.error_rate.target
      MEASUREMENT_WINDOW      = local.slo_targets.availability.measurement_window
      ALB_ARN_SUFFIX          = aws_lb.main.arn_suffix
      SNS_TOPIC_ARN           = aws_sns_topic.slo_alerts.arn
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-error-budget"
  })
}

resource "aws_iam_role" "error_budget" {
  name = "${var.project}-${var.environment}-error-budget-role"

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

resource "aws_iam_role_policy" "error_budget" {
  name = "${var.project}-${var.environment}-error-budget-policy"
  role = aws_iam_role.error_budget.id

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
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:GetMetricData",
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.slo_alerts.arn
      }
    ]
  })
}

# ─── EventBridge Rule for Error Budget Tracking ──────────────────────────────

resource "aws_cloudwatch_event_rule" "error_budget_tracking" {
  name                = "${var.project}-${var.environment}-error-budget-tracking"
  description         = "Calculate error budget consumption"
  schedule_expression = "rate(15 minutes)"

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "error_budget_tracking" {
  rule      = aws_cloudwatch_event_rule.error_budget_tracking.name
  target_id = "ErrorBudgetLambda"
  arn       = aws_lambda_function.error_budget_calculator.arn
}

resource "aws_lambda_permission" "error_budget_tracking" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.error_budget_calculator.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.error_budget_tracking.arn
}

# ─── SNS Topic for SLO Alerts ────────────────────────────────────────────────

resource "aws_sns_topic" "slo_alerts" {
  name              = "${var.project}-${var.environment}-slo-alerts"
  kms_master_key_id = var.enable_kms_encryption ? aws_kms_key.main[0].id : null

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-slo-alerts"
  })
}

resource "aws_sns_topic_subscription" "slo_email" {
  topic_arn = aws_sns_topic.slo_alerts.arn
  protocol  = "email"
  endpoint  = var.sre_email
}

# ─── CloudWatch Dashboard for SLO/SLA Tracking ───────────────────────────────

resource "aws_cloudwatch_dashboard" "slo_tracking" {
  dashboard_name = "${var.project}-${var.environment}-slo-tracking"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 24
        height = 6
        properties = {
          title = "SLO - Availability (Target: ${local.slo_targets.availability.target}%)"
          metrics = [
            [{ expression = "(m1 / m2) * 100", label = "Availability %", id = "e1" }],
            ["PetSwipe/SLO", "SuccessfulRequests", { stat = "Sum", id = "m1", visible = false }],
            ["AWS/ApplicationELB", "RequestCount", { stat = "Sum", id = "m2", visible = false }]
          ]
          region = var.aws_region
          yAxis = {
            left = {
              min = local.slo_targets.availability.target - 1
              max = 100
            }
          }
          annotations = {
            horizontal = [{
              value = local.slo_targets.availability.target
              label = "SLO Target"
              fill  = "above"
            }]
          }
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title = "SLO - Latency Distribution"
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "p50", label = "P50" }],
            ["...", { stat = "p95", label = "P95" }],
            ["...", { stat = "p99", label = "P99" }]
          ]
          region = var.aws_region
          annotations = {
            horizontal = [
              {
                value = local.slo_targets.latency_p50.target / 1000
                label = "P50 Target"
              },
              {
                value = local.slo_targets.latency_p95.target / 1000
                label = "P95 Target"
              },
              {
                value = local.slo_targets.latency_p99.target / 1000
                label = "P99 Target"
              }
            ]
          }
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title = "SLO - Error Rate (Target: < ${local.slo_targets.error_rate.target}%)"
          metrics = [
            [{ expression = "(m1 / m2) * 100", label = "Error Rate %", id = "e1" }],
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", { stat = "Sum", id = "m1", visible = false }],
            [".", "RequestCount", { stat = "Sum", id = "m2", visible = false }]
          ]
          region = var.aws_region
          annotations = {
            horizontal = [{
              value = local.slo_targets.error_rate.target
              label = "SLO Target"
              fill  = "above"
            }]
          }
        }
      },
      {
        type   = "metric"
        width  = 24
        height = 6
        properties = {
          title = "Error Budget Consumption"
          metrics = [
            ["PetSwipe/SLO", "ErrorBudgetRemaining", { stat = "Average" }],
            [".", "ErrorBudgetConsumed", { stat = "Average" }]
          ]
          region = var.aws_region
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      }
    ]
  })
}

# ─── Outputs ─────────────────────────────────────────────────────────────────

output "slo_dashboard_url" {
  description = "URL to SLO tracking dashboard"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.slo_tracking.dashboard_name}"
}

output "error_budget_lambda_arn" {
  description = "Error budget calculator Lambda ARN"
  value       = aws_lambda_function.error_budget_calculator.arn
}
