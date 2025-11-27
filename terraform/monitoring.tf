# ═══════════════════════════════════════════════════════════════════════════
# Comprehensive Monitoring and Observability Configuration
# CloudWatch, X-Ray, and Custom Metrics for Production Deployments
# ═══════════════════════════════════════════════════════════════════════════

# ─── CloudWatch Log Groups ───────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "ecs" {
  name              = local.log_group_name
  retention_in_days = var.log_retention_days
  kms_key_id        = var.enable_kms_encryption ? aws_kms_key.main[0].arn : null

  tags = merge(local.common_tags, {
    Name    = local.log_group_name
    Purpose = "ECS Container Logs"
  })
}

resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/application/${var.project}-${var.environment}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.enable_kms_encryption ? aws_kms_key.main[0].arn : null

  tags = merge(local.common_tags, {
    Name    = "/aws/application/${var.project}-${var.environment}"
    Purpose = "Application Logs"
  })
}

resource "aws_cloudwatch_log_group" "alb" {
  name              = "/aws/elasticloadbalancing/${var.project}-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = merge(local.common_tags, {
    Name    = "/aws/elasticloadbalancing/${var.project}-${var.environment}"
    Purpose = "ALB Access Logs"
  })
}

# ─── CloudWatch Dashboards ───────────────────────────────────────────────────

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project}-${var.environment}-overview"

  dashboard_body = jsonencode({
    widgets = [
      # ECS Service Metrics
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", { stat = "Average", label = "Blue CPU" }],
            ["...", { stat = "Average", label = "Green CPU" }],
            ["...", { stat = "Average", label = "Canary CPU" }]
          ]
          period = 60
          stat   = "Average"
          region = var.aws_region
          title  = "ECS CPU Utilization"
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ECS", "MemoryUtilization", { stat = "Average", label = "Blue Memory" }],
            ["...", { stat = "Average", label = "Green Memory" }],
            ["...", { stat = "Average", label = "Canary Memory" }]
          ]
          period = 60
          stat   = "Average"
          region = var.aws_region
          title  = "ECS Memory Utilization"
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      # ALB Metrics
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "Average", label = "Avg Latency" }],
            ["...", { stat = "p99", label = "P99 Latency" }]
          ]
          period = 60
          stat   = "Average"
          region = var.aws_region
          title  = "Response Time"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_2XX_Count", { stat = "Sum", label = "2XX" }],
            [".", "HTTPCode_Target_4XX_Count", { stat = "Sum", label = "4XX" }],
            [".", "HTTPCode_Target_5XX_Count", { stat = "Sum", label = "5XX" }]
          ]
          period = 60
          stat   = "Sum"
          region = var.aws_region
          title  = "HTTP Status Codes"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", { stat = "Sum", label = "Requests" }]
          ]
          period = 60
          stat   = "Sum"
          region = var.aws_region
          title  = "Request Count"
        }
      },
      # RDS Metrics
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", { stat = "Average", label = "DB CPU" }]
          ]
          period = 60
          stat   = "Average"
          region = var.aws_region
          title  = "RDS CPU Utilization"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "DatabaseConnections", { stat = "Average", label = "Connections" }]
          ]
          period = 60
          stat   = "Average"
          region = var.aws_region
          title  = "Database Connections"
        }
      },
      # Custom Application Metrics
      {
        type = "metric"
        properties = {
          metrics = [
            ["PetSwipe", "SwipeCount", { stat = "Sum", label = "Swipes" }],
            [".", "MatchCount", { stat = "Sum", label = "Matches" }]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Application Metrics"
        }
      }
    ]
  })
}

# ─── CloudWatch Alarms for Production Health ─────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_hosts" {
  alarm_name          = "${var.project}-${var.environment}-alb-unhealthy-hosts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Maximum"
  threshold           = "1"
  alarm_description   = "ALB has unhealthy targets"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "alb_high_latency" {
  alarm_name          = "${var.project}-${var.environment}-alb-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "2.0"  # 2 seconds
  alarm_description   = "ALB response time is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  alarm_name          = "${var.project}-${var.environment}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Sum"
  threshold           = "50"
  alarm_description   = "High rate of 5XX errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "${var.project}-${var.environment}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "RDS CPU utilization is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "rds_free_storage_low" {
  alarm_name          = "${var.project}-${var.environment}-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "10737418240"  # 10 GB
  alarm_description   = "RDS free storage space is low"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  alarm_name          = "${var.project}-${var.environment}-rds-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "60"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "RDS connection count is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }

  tags = local.common_tags
}

