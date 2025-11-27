# ═══════════════════════════════════════════════════════════════════════════
# Canary Deployment Configuration for ECS
# Enables gradual traffic shifting with automated rollback on errors
# ═══════════════════════════════════════════════════════════════════════════

locals {
  canary_service_name = "${var.project}-${var.environment}-canary"
  canary_tg_name      = "${var.project}-${var.environment}-canary-tg"
}

# ─── Canary Target Group ─────────────────────────────────────────────────────

resource "aws_lb_target_group" "canary" {
  name        = local.canary_tg_name
  port        = 5001
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2  # Stricter for canary
    timeout             = 5
    interval            = 15  # More frequent checks for canary
    path                = "/health"
    protocol            = "HTTP"
    matcher             = "200-299"
  }

  deregistration_delay = 30

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 3600
    enabled         = true
  }

  tags = merge(local.common_tags, {
    Name        = local.canary_tg_name
    Environment = "canary"
    Purpose     = "canary-deployment"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ─── Canary ECS Service ──────────────────────────────────────────────────────

resource "aws_ecs_service" "canary" {
  name            = local.canary_service_name
  cluster         = aws_ecs_cluster.cluster.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1  # Start with single instance
  launch_type     = "FARGATE"

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100

    deployment_circuit_breaker {
      enable   = true
      rollback = true
    }
  }

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.canary.arn
    container_name   = "backend"
    container_port   = 5001
  }

  health_check_grace_period_seconds = 60

  enable_execute_command = true

  tags = merge(local.common_tags, {
    Name        = local.canary_service_name
    Environment = "canary"
  })

  depends_on = [
    aws_lb_listener.https,
    aws_iam_role_policy_attachment.ecs_task_exec_policy
  ]

  lifecycle {
    ignore_changes = [desired_count]
  }
}

# ─── Weighted Target Group Configuration ─────────────────────────────────────
# Allows gradual traffic shifting: 5% -> 10% -> 25% -> 50% -> 100%

resource "aws_lb_listener_rule" "canary_weighted" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 50

  action {
    type = "forward"

    forward {
      target_group {
        arn    = aws_lb_target_group.blue.arn
        weight = 100  # Initially 100% to blue (stable)
      }

      target_group {
        arn    = aws_lb_target_group.canary.arn
        weight = 0  # 0% to canary initially
      }

      stickiness {
        enabled  = true
        duration = 3600
      }
    }
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }

  tags = merge(local.common_tags, {
    Name    = "canary-weighted-routing"
    Purpose = "canary-deployment"
  })

  lifecycle {
    ignore_changes = [action]  # Weights modified by deployment scripts
  }
}

# ─── CloudWatch Canary Monitoring ────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "canary_errors" {
  alarm_name          = "${local.canary_service_name}-high-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"  # Fail fast
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Sum"
  threshold           = "10"  # Stricter threshold for canary
  alarm_description   = "Canary deployment error rate too high - auto rollback triggered"
  alarm_actions       = [aws_sns_topic.alerts.arn, aws_sns_topic.canary_rollback.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    TargetGroup  = aws_lb_target_group.canary.arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = merge(local.common_tags, {
    Purpose = "canary-safety"
  })
}

resource "aws_cloudwatch_metric_alarm" "canary_latency" {
  alarm_name          = "${local.canary_service_name}-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "1.0"  # 1 second
  alarm_description   = "Canary deployment latency too high"
  alarm_actions       = [aws_sns_topic.alerts.arn, aws_sns_topic.canary_rollback.arn]

  dimensions = {
    TargetGroup  = aws_lb_target_group.canary.arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = merge(local.common_tags, {
    Purpose = "canary-safety"
  })
}

resource "aws_cloudwatch_metric_alarm" "canary_unhealthy_hosts" {
  alarm_name          = "${local.canary_service_name}-unhealthy-hosts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Maximum"
  threshold           = "0"
  alarm_description   = "Canary has unhealthy hosts - rollback triggered"
  alarm_actions       = [aws_sns_topic.alerts.arn, aws_sns_topic.canary_rollback.arn]

  dimensions = {
    TargetGroup  = aws_lb_target_group.canary.arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = merge(local.common_tags, {
    Purpose = "canary-safety"
  })
}

# ─── SNS Topic for Canary Rollback ───────────────────────────────────────────

resource "aws_sns_topic" "canary_rollback" {
  name              = "${var.project}-${var.environment}-canary-rollback"
  display_name      = "Canary Rollback Trigger"
  kms_master_key_id = var.enable_kms_encryption ? aws_kms_key.main[0].id : null

  tags = merge(local.common_tags, {
    Name    = "${var.project}-${var.environment}-canary-rollback"
    Purpose = "Automated Canary Rollback"
  })
}

# ─── Lambda Function for Automated Canary Rollback ───────────────────────────

resource "aws_iam_role" "canary_rollback_lambda" {
  name = "${var.project}-${var.environment}-canary-rollback-lambda"

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

resource "aws_iam_role_policy" "canary_rollback_lambda" {
  name = "${var.project}-${var.environment}-canary-rollback-policy"
  role = aws_iam_role.canary_rollback_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:ModifyRule",
          "elasticloadbalancing:DescribeRules",
          "elasticloadbalancing:DescribeTargetGroups",
          "elasticloadbalancing:DescribeTargetHealth"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.alerts.arn
      }
    ]
  })
}

