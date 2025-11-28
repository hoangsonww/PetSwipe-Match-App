# ═══════════════════════════════════════════════════════════════════════════
# Advanced Auto-Scaling Policies
# Predictive Scaling, Target Tracking, Step Scaling, Scheduled Scaling
# ═══════════════════════════════════════════════════════════════════════════

# ─── Application Auto Scaling Target ─────────────────────────────────────────

resource "aws_appautoscaling_target" "ecs_service" {
  max_capacity       = var.ecs_max_capacity
  min_capacity       = var.ecs_min_capacity
  resource_id        = "service/${aws_ecs_cluster.cluster.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = local.common_tags
}

# ─── Target Tracking Scaling - CPU Based ────────────────────────────────────

resource "aws_appautoscaling_policy" "ecs_cpu_target_tracking" {
  name               = "${var.project}-${var.environment}-ecs-cpu-tracking"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# ─── Target Tracking Scaling - Memory Based ──────────────────────────────────

resource "aws_appautoscaling_policy" "ecs_memory_target_tracking" {
  name               = "${var.project}-${var.environment}-ecs-memory-tracking"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }

    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# ─── Target Tracking Scaling - ALB Request Count ─────────────────────────────

resource "aws_appautoscaling_policy" "ecs_alb_request_count" {
  name               = "${var.project}-${var.environment}-ecs-alb-requests"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.main.arn_suffix}"
    }

    target_value       = 1000.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# ─── Custom Metric Scaling - Application-Specific Metrics ────────────────────

resource "aws_appautoscaling_policy" "ecs_custom_metric" {
  name               = "${var.project}-${var.environment}-ecs-custom-metric"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace

  target_tracking_scaling_policy_configuration {
    customized_metric_specification {
      namespace  = "PetSwipe"
      metric_name = "ActiveUsers"
      statistic  = "Average"

      dimensions {
        name  = "Environment"
        value = var.environment
      }
    }

    target_value       = 500.0
    scale_in_cooldown  = 600
    scale_out_cooldown = 120
  }
}

# ─── Step Scaling Policy - Aggressive Scale Out ──────────────────────────────

resource "aws_appautoscaling_policy" "ecs_step_scaling_out" {
  name               = "${var.project}-${var.environment}-ecs-step-scale-out"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "PercentChangeInCapacity"
    cooldown                = 60
    metric_aggregation_type = "Average"

    step_adjustment {
      metric_interval_lower_bound = 0
      metric_interval_upper_bound = 10
      scaling_adjustment          = 10
    }

    step_adjustment {
      metric_interval_lower_bound = 10
      metric_interval_upper_bound = 20
      scaling_adjustment          = 20
    }

    step_adjustment {
      metric_interval_lower_bound = 20
      scaling_adjustment          = 30
    }
  }
}

# ─── Step Scaling Policy - Conservative Scale In ─────────────────────────────

resource "aws_appautoscaling_policy" "ecs_step_scaling_in" {
  name               = "${var.project}-${var.environment}-ecs-step-scale-in"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "PercentChangeInCapacity"
    cooldown                = 300
    metric_aggregation_type = "Average"

    step_adjustment {
      metric_interval_upper_bound = 0
      scaling_adjustment          = -10
    }
  }
}

