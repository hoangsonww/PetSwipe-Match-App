# ═══════════════════════════════════════════════════════════════════════════
# Datadog Integration — Monitors, SLOs, Dashboard, Synthetics, Log Forwarding
# ═══════════════════════════════════════════════════════════════════════════
#
# OPERATOR NOTES:
#   1. The datadog provider must be configured in provider.tf.
#      Add to the required_providers block there — see the comment we added.
#   2. Gate: ALL resources use  count = var.enable_datadog ? 1 : 0
#   3. Supply datadog_api_key and datadog_app_key via tfvars or TF_VAR_ env vars.
#   4. The Datadog Forwarder Lambda is deployed via the official AWS
#      CloudFormation template — it is NOT a custom Lambda zip.
#
# ═══════════════════════════════════════════════════════════════════════════

# ─── Locals ───────────────────────────────────────────────────────────────────

locals {
  datadog_tags = [
    "env:${var.environment}",
    "project:${var.project}",
    "service:petswipe",
    "managed-by:terraform"
  ]

  datadog_aws_account_id = var.datadog_aws_account_id != "" ? var.datadog_aws_account_id : data.aws_caller_identity.current.account_id

  # Build PagerDuty mention string only when PagerDuty is also enabled
  dd_pagerduty_mention = var.enable_pagerduty ? " @pagerduty-${var.project}" : ""

  dd_monitor_message_suffix = <<-EOT
    {{#is_alert}}ALERT: {{event.title}}{{/is_alert}}
    {{#is_warning}}WARNING: {{event.title}}{{/is_warning}}
    {{#is_recovery}}RECOVERED: {{event.title}}{{/is_recovery}}
    Runbook: https://github.com/hoangsonww/PetSwipe-Match-App/wiki/runbooks
    ${local.dd_pagerduty_mention}
  EOT
}

# ═══════════════════════════════════════════════════════════════════════════
# Datadog ↔ AWS Integration
# ═══════════════════════════════════════════════════════════════════════════

resource "datadog_integration_aws" "main" {
  count = var.enable_datadog ? 1 : 0

  account_id = local.datadog_aws_account_id
  role_name  = var.datadog_aws_role_name

  host_tags = local.datadog_tags

  account_specific_namespace_rules = {
    "AWS/ECS"              = true
    "AWS/ApplicationELB"   = true
    "AWS/RDS"              = true
    "AWS/ElastiCache"      = true
    "AWS/S3"               = true
    "AWS/CloudFront"       = true
    "AWS/Lambda"           = true
    "AWS/SQS"              = true
  }

  excluded_regions = [
    "us-west-1",
    "eu-west-1",
    "ap-southeast-1"
  ]
}

# ═══════════════════════════════════════════════════════════════════════════
# Datadog Log Forwarder Lambda (Official CloudFormation Template)
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_cloudformation_stack" "datadog_forwarder" {
  count = var.enable_datadog ? 1 : 0

  name = "${var.project}-${var.environment}-datadog-forwarder"

  template_url = "https://datadog-cloudformation-template.s3.amazonaws.com/aws/forwarder/latest.yaml"

  parameters = {
    DdApiKey      = var.datadog_api_key
    DdSite        = var.datadog_site
    FunctionName  = "${var.project}-${var.environment}-datadog-forwarder"
  }

  capabilities = ["CAPABILITY_IAM", "CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]

  tags = merge(local.common_tags, {
    Name    = "${var.project}-${var.environment}-datadog-forwarder"
    Purpose = "Datadog Log Forwarding"
  })
}

# ═══════════════════════════════════════════════════════════════════════════
# Log Subscription Filters → Datadog Forwarder
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_lambda_permission" "datadog_forwarder_ecs" {
  count = var.enable_datadog ? 1 : 0

  statement_id  = "AllowCloudWatchLogsECS"
  action        = "lambda:InvokeFunction"
  function_name = aws_cloudformation_stack.datadog_forwarder[0].outputs["DatadogForwarderArn"]
  principal     = "logs.${var.aws_region}.amazonaws.com"
  source_arn    = "${aws_cloudwatch_log_group.ecs.arn}:*"
}

resource "aws_cloudwatch_log_subscription_filter" "datadog_ecs" {
  count = var.enable_datadog ? 1 : 0

  name            = "${var.project}-${var.environment}-datadog-ecs-logs"
  log_group_name  = aws_cloudwatch_log_group.ecs.name
  filter_pattern  = ""
  destination_arn = aws_cloudformation_stack.datadog_forwarder[0].outputs["DatadogForwarderArn"]

  depends_on = [aws_lambda_permission.datadog_forwarder_ecs]
}

resource "aws_lambda_permission" "datadog_forwarder_app" {
  count = var.enable_datadog ? 1 : 0

  statement_id  = "AllowCloudWatchLogsApp"
  action        = "lambda:InvokeFunction"
  function_name = aws_cloudformation_stack.datadog_forwarder[0].outputs["DatadogForwarderArn"]
  principal     = "logs.${var.aws_region}.amazonaws.com"
  source_arn    = "${aws_cloudwatch_log_group.application.arn}:*"
}

resource "aws_cloudwatch_log_subscription_filter" "datadog_application" {
  count = var.enable_datadog ? 1 : 0

  name            = "${var.project}-${var.environment}-datadog-app-logs"
  log_group_name  = aws_cloudwatch_log_group.application.name
  filter_pattern  = ""
  destination_arn = aws_cloudformation_stack.datadog_forwarder[0].outputs["DatadogForwarderArn"]

  depends_on = [aws_lambda_permission.datadog_forwarder_app]
}

resource "aws_lambda_permission" "datadog_forwarder_alb" {
  count = var.enable_datadog ? 1 : 0

  statement_id  = "AllowCloudWatchLogsALB"
  action        = "lambda:InvokeFunction"
  function_name = aws_cloudformation_stack.datadog_forwarder[0].outputs["DatadogForwarderArn"]
  principal     = "logs.${var.aws_region}.amazonaws.com"
  source_arn    = "${aws_cloudwatch_log_group.alb.arn}:*"
}

resource "aws_cloudwatch_log_subscription_filter" "datadog_alb" {
  count = var.enable_datadog ? 1 : 0

  name            = "${var.project}-${var.environment}-datadog-alb-logs"
  log_group_name  = aws_cloudwatch_log_group.alb.name
  filter_pattern  = ""
  destination_arn = aws_cloudformation_stack.datadog_forwarder[0].outputs["DatadogForwarderArn"]

  depends_on = [aws_lambda_permission.datadog_forwarder_alb]
}

# ═══════════════════════════════════════════════════════════════════════════
# Datadog Monitors
# ═══════════════════════════════════════════════════════════════════════════

# --- Composite: Service Health ---
resource "datadog_monitor" "service_health" {
  count = var.enable_datadog ? 1 : 0

  name    = "[${var.project}] ${var.environment} — Service Health Composite"
  type    = "composite"
  query   = "${datadog_monitor.high_error_rate[0].id} || ${datadog_monitor.high_latency_p99[0].id} || ${datadog_monitor.cpu_high[0].id}"
  message = <<-EOT
    ## Service Health Degraded — ${var.project} (${var.environment})
    One or more golden-signal monitors are in ALERT state.
    ${local.dd_monitor_message_suffix}
  EOT

  tags = local.datadog_tags

  notify_no_data = false  # composite monitors rely on sub-monitors
  renotify_interval = 60
}

# --- 5XX Error Rate > 1% for 5 min ---
resource "datadog_monitor" "high_error_rate" {
  count = var.enable_datadog ? 1 : 0

  name    = "[${var.project}] ${var.environment} — High 5XX Error Rate"
  type    = "query alert"
  query   = "sum(last_5m):sum:aws.applicationelb.httpcode_target_5xx{project:${var.project},env:${var.environment}}.as_count() / sum:aws.applicationelb.request_count{project:${var.project},env:${var.environment}}.as_count() * 100 > 1"
  message = <<-EOT
    ## 5XX Error Rate Above 1%
    The target 5XX error rate has exceeded 1% over the last 5 minutes.
    Current value: {{value}}%
    ${local.dd_monitor_message_suffix}
  EOT

  monitor_thresholds {
    critical = 1
    warning  = 0.5
  }

  notify_no_data    = true
  no_data_timeframe = 10
  renotify_interval = 30
  tags              = local.datadog_tags
}

# --- P99 Latency > 1.5s for 5 min ---
resource "datadog_monitor" "high_latency_p99" {
  count = var.enable_datadog ? 1 : 0

  name    = "[${var.project}] ${var.environment} — High P99 Latency"
  type    = "query alert"
  query   = "avg(last_5m):p99:aws.applicationelb.target_response_time{project:${var.project},env:${var.environment}} > 1.5"
  message = <<-EOT
    ## P99 Latency Exceeds 1.5s
    The ALB target response time P99 has been above 1.5 seconds for the last 5 minutes.
    Current P99: {{value}}s
    ${local.dd_monitor_message_suffix}
  EOT

  monitor_thresholds {
    critical = 1.5
    warning  = 1.0
  }

  notify_no_data    = true
  no_data_timeframe = 10
  renotify_interval = 30
  tags              = local.datadog_tags
}

# --- ECS CPU > 80% for 10 min ---
resource "datadog_monitor" "cpu_high" {
  count = var.enable_datadog ? 1 : 0

  name    = "[${var.project}] ${var.environment} — ECS CPU High"
  type    = "query alert"
  query   = "avg(last_10m):avg:aws.ecs.cpuutilization{project:${var.project},env:${var.environment}} > 80"
  message = <<-EOT
    ## ECS CPU Utilization Above 80%
    Average CPU utilization has exceeded 80% for the last 10 minutes.
    Current value: {{value}}%
    Consider scaling up ECS tasks or optimizing application performance.
    ${local.dd_monitor_message_suffix}
  EOT

  monitor_thresholds {
    critical = 80
    warning  = 70
  }

  notify_no_data    = true
  no_data_timeframe = 20
  renotify_interval = 60
  tags              = local.datadog_tags
}

# --- ECS Memory > 85% for 10 min ---
resource "datadog_monitor" "memory_high" {
  count = var.enable_datadog ? 1 : 0

  name    = "[${var.project}] ${var.environment} — ECS Memory High"
  type    = "query alert"
  query   = "avg(last_10m):avg:aws.ecs.memory_utilization{project:${var.project},env:${var.environment}} > 85"
  message = <<-EOT
    ## ECS Memory Utilization Above 85%
    Average memory utilization has exceeded 85% for the last 10 minutes.
    Current value: {{value}}%
    Check for memory leaks or increase task memory allocation.
    ${local.dd_monitor_message_suffix}
  EOT

  monitor_thresholds {
    critical = 85
    warning  = 75
  }

  notify_no_data    = true
  no_data_timeframe = 20
  renotify_interval = 60
  tags              = local.datadog_tags
}

# --- RDS CPU > 80% for 10 min ---
resource "datadog_monitor" "rds_cpu_high" {
  count = var.enable_datadog ? 1 : 0

  name    = "[${var.project}] ${var.environment} — RDS CPU High"
  type    = "query alert"
  query   = "avg(last_10m):avg:aws.rds.cpuutilization{project:${var.project},env:${var.environment}} > 80"
  message = <<-EOT
    ## RDS CPU Utilization Above 80%
    Database CPU has exceeded 80% for the last 10 minutes.
    Current value: {{value}}%
    Review slow queries and consider read replica scale-out.
    ${local.dd_monitor_message_suffix}
  EOT

  monitor_thresholds {
    critical = 80
    warning  = 70
  }

  notify_no_data    = true
  no_data_timeframe = 20
  renotify_interval = 60
  tags              = local.datadog_tags
}

# --- RDS Connections > 80 for 5 min ---
resource "datadog_monitor" "rds_connections_high" {
  count = var.enable_datadog ? 1 : 0

  name    = "[${var.project}] ${var.environment} — RDS Connections High"
  type    = "query alert"
  query   = "avg(last_5m):avg:aws.rds.database_connections{project:${var.project},env:${var.environment}} > 80"
  message = <<-EOT
    ## RDS Connection Count Above 80
    The database connection count has exceeded 80 for the last 5 minutes.
    Current value: {{value}}
    Check for connection leaks; consider connection pooling (PgBouncer).
    ${local.dd_monitor_message_suffix}
  EOT

  monitor_thresholds {
    critical = 80
    warning  = 60
  }

  notify_no_data    = true
  no_data_timeframe = 10
  renotify_interval = 30
  tags              = local.datadog_tags
}

# --- RDS Free Storage < 10 GB ---
resource "datadog_monitor" "rds_storage_low" {
  count = var.enable_datadog ? 1 : 0

  name    = "[${var.project}] ${var.environment} — RDS Free Storage Low"
  type    = "query alert"
  query   = "avg(last_15m):avg:aws.rds.free_storage_space{project:${var.project},env:${var.environment}} < 10737418240"
  message = <<-EOT
    ## RDS Free Storage Below 10 GB
    Free storage space has dropped below 10 GB.
    Current value: {{value}} bytes
    Extend allocated storage or purge old data immediately.
    ${local.dd_monitor_message_suffix}
  EOT

  monitor_thresholds {
    critical = 10737418240   # 10 GB in bytes
    warning  = 21474836480   # 20 GB in bytes
  }

  notify_no_data    = true
  no_data_timeframe = 30
  renotify_interval = 60
  tags              = local.datadog_tags
}

# --- APM Service Error Rate > 5% ---
resource "datadog_monitor" "apm_error_rate" {
  count = var.enable_datadog ? 1 : 0

  name    = "[${var.project}] ${var.environment} — APM Error Rate High"
  type    = "query alert"
  query   = "sum(last_5m):sum:trace.express.request.errors{env:${var.environment},service:${var.project}-backend}.as_count() / sum:trace.express.request.hits{env:${var.environment},service:${var.project}-backend}.as_count() * 100 > 5"
  message = <<-EOT
    ## APM Service Error Rate Above 5%
    The backend APM traced error rate has exceeded 5% over the last 5 minutes.
    Current value: {{value}}%
    Investigate recent deployments and error traces in APM.
    ${local.dd_monitor_message_suffix}
  EOT

  monitor_thresholds {
    critical = 5
    warning  = 2
  }

  notify_no_data    = true
  no_data_timeframe = 10
  renotify_interval = 30
  tags              = local.datadog_tags
}

# --- APM P99 Latency > 2s ---
resource "datadog_monitor" "apm_latency_p99" {
  count = var.enable_datadog ? 1 : 0

  name    = "[${var.project}] ${var.environment} — APM P99 Latency High"
  type    = "query alert"
  query   = "avg(last_5m):p99:trace.express.request{env:${var.environment},service:${var.project}-backend} > 2"
  message = <<-EOT
    ## APM P99 Latency Exceeds 2s
    The backend APM P99 latency has been above 2 seconds for the last 5 minutes.
    Current P99: {{value}}s
    Check APM flame graphs for bottleneck spans.
    ${local.dd_monitor_message_suffix}
  EOT

  monitor_thresholds {
    critical = 2
    warning  = 1.5
  }

  notify_no_data    = true
  no_data_timeframe = 10
  renotify_interval = 30
  tags              = local.datadog_tags
}

# --- Log Error Spike (Anomaly Detection) ---
resource "datadog_monitor" "log_error_spike" {
  count = var.enable_datadog ? 1 : 0

  name    = "[${var.project}] ${var.environment} — Log Error Volume Anomaly"
  type    = "query alert"
  query   = "avg(last_1h):anomalies(sum:logs.error{project:${var.project},env:${var.environment}}.as_count(), 'agile', 3, direction='above', interval=300, alert_window='last_30m', count_default_zero='true') >= 1"
  message = <<-EOT
    ## Anomalous Error Log Volume Detected
    Error log volume has spiked above the expected baseline.
    Investigate application logs for new error patterns.
    ${local.dd_monitor_message_suffix}
  EOT

  monitor_thresholds {
    critical = 1
  }

  notify_no_data    = false  # anomaly monitors handle gaps differently
  renotify_interval = 60
  tags              = local.datadog_tags
}

# ═══════════════════════════════════════════════════════════════════════════
# Datadog SLOs
# ═══════════════════════════════════════════════════════════════════════════

resource "datadog_service_level_objective" "availability" {
  count = var.enable_datadog ? 1 : 0

  name = "${var.project} ${var.environment} — Availability SLO (99.9%)"
  type = "monitor"

  monitor_ids = [
    datadog_monitor.high_error_rate[0].id,
    datadog_monitor.service_health[0].id
  ]

  thresholds {
    timeframe = "30d"
    target    = 99.9
    warning   = 99.95
  }

  thresholds {
    timeframe = "7d"
    target    = 99.9
    warning   = 99.95
  }

  tags = local.datadog_tags

  description = "Service availability must remain above 99.9% measured over rolling 30-day and 7-day windows. Breaches consume error budget and may trigger deployment freezes."
}

resource "datadog_service_level_objective" "latency" {
  count = var.enable_datadog ? 1 : 0

  name = "${var.project} ${var.environment} — P99 Latency SLO"
  type = "metric"

  query {
    numerator   = "sum:aws.applicationelb.request_count{project:${var.project},env:${var.environment},target_response_time:<1.5}.as_count()"
    denominator = "sum:aws.applicationelb.request_count{project:${var.project},env:${var.environment}}.as_count()"
  }

  thresholds {
    timeframe = "30d"
    target    = 99.0
    warning   = 99.5
  }

  thresholds {
    timeframe = "7d"
    target    = 99.0
    warning   = 99.5
  }

  tags = local.datadog_tags

  description = "99% of requests must complete within 1.5 seconds (P99). Measured over 30-day and 7-day rolling windows."
}

# ═══════════════════════════════════════════════════════════════════════════
# Datadog Dashboard — Golden Signals + Business + Infra + APM + Logs + SLO
# ═══════════════════════════════════════════════════════════════════════════

resource "datadog_dashboard" "overview" {
  count = var.enable_datadog ? 1 : 0

  title       = "${var.project} ${var.environment} — Overview Dashboard"
  description = "Golden signals, business metrics, infrastructure health, APM service map, log analytics, and SLO tracking for ${var.project}."
  layout_type = "ordered"

  tags = local.datadog_tags

  # ─── Golden Signals: Latency ────────────────────────────────────────────
  widget {
    group_definition {
      title       = "Golden Signals"
      layout_type = "ordered"

      widget {
        timeseries_definition {
          title = "Response Time (P50 / P95 / P99)"
          request {
            q            = "avg:aws.applicationelb.target_response_time.p50{project:${var.project},env:${var.environment}}"
            display_type = "line"
            style {
              palette = "cool"
            }
          }
          request {
            q            = "avg:aws.applicationelb.target_response_time.p95{project:${var.project},env:${var.environment}}"
            display_type = "line"
            style {
              palette = "warm"
            }
          }
          request {
            q            = "avg:aws.applicationelb.target_response_time.p99{project:${var.project},env:${var.environment}}"
            display_type = "line"
            style {
              palette = "orange"
            }
          }
          yaxis {
            min = "0"
          }
          marker {
            value        = "y = 1.5"
            display_type = "error dashed"
            label        = "SLO: 1.5s"
          }
        }
      }

      # ─── Golden Signals: Traffic ──────────────────────────────────────────
      widget {
        timeseries_definition {
          title = "Request Rate"
          request {
            q            = "sum:aws.applicationelb.request_count{project:${var.project},env:${var.environment}}.as_count()"
            display_type = "bars"
            style {
              palette = "dog_classic"
            }
          }
        }
      }

      # ─── Golden Signals: Errors ───────────────────────────────────────────
      widget {
        timeseries_definition {
          title = "HTTP Status Codes"
          request {
            q            = "sum:aws.applicationelb.httpcode_target_2xx{project:${var.project},env:${var.environment}}.as_count()"
            display_type = "bars"
            style {
              palette = "green"
            }
          }
          request {
            q            = "sum:aws.applicationelb.httpcode_target_4xx{project:${var.project},env:${var.environment}}.as_count()"
            display_type = "bars"
            style {
              palette = "yellow"
            }
          }
          request {
            q            = "sum:aws.applicationelb.httpcode_target_5xx{project:${var.project},env:${var.environment}}.as_count()"
            display_type = "bars"
            style {
              palette = "red"
            }
          }
        }
      }

      # ─── Golden Signals: Saturation ───────────────────────────────────────
      widget {
        timeseries_definition {
          title = "ECS Saturation (CPU + Memory)"
          request {
            q            = "avg:aws.ecs.cpuutilization{project:${var.project},env:${var.environment}}"
            display_type = "line"
            style {
              palette = "orange"
            }
          }
          request {
            q            = "avg:aws.ecs.memory_utilization{project:${var.project},env:${var.environment}}"
            display_type = "line"
            style {
              palette = "purple"
            }
          }
          yaxis {
            min = "0"
            max = "100"
          }
          marker {
            value        = "y = 80"
            display_type = "warning dashed"
            label        = "Warning: 80%"
          }
        }
      }
    }
  }

  # ─── Business Metrics ─────────────────────────────────────────────────────
  widget {
    group_definition {
      title       = "Business Metrics"
      layout_type = "ordered"

      widget {
        timeseries_definition {
          title = "Swipes & Matches"
          request {
            q            = "sum:petswipe.business.swipe_count{env:${var.environment}}.as_count()"
            display_type = "bars"
            style {
              palette = "cool"
            }
          }
          request {
            q            = "sum:petswipe.business.match_count{env:${var.environment}}.as_count()"
            display_type = "bars"
            style {
              palette = "warm"
            }
          }
        }
      }

      widget {
        query_value_definition {
          title = "Total Swipes (24h)"
          request {
            q          = "sum:petswipe.business.swipe_count{env:${var.environment}}.as_count()"
            aggregator = "sum"
          }
          precision = 0
        }
      }

      widget {
        query_value_definition {
          title = "Total Matches (24h)"
          request {
            q          = "sum:petswipe.business.match_count{env:${var.environment}}.as_count()"
            aggregator = "sum"
          }
          precision = 0
        }
      }
    }
  }

  # ─── Infrastructure: ECS, RDS, ALB ────────────────────────────────────────
  widget {
    group_definition {
      title       = "Infrastructure"
      layout_type = "ordered"

      widget {
        timeseries_definition {
          title = "ECS Running Task Count"
          request {
            q            = "avg:aws.ecs.service.running{project:${var.project},env:${var.environment}}"
            display_type = "line"
          }
        }
      }

      widget {
        timeseries_definition {
          title = "RDS CPU & Connections"
          request {
            q            = "avg:aws.rds.cpuutilization{project:${var.project},env:${var.environment}}"
            display_type = "line"
            style {
              palette = "orange"
            }
          }
          request {
            q            = "avg:aws.rds.database_connections{project:${var.project},env:${var.environment}}"
            display_type = "line"
            style {
              palette = "blue"
            }
          }
        }
      }

      widget {
        timeseries_definition {
          title = "RDS Free Storage Space"
          request {
            q            = "avg:aws.rds.free_storage_space{project:${var.project},env:${var.environment}}"
            display_type = "area"
            style {
              palette = "green"
            }
          }
          marker {
            value        = "y = 10737418240"
            display_type = "error dashed"
            label        = "Critical: 10 GB"
          }
        }
      }

      widget {
        timeseries_definition {
          title = "ALB Active Connections"
          request {
            q            = "sum:aws.applicationelb.active_connection_count{project:${var.project},env:${var.environment}}"
            display_type = "line"
          }
        }
      }
    }
  }

  # ─── APM Service Map ──────────────────────────────────────────────────────
  widget {
    service_map_definition {
      title   = "APM Service Map"
      service = "${var.project}-backend"
      filters = ["env:${var.environment}"]
    }
  }

  # ─── Log Analytics ────────────────────────────────────────────────────────
  widget {
    log_stream_definition {
      title   = "Recent Error Logs"
      logset  = ""
      query   = "status:error project:${var.project} env:${var.environment}"
      columns = ["host", "service", "status", "message"]
      sort {
        column = "time"
        order  = "desc"
      }
      message_display = "expanded-lg"
    }
  }

  # ─── SLO Widget ───────────────────────────────────────────────────────────
  widget {
    slo_definition {
      title             = "Availability SLO (99.9%)"
      slo_id            = datadog_service_level_objective.availability[0].id
      show_error_budget = true
      view_type         = "detail"
      time_windows      = ["7d", "30d"]
    }
  }

  widget {
    slo_definition {
      title             = "Latency SLO (P99 < 1.5s)"
      slo_id            = datadog_service_level_objective.latency[0].id
      show_error_budget = true
      view_type         = "detail"
      time_windows      = ["7d", "30d"]
    }
  }
}

# ═══════════════════════════════════════════════════════════════════════════
# Datadog Synthetics
# ═══════════════════════════════════════════════════════════════════════════

resource "datadog_synthetics_test" "api_health" {
  count = var.enable_datadog ? 1 : 0

  name      = "${var.project} ${var.environment} — /health endpoint"
  type      = "api"
  subtype   = "http"
  status    = "live"
  message   = <<-EOT
    ## Synthetic /health Check Failed
    The health endpoint is not returning 200 OK.
    ${local.dd_monitor_message_suffix}
  EOT
  locations = ["aws:us-east-1", "aws:us-west-2", "aws:eu-west-1"]
  tags      = local.datadog_tags

  request_definition {
    method = "GET"
    url    = "https://${aws_lb.main.dns_name}/health"
  }

  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }

  assertion {
    type     = "responseTime"
    operator = "lessThan"
    target   = "2000"
  }

  assertion {
    type     = "body"
    operator = "contains"
    target   = "ok"
  }

  options_list {
    tick_every          = 300  # Run every 5 minutes
    min_location_failed = 2
    retry {
      count    = 2
      interval = 500
    }
    monitor_options {
      renotify_interval = 120
    }
  }
}

resource "datadog_synthetics_test" "api_ready" {
  count = var.enable_datadog ? 1 : 0

  name      = "${var.project} ${var.environment} — /ready endpoint"
  type      = "api"
  subtype   = "http"
  status    = "live"
  message   = <<-EOT
    ## Synthetic /ready Check Failed
    The readiness endpoint indicates the service is not ready to accept traffic.
    ${local.dd_monitor_message_suffix}
  EOT
  locations = ["aws:us-east-1", "aws:us-west-2"]
  tags      = local.datadog_tags

  request_definition {
    method = "GET"
    url    = "https://${aws_lb.main.dns_name}/ready"
  }

  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }

  assertion {
    type     = "responseTime"
    operator = "lessThan"
    target   = "3000"
  }

  options_list {
    tick_every          = 300
    min_location_failed = 1
    retry {
      count    = 1
      interval = 1000
    }
    monitor_options {
      renotify_interval = 120
    }
  }
}

# ═══════════════════════════════════════════════════════════════════════════
# Datadog Downtime (Weekly Maintenance Window)
# ═══════════════════════════════════════════════════════════════════════════

resource "datadog_downtime" "maintenance_window" {
  count = var.enable_datadog ? 1 : 0

  scope = ["env:${var.environment}", "project:${var.project}"]

  message = "Scheduled weekly maintenance window for ${var.project} (${var.environment}). Monitors are muted during this period."

  recurrence {
    type        = "weeks"
    period      = 1
    week_days   = ["Sun"]
  }

  # Sunday 04:00 – 05:00 UTC (matches RDS maintenance window)
  start = "1735534800"   # placeholder epoch; recurrence drives ongoing schedule
  end   = "1735538400"   # one hour later

  monitor_tags = ["project:${var.project}", "env:${var.environment}"]
}
