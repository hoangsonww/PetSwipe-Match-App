# ═══════════════════════════════════════════════════════════════════════════
# Blue-Green Deployment Configuration for ECS
# Enables zero-downtime deployments with instant rollback capability
# ═══════════════════════════════════════════════════════════════════════════

locals {
  blue_service_name  = "${var.project}-${var.environment}-blue"
  green_service_name = "${var.project}-${var.environment}-green"
  blue_tg_name       = "${var.project}-${var.environment}-blue-tg"
  green_tg_name      = "${var.project}-${var.environment}-green-tg"
}

# ─── Blue Environment Target Group ───────────────────────────────────────────

resource "aws_lb_target_group" "blue" {
  name        = local.blue_tg_name
  port        = 5001
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
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
    Name        = local.blue_tg_name
    Environment = "blue"
    Purpose     = "blue-green-deployment"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ─── Green Environment Target Group ──────────────────────────────────────────

resource "aws_lb_target_group" "green" {
  name        = local.green_tg_name
  port        = 5001
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
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
    Name        = local.green_tg_name
    Environment = "green"
    Purpose     = "blue-green-deployment"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ─── Application Load Balancer ───────────────────────────────────────────────

resource "aws_lb" "main" {
  name               = local.alb_name
  internal           = false
  load_balancer_type = "application"
  security_groups    = var.security_group_ids
  subnets            = var.subnet_ids

  enable_deletion_protection       = var.environment == "production" ? true : false
  enable_cross_zone_load_balancing = true
  enable_http2                     = true
  enable_waf_fail_open             = false

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    enabled = true
    prefix  = "alb"
  }

  tags = merge(local.common_tags, {
    Name = local.alb_name
  })
}

# ─── S3 Bucket for ALB Logs ──────────────────────────────────────────────────

resource "aws_s3_bucket" "alb_logs" {
  bucket = "${var.project}-${var.environment}-alb-logs-${data.aws_caller_identity.current.account_id}"

  tags = merge(local.common_tags, {
    Name    = "${var.project}-${var.environment}-alb-logs"
    Purpose = "ALB Access Logs"
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    id     = "expire-old-logs"
    status = "Enabled"

    expiration {
      days = 90
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 60
      storage_class = "GLACIER"
    }
  }
}

# ─── ALB Listener (HTTP) ─────────────────────────────────────────────────────
# Production traffic initially goes to blue environment

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ─── ALB Listener (HTTPS) ────────────────────────────────────────────────────

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.blue.arn
  }

  tags = merge(local.common_tags, {
    Name = "${local.alb_name}-https-listener"
  })
}

# ─── Listener Rule for Test Traffic (Green) ─────────────────────────────────
# Allows testing green environment before switching production traffic

resource "aws_lb_listener_rule" "test_traffic" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.green.arn
  }

  condition {
    http_header {
      http_header_name = "X-Test-Environment"
      values           = ["green"]
    }
  }

  tags = merge(local.common_tags, {
    Name = "test-traffic-rule"
  })
}

# ─── Blue Environment ECS Service ────────────────────────────────────────────

resource "aws_ecs_service" "blue" {
  name            = local.blue_service_name
  cluster         = aws_ecs_cluster.cluster.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.ecs_desired_count
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
    target_group_arn = aws_lb_target_group.blue.arn
    container_name   = "backend"
    container_port   = 5001
  }

  health_check_grace_period_seconds = 60

  enable_execute_command = true

  tags = merge(local.common_tags, {
    Name        = local.blue_service_name
    Environment = "blue"
  })

  depends_on = [
    aws_lb_listener.https,
    aws_iam_role_policy_attachment.ecs_task_exec_policy
  ]

  lifecycle {
    ignore_changes = [desired_count]
  }
}

# ─── Green Environment ECS Service ───────────────────────────────────────────

