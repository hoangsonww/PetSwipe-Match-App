# ═══════════════════════════════════════════════════════════════════════════
# Feature Flags with AWS AppConfig
# Progressive rollout and runtime configuration management
# ═══════════════════════════════════════════════════════════════════════════

# ─── AppConfig Application ───────────────────────────────────────────────────

resource "aws_appconfig_application" "main" {
  name        = "${var.project}-${var.environment}"
  description = "Feature flags and configuration for ${var.project}"

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-appconfig"
  })
}

# ─── AppConfig Environment ───────────────────────────────────────────────────

resource "aws_appconfig_environment" "main" {
  name           = var.environment
  description    = "${var.environment} environment for ${var.project}"
  application_id = aws_appconfig_application.main.id

  monitor {
    alarm_arn      = aws_cloudwatch_metric_alarm.feature_flag_errors.arn
    alarm_role_arn = aws_iam_role.appconfig_monitor.arn
  }

  tags = local.common_tags
}

# ─── AppConfig Configuration Profile ─────────────────────────────────────────

resource "aws_appconfig_configuration_profile" "feature_flags" {
  application_id = aws_appconfig_application.main.id
  name           = "feature-flags"
  description    = "Feature flags configuration"
  location_uri   = "hosted"
  type           = "AWS.AppConfig.FeatureFlags"

  validator {
    type = "JSON_SCHEMA"
    content = jsonencode({
      "$schema" = "http://json-schema.org/draft-07/schema#"
      type      = "object"
      properties = {
        flags = {
          type = "object"
        }
        values = {
          type = "object"
        }
        version = {
          type = "string"
        }
      }
      required = ["flags", "values", "version"]
    })
  }

  tags = local.common_tags
}

# ─── Hosted Configuration Version ────────────────────────────────────────────

resource "aws_appconfig_hosted_configuration_version" "feature_flags" {
  application_id           = aws_appconfig_application.main.id
  configuration_profile_id = aws_appconfig_configuration_profile.feature_flags.configuration_profile_id
  content_type             = "application/json"

  content = jsonencode({
    version = "1.0"
    flags = {
      new_ui_enabled = {
        name        = "new_ui_enabled"
        description = "Enable new UI redesign"
        _deprecation = {
          status = "planned"
        }
      }
      advanced_matching = {
        name        = "advanced_matching"
        description = "Enable AI-powered matching algorithm"
      }
      premium_features = {
        name        = "premium_features"
        description = "Enable premium features"
      }
      dark_mode = {
        name        = "dark_mode"
        description = "Enable dark mode UI"
      }
      real_time_chat = {
        name        = "real_time_chat"
        description = "Enable real-time chat feature"
      }
      video_calls = {
        name        = "video_calls"
        description = "Enable video call feature"
      }
    }
    values = {
      new_ui_enabled = {
        enabled = var.environment == "production" ? false : true
        rules = [
          {
            segments = ["beta_users"]
            value    = true
          }
        ]
      }
      advanced_matching = {
        enabled = true
      }
      premium_features = {
        enabled = var.environment == "production" ? true : false
        rules = [
          {
            segments = ["premium_users"]
            value    = true
          }
        ]
      }
      dark_mode = {
        enabled = true
      }
      real_time_chat = {
        enabled = true
      }
      video_calls = {
        enabled = var.environment == "production" ? false : true
        rules = [
          {
            segments = ["beta_users"]
            value    = true
          }
        ]
      }
    }
  })

  description = "Initial feature flags configuration"
}

# ─── Deployment Strategy ─────────────────────────────────────────────────────

resource "aws_appconfig_deployment_strategy" "gradual_rollout" {
  name                           = "${var.project}-gradual-rollout"
  description                    = "Gradual rollout over 30 minutes with 20% traffic split"
  deployment_duration_in_minutes = 30
  growth_factor                  = 20
  replicate_to                   = "NONE"
  final_bake_time_in_minutes     = 10

  tags = local.common_tags
}

resource "aws_appconfig_deployment_strategy" "immediate" {
  name                           = "${var.project}-immediate"
  description                    = "Immediate deployment for urgent changes"
  deployment_duration_in_minutes = 0
  growth_factor                  = 100
  replicate_to                   = "NONE"
  final_bake_time_in_minutes     = 0

  tags = local.common_tags
}