# ─── AWS X-Ray Tracing ───────────────────────────────────────────────────────

resource "aws_xray_sampling_rule" "main" {
  count = var.enable_xray_tracing ? 1 : 0

  rule_name      = "${var.project}-${var.environment}-sampling"
  priority       = 1000
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.05  # Sample 5% of requests
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"

  tags = local.common_tags
}

# ─── CloudWatch Insights Queries ─────────────────────────────────────────────

resource "aws_cloudwatch_query_definition" "error_logs" {
  name = "${var.project}-${var.environment}-error-logs"

  log_group_names = [
    aws_cloudwatch_log_group.ecs.name,
    aws_cloudwatch_log_group.application.name
  ]

  query_string = <<-QUERY
    fields @timestamp, @message
    | filter @message like /ERROR/
    | sort @timestamp desc
    | limit 100
  QUERY
}

resource "aws_cloudwatch_query_definition" "slow_queries" {
  name = "${var.project}-${var.environment}-slow-queries"

  log_group_names = [
    aws_cloudwatch_log_group.application.name
  ]

  query_string = <<-QUERY
    fields @timestamp, @message
    | filter @message like /duration/
    | parse @message /duration: (?<duration>\d+)/
    | filter duration > 1000
    | sort duration desc
    | limit 50
  QUERY
}

resource "aws_cloudwatch_query_definition" "request_patterns" {
  name = "${var.project}-${var.environment}-request-patterns"

  log_group_names = [
    aws_cloudwatch_log_group.alb.name
  ]

  query_string = <<-QUERY
    fields @timestamp, request_uri, status_code, response_time
    | stats count() by request_uri, status_code
    | sort count desc
    | limit 20
  QUERY
}

# ─── CloudWatch Composite Alarms ─────────────────────────────────────────────

resource "aws_cloudwatch_composite_alarm" "deployment_health" {
  alarm_name          = "${var.project}-${var.environment}-deployment-health"
  alarm_description   = "Composite alarm for overall deployment health"
  actions_enabled     = true
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  alarm_rule = join(" OR ", [
    "ALARM(${aws_cloudwatch_metric_alarm.alb_unhealthy_hosts.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.alb_high_latency.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.alb_5xx_errors.alarm_name})"
  ])

  tags = local.common_tags
}

# ─── CloudWatch Events for Automated Remediation ─────────────────────────────

resource "aws_cloudwatch_event_rule" "deployment_failure" {
  name        = "${var.project}-${var.environment}-deployment-failure"
  description = "Trigger on deployment failures"

  event_pattern = jsonencode({
    source      = ["aws.ecs"]
    detail-type = ["ECS Service Action"]
    detail = {
      eventType = ["SERVICE_DEPLOYMENT_FAILED"]
      clusterArn = [aws_ecs_cluster.cluster.arn]
    }
  })

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "deployment_failure_sns" {
  rule      = aws_cloudwatch_event_rule.deployment_failure.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.alerts.arn
}

# ─── Service-Level Indicators (SLIs) ────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "sli_availability" {
  alarm_name          = "${var.project}-${var.environment}-sli-availability"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  threshold           = "99.9"  # 99.9% availability SLO
  alarm_description   = "Service availability below SLO"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  metric_query {
    id          = "availability"
    expression  = "(requests - errors) / requests * 100"
    label       = "Availability %"
    return_data = true
  }

  metric_query {
    id = "requests"
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

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "sli_latency" {
  alarm_name          = "${var.project}-${var.environment}-sli-latency-p99"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "p99"
  threshold           = "1.5"  # 1.5 second P99 latency SLO
  alarm_description   = "P99 latency exceeds SLO"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = local.common_tags
}