# ─── CloudWatch Alarms for Step Scaling ──────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high_step" {
  alarm_name          = "${var.project}-${var.environment}-ecs-cpu-high-step"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "60"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "Trigger step scaling when CPU exceeds 85%"
  alarm_actions       = [aws_appautoscaling_policy.ecs_step_scaling_out.arn]

  dimensions = {
    ServiceName = aws_ecs_service.backend.name
    ClusterName = aws_ecs_cluster.cluster.name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "ecs_cpu_low_step" {
  alarm_name          = "${var.project}-${var.environment}-ecs-cpu-low-step"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "5"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "30"
  alarm_description   = "Trigger step scaling when CPU below 30%"
  alarm_actions       = [aws_appautoscaling_policy.ecs_step_scaling_in.arn]

  dimensions = {
    ServiceName = aws_ecs_service.backend.name
    ClusterName = aws_ecs_cluster.cluster.name
  }

  tags = local.common_tags
}

# ─── Scheduled Scaling - Business Hours ──────────────────────────────────────

resource "aws_appautoscaling_scheduled_action" "scale_up_morning" {
  name               = "${var.project}-${var.environment}-scale-up-morning"
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  schedule           = "cron(0 8 * * MON-FRI *)"  # 8 AM weekdays UTC
  timezone           = "America/New_York"

  scalable_target_action {
    min_capacity = var.ecs_business_hours_min
    max_capacity = var.ecs_business_hours_max
  }
}

resource "aws_appautoscaling_scheduled_action" "scale_down_evening" {
  name               = "${var.project}-${var.environment}-scale-down-evening"
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  schedule           = "cron(0 20 * * MON-FRI *)"  # 8 PM weekdays UTC
  timezone           = "America/New_York"

  scalable_target_action {
    min_capacity = var.ecs_min_capacity
    max_capacity = var.ecs_max_capacity
  }
}

# ─── Scheduled Scaling - Weekend Capacity ────────────────────────────────────

resource "aws_appautoscaling_scheduled_action" "scale_down_weekend" {
  name               = "${var.project}-${var.environment}-scale-down-weekend"
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  schedule           = "cron(0 0 * * SAT *)"  # Midnight Saturday UTC
  timezone           = "America/New_York"

  scalable_target_action {
    min_capacity = 1
    max_capacity = 3
  }
}

resource "aws_appautoscaling_scheduled_action" "scale_up_monday" {
  name               = "${var.project}-${var.environment}-scale-up-monday"
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  schedule           = "cron(0 8 * * MON *)"  # 8 AM Monday UTC
  timezone           = "America/New_York"

  scalable_target_action {
    min_capacity = var.ecs_business_hours_min
    max_capacity = var.ecs_business_hours_max
  }
}

# ─── Predictive Scaling (via Lambda and ML) ──────────────────────────────────

# Lambda function to analyze historical metrics and predict future load
resource "aws_lambda_function" "predictive_scaling" {
  filename         = "${path.module}/../lambda/predictive-scaling.zip"
  function_name    = "${var.project}-${var.environment}-predictive-scaling"
  role             = aws_iam_role.predictive_scaling_lambda.arn
  handler          = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/../lambda/predictive-scaling.zip")
  runtime          = "python3.11"
  timeout          = 300
  memory_size      = 512

  environment {
    variables = {
      SERVICE_NAMESPACE  = "ecs"
      RESOURCE_ID        = aws_appautoscaling_target.ecs_service.resource_id
      SCALABLE_DIMENSION = "ecs:service:DesiredCount"
      METRIC_NAMESPACE   = "AWS/ECS"
      CLUSTER_NAME       = aws_ecs_cluster.cluster.name
      SERVICE_NAME       = aws_ecs_service.backend.name
      ENVIRONMENT        = var.environment
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-predictive-scaling"
  })
}

resource "aws_iam_role" "predictive_scaling_lambda" {
  name = "${var.project}-${var.environment}-predictive-scaling-role"

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

resource "aws_iam_role_policy" "predictive_scaling_lambda" {
  name = "${var.project}-${var.environment}-predictive-scaling-policy"
  role = aws_iam_role.predictive_scaling_lambda.id

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
          "cloudwatch:ListMetrics"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "application-autoscaling:DescribeScalingActivities",
          "application-autoscaling:DescribeScalingPolicies",
          "application-autoscaling:DescribeScalableTargets",
          "application-autoscaling:PutScalingPolicy"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices",
          "ecs:UpdateService"
        ]
        Resource = "*"
      }
    ]
  })
}

# EventBridge rule to run predictive scaling every 15 minutes
resource "aws_cloudwatch_event_rule" "predictive_scaling" {
  name                = "${var.project}-${var.environment}-predictive-scaling"
  description         = "Trigger predictive scaling analysis"
  schedule_expression = "rate(15 minutes)"

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "predictive_scaling" {
  rule      = aws_cloudwatch_event_rule.predictive_scaling.name
  target_id = "PredictiveScalingLambda"
  arn       = aws_lambda_function.predictive_scaling.arn
}

resource "aws_lambda_permission" "predictive_scaling" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.predictive_scaling.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.predictive_scaling.arn
}

# ─── RDS Auto Scaling ────────────────────────────────────────────────────────

resource "aws_appautoscaling_target" "rds_replica" {
  count = var.environment == "production" ? 1 : 0

  max_capacity       = var.rds_max_read_replicas
  min_capacity       = 1
  resource_id        = "cluster:${aws_rds_cluster.main[0].cluster_identifier}"
  scalable_dimension = "rds:cluster:ReadReplicaCount"
  service_namespace  = "rds"

  tags = local.common_tags
}

resource "aws_appautoscaling_policy" "rds_cpu_tracking" {
  count = var.environment == "production" ? 1 : 0

  name               = "${var.project}-${var.environment}-rds-cpu-tracking"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.rds_replica[0].resource_id
  scalable_dimension = aws_appautoscaling_target.rds_replica[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.rds_replica[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "RDSReaderAverageCPUUtilization"
    }

    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# ─── DynamoDB Auto Scaling (if using DynamoDB) ───────────────────────────────

resource "aws_appautoscaling_target" "dynamodb_read" {
  count = var.enable_dynamodb ? 1 : 0

  max_capacity       = var.dynamodb_read_max_capacity
  min_capacity       = var.dynamodb_read_min_capacity
  resource_id        = "table/${aws_dynamodb_table.main[0].name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"

  tags = local.common_tags
}

resource "aws_appautoscaling_policy" "dynamodb_read" {
  count = var.enable_dynamodb ? 1 : 0

  name               = "${var.project}-${var.environment}-dynamodb-read-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.dynamodb_read[0].resource_id
  scalable_dimension = aws_appautoscaling_target.dynamodb_read[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.dynamodb_read[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }

    target_value = 70.0
  }
}

# ─── Outputs ─────────────────────────────────────────────────────────────────

output "autoscaling_target_id" {
  description = "ECS autoscaling target ID"
  value       = aws_appautoscaling_target.ecs_service.id
}

output "predictive_scaling_lambda_arn" {
  description = "Predictive scaling Lambda ARN"
  value       = aws_lambda_function.predictive_scaling.arn
}