resource "aws_ecs_service" "green" {
  name            = local.green_service_name
  cluster         = aws_ecs_cluster.cluster.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 0  # Initially zero, scaled up during deployment
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
    target_group_arn = aws_lb_target_group.green.arn
    container_name   = "backend"
    container_port   = 5001
  }

  health_check_grace_period_seconds = 60

  enable_execute_command = true

  tags = merge(local.common_tags, {
    Name        = local.green_service_name
    Environment = "green"
  })

  depends_on = [
    aws_lb_listener.https,
    aws_iam_role_policy_attachment.ecs_task_exec_policy
  ]

  lifecycle {
    ignore_changes = [desired_count]
  }
}

# ─── Auto Scaling for Blue Environment ──────────────────────────────────────

resource "aws_appautoscaling_target" "blue" {
  max_capacity       = var.ecs_max_capacity
  min_capacity       = var.ecs_min_capacity
  resource_id        = "service/${aws_ecs_cluster.cluster.name}/${aws_ecs_service.blue.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "blue_cpu" {
  name               = "${local.blue_service_name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.blue.resource_id
  scalable_dimension = aws_appautoscaling_target.blue.scalable_dimension
  service_namespace  = aws_appautoscaling_target.blue.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = var.ecs_cpu_target
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

resource "aws_appautoscaling_policy" "blue_memory" {
  name               = "${local.blue_service_name}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.blue.resource_id
  scalable_dimension = aws_appautoscaling_target.blue.scalable_dimension
  service_namespace  = aws_appautoscaling_target.blue.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = var.ecs_memory_target
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
  }
}

# ─── Auto Scaling for Green Environment ─────────────────────────────────────

resource "aws_appautoscaling_target" "green" {
  max_capacity       = var.ecs_max_capacity
  min_capacity       = var.ecs_min_capacity
  resource_id        = "service/${aws_ecs_cluster.cluster.name}/${aws_ecs_service.green.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "green_cpu" {
  name               = "${local.green_service_name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.green.resource_id
  scalable_dimension = aws_appautoscaling_target.green.scalable_dimension
  service_namespace  = aws_appautoscaling_target.green.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = var.ecs_cpu_target
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

resource "aws_appautoscaling_policy" "green_memory" {
  name               = "${local.green_service_name}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.green.resource_id
  scalable_dimension = aws_appautoscaling_target.green.scalable_dimension
  service_namespace  = aws_appautoscaling_target.green.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = var.ecs_memory_target
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
  }
}

# ─── CloudWatch Alarms for Blue Environment ──────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "blue_high_cpu" {
  alarm_name          = "${local.blue_service_name}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "60"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors ECS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.cluster.name
    ServiceName = aws_ecs_service.blue.name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "blue_high_memory" {
  alarm_name          = "${local.blue_service_name}-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "60"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors ECS memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.cluster.name
    ServiceName = aws_ecs_service.blue.name
  }

  tags = local.common_tags
}

# ─── CloudWatch Alarms for Green Environment ─────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "green_high_cpu" {
  alarm_name          = "${local.green_service_name}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "60"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors ECS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.cluster.name
    ServiceName = aws_ecs_service.green.name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "green_high_memory" {
  alarm_name          = "${local.green_service_name}-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "60"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors ECS memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.cluster.name
    ServiceName = aws_ecs_service.green.name
  }

  tags = local.common_tags
}

# ─── SNS Topic for Alerts ────────────────────────────────────────────────────

resource "aws_sns_topic" "alerts" {
  name              = "${var.project}-${var.environment}-deployment-alerts"
  display_name      = "PetSwipe Deployment Alerts"
  kms_master_key_id = var.enable_kms_encryption ? aws_kms_key.main[0].id : null

  tags = merge(local.common_tags, {
    Name    = "${var.project}-${var.environment}-deployment-alerts"
    Purpose = "Deployment Monitoring"
  })
}

resource "aws_sns_topic_subscription" "alerts_email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