resource "aws_appconfig_deployment_strategy" "canary" {
  name                           = "${var.project}-canary"
  description                    = "Canary deployment with 10% initial traffic"
  deployment_duration_in_minutes = 60
  growth_factor                  = 10
  replicate_to                   = "NONE"
  final_bake_time_in_minutes     = 15

  tags = local.common_tags
}

# ─── Deployment ──────────────────────────────────────────────────────────────

resource "aws_appconfig_deployment" "feature_flags" {
  application_id           = aws_appconfig_application.main.id
  environment_id           = aws_appconfig_environment.main.environment_id
  configuration_profile_id = aws_appconfig_configuration_profile.feature_flags.configuration_profile_id
  configuration_version    = aws_appconfig_hosted_configuration_version.feature_flags.version_number
  deployment_strategy_id   = aws_appconfig_deployment_strategy.gradual_rollout.id
  description              = "Deploy feature flags configuration"

  tags = local.common_tags
}

# ─── IAM Role for AppConfig Monitoring ───────────────────────────────────────

resource "aws_iam_role" "appconfig_monitor" {
  name = "${var.project}-${var.environment}-appconfig-monitor"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "appconfig.amazonaws.com"
      }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "appconfig_monitor" {
  name = "${var.project}-${var.environment}-appconfig-monitor-policy"
  role = aws_iam_role.appconfig_monitor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "cloudwatch:DescribeAlarms",
        "cloudwatch:GetMetricData"
      ]
      Resource = "*"
    }]
  })
}

# ─── CloudWatch Alarm for Feature Flag Errors ────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "feature_flag_errors" {
  alarm_name          = "${var.project}-${var.environment}-feature-flag-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "5XXErrors"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "Rollback feature flag deployment if errors spike"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = local.common_tags
}

# ─── Lambda for Feature Flag Analytics ───────────────────────────────────────

resource "aws_lambda_function" "feature_flag_analytics" {
  filename         = "${path.module}/../lambda/feature-flag-analytics.zip"
  function_name    = "${var.project}-${var.environment}-ff-analytics"
  role             = aws_iam_role.ff_analytics.arn
  handler          = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/../lambda/feature-flag-analytics.zip")
  runtime          = "nodejs18.x"
  timeout          = 60
  memory_size      = 256

  environment {
    variables = {
      APPCONFIG_APP_ID     = aws_appconfig_application.main.id
      APPCONFIG_ENV_ID     = aws_appconfig_environment.main.environment_id
      APPCONFIG_PROFILE_ID = aws_appconfig_configuration_profile.feature_flags.configuration_profile_id
      METRICS_NAMESPACE    = "PetSwipe/FeatureFlags"
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-ff-analytics"
  })
}

resource "aws_iam_role" "ff_analytics" {
  name = "${var.project}-${var.environment}-ff-analytics-role"

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

resource "aws_iam_role_policy" "ff_analytics" {
  name = "${var.project}-${var.environment}-ff-analytics-policy"
  role = aws_iam_role.ff_analytics.id

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
          "appconfig:GetLatestConfiguration",
          "appconfig:StartConfigurationSession"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      }
    ]
  })
}

# ─── EventBridge Rule for Feature Flag Analytics ─────────────────────────────

resource "aws_cloudwatch_event_rule" "ff_analytics" {
  name                = "${var.project}-${var.environment}-ff-analytics"
  description         = "Analyze feature flag usage"
  schedule_expression = "rate(5 minutes)"

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "ff_analytics" {
  rule      = aws_cloudwatch_event_rule.ff_analytics.name
  target_id = "FFAnalyticsLambda"
  arn       = aws_lambda_function.feature_flag_analytics.arn
}

resource "aws_lambda_permission" "ff_analytics" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.feature_flag_analytics.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.ff_analytics.arn
}

# ─── Outputs ─────────────────────────────────────────────────────────────────

output "appconfig_application_id" {
  description = "AppConfig application ID"
  value       = aws_appconfig_application.main.id
}

output "appconfig_environment_id" {
  description = "AppConfig environment ID"
  value       = aws_appconfig_environment.main.environment_id
}

output "feature_flags_profile_id" {
  description = "Feature flags configuration profile ID"
  value       = aws_appconfig_configuration_profile.feature_flags.configuration_profile_id
}