resource "aws_lambda_function" "canary_rollback" {
  filename      = "${path.module}/../scripts/canary-rollback.zip"
  function_name = "${var.project}-${var.environment}-canary-rollback"
  role          = aws_iam_role.canary_rollback_lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 60

  environment {
    variables = {
      CLUSTER_NAME         = aws_ecs_cluster.cluster.name
      CANARY_SERVICE_NAME  = aws_ecs_service.canary.name
      LISTENER_RULE_ARN    = aws_lb_listener_rule.canary_weighted.arn
      BLUE_TG_ARN          = aws_lb_target_group.blue.arn
      CANARY_TG_ARN        = aws_lb_target_group.canary.arn
      SNS_TOPIC_ARN        = aws_sns_topic.alerts.arn
    }
  }

  tags = merge(local.common_tags, {
    Name    = "${var.project}-${var.environment}-canary-rollback"
    Purpose = "Automated Rollback"
  })

  depends_on = [aws_iam_role_policy.canary_rollback_lambda]
}

resource "aws_sns_topic_subscription" "canary_rollback_lambda" {
  topic_arn = aws_sns_topic.canary_rollback.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.canary_rollback.arn
}

resource "aws_lambda_permission" "canary_rollback_sns" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.canary_rollback.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.canary_rollback.arn
}

# ─── CloudWatch Dashboard for Canary Monitoring ──────────────────────────────

resource "aws_cloudwatch_dashboard" "canary" {
  dashboard_name = "${var.project}-${var.environment}-canary-deployment"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "Average", label = "Canary Latency" }],
            [".", ".", { stat = "p99", label = "Canary P99" }]
          ]
          period = 60
          stat   = "Average"
          region = var.aws_region
          title  = "Canary Response Time"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_2XX_Count", { stat = "Sum", label = "Success" }],
            [".", "HTTPCode_Target_5XX_Count", { stat = "Sum", label = "Errors" }]
          ]
          period = 60
          stat   = "Sum"
          region = var.aws_region
          title  = "Canary HTTP Status Codes"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "HealthyHostCount", { stat = "Average", label = "Healthy" }],
            [".", "UnHealthyHostCount", { stat = "Average", label = "Unhealthy" }]
          ]
          period = 60
          stat   = "Average"
          region = var.aws_region
          title  = "Canary Host Health"
        }
      }
    ]
  })
}

# ─── CodeDeploy Application for Canary Deployments ───────────────────────────

resource "aws_codedeploy_app" "main" {
  compute_platform = "ECS"
  name             = "${var.project}-${var.environment}"

  tags = local.common_tags
}

resource "aws_codedeploy_deployment_group" "canary" {
  app_name               = aws_codedeploy_app.main.name
  deployment_group_name  = "${var.project}-${var.environment}-canary"
  service_role_arn       = aws_iam_role.codedeploy.arn
  deployment_config_name = "CodeDeployDefault.ECSCanary10Percent5Minutes"

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE", "DEPLOYMENT_STOP_ON_ALARM"]
  }

  alarm_configuration {
    enabled = true
    alarms = [
      aws_cloudwatch_metric_alarm.canary_errors.alarm_name,
      aws_cloudwatch_metric_alarm.canary_latency.alarm_name,
      aws_cloudwatch_metric_alarm.canary_unhealthy_hosts.alarm_name
    ]
  }

  blue_green_deployment_config {
    deployment_ready_option {
      action_on_timeout = "CONTINUE_DEPLOYMENT"
    }

    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = 5
    }
  }

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  ecs_service {
    cluster_name = aws_ecs_cluster.cluster.name
    service_name = aws_ecs_service.canary.name
  }

  load_balancer_info {
    target_group_pair_info {
      prod_traffic_route {
        listener_arns = [aws_lb_listener.https.arn]
      }

      target_group {
        name = aws_lb_target_group.blue.name
      }

      target_group {
        name = aws_lb_target_group.canary.name
      }
    }
  }

  tags = merge(local.common_tags, {
    DeploymentType = "Canary"
  })
}

# ─── CodeDeploy IAM Role ─────────────────────────────────────────────────────

resource "aws_iam_role" "codedeploy" {
  name = "${var.project}-${var.environment}-codedeploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "codedeploy.amazonaws.com"
      }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "codedeploy" {
  role       = aws_iam_role.codedeploy.name
  policy_arn = "arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS"
}
