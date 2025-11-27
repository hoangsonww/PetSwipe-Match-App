# ═══════════════════════════════════════════════════════════════════════════
# Advanced Observability - Prometheus, Grafana, OpenTelemetry, APM
# ═══════════════════════════════════════════════════════════════════════════

# ─── Prometheus on ECS ───────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "prometheus" {
  family                   = "${var.project}-${var.environment}-prometheus"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.prometheus_task.arn

  container_definitions = jsonencode([{
    name  = "prometheus"
    image = "prom/prometheus:latest"
    portMappings = [{
      containerPort = 9090
      protocol      = "tcp"
    }]
    environment = [
      {
        name  = "ENVIRONMENT"
        value = var.environment
      }
    ]
    mountPoints = [{
      sourceVolume  = "prometheus-config"
      containerPath = "/etc/prometheus"
      readOnly      = true
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.project}-${var.environment}/prometheus"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "prometheus"
      }
    }
  }])

  volume {
    name = "prometheus-config"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.prometheus.id
      root_directory = "/prometheus"
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-prometheus"
  })
}

resource "aws_ecs_service" "prometheus" {
  name            = "${var.project}-${var.environment}-prometheus"
  cluster         = aws_ecs_cluster.cluster.id
  task_definition = aws_ecs_task_definition.prometheus.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.prometheus.arn
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-prometheus-service"
  })
}

resource "aws_efs_file_system" "prometheus" {
  creation_token = "${var.project}-${var.environment}-prometheus"
  encrypted      = true
  kms_key_id     = var.enable_kms_encryption ? aws_kms_key.main[0].arn : null

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-prometheus-efs"
  })
}

# ─── Grafana on ECS ──────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "grafana" {
  family                   = "${var.project}-${var.environment}-grafana"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.grafana_task.arn

  container_definitions = jsonencode([{
    name  = "grafana"
    image = "grafana/grafana:latest"
    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]
    environment = [
      {
        name  = "GF_SERVER_ROOT_URL"
        value = "https://grafana.${var.project}.com"
      },
      {
        name  = "GF_SECURITY_ADMIN_PASSWORD"
        value = random_password.grafana_admin.result
      },
      {
        name  = "GF_INSTALL_PLUGINS"
        value = "grafana-clock-panel,grafana-simple-json-datasource,grafana-worldmap-panel"
      }
    ]
    mountPoints = [{
      sourceVolume  = "grafana-storage"
      containerPath = "/var/lib/grafana"
      readOnly      = false
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.project}-${var.environment}/grafana"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "grafana"
      }
    }
  }])

  volume {
    name = "grafana-storage"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.grafana.id
      root_directory = "/grafana"
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-grafana"
  })
}

resource "aws_ecs_service" "grafana" {
  name            = "${var.project}-${var.environment}-grafana"
  cluster         = aws_ecs_cluster.cluster.id
  task_definition = aws_ecs_task_definition.grafana.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.grafana.arn
    container_name   = "grafana"
    container_port   = 3000
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-grafana-service"
  })
}

resource "aws_lb_target_group" "grafana" {
  name        = "${var.project}-${var.environment}-grafana-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/api/health"
    protocol            = "HTTP"
    matcher             = "200"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-grafana-tg"
  })
}

resource "aws_efs_file_system" "grafana" {
  creation_token = "${var.project}-${var.environment}-grafana"
  encrypted      = true
  kms_key_id     = var.enable_kms_encryption ? aws_kms_key.main[0].arn : null

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-grafana-efs"
  })
}

resource "random_password" "grafana_admin" {
  length  = 16
  special = true
}

# ─── OpenTelemetry Collector ─────────────────────────────────────────────────

resource "aws_ecs_task_definition" "otel_collector" {
  family                   = "${var.project}-${var.environment}-otel-collector"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([{
    name  = "otel-collector"
    image = "otel/opentelemetry-collector-contrib:latest"
    portMappings = [
      {
        containerPort = 4317
        protocol      = "tcp"
      },
      {
        containerPort = 4318
        protocol      = "tcp"
      },
      {
        containerPort = 55681
        protocol      = "tcp"
      }
    ]
    environment = [
      {
        name  = "AWS_REGION"
        value = var.aws_region
      }
    ]
    command = ["--config=/etc/otel-collector-config.yaml"]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.project}-${var.environment}/otel-collector"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "otel"
      }
    }
  }])

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-otel-collector"
  })
}

resource "aws_ecs_service" "otel_collector" {
  name            = "${var.project}-${var.environment}-otel-collector"
  cluster         = aws_ecs_cluster.cluster.id
  task_definition = aws_ecs_task_definition.otel_collector.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.otel.arn
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-otel-service"
  })
}

# ─── Service Discovery ───────────────────────────────────────────────────────

resource "aws_service_discovery_private_dns_namespace" "main" {
  name = "${var.project}.local"
  vpc  = var.vpc_id

  tags = merge(local.common_tags, {
    Name = "${var.project}-service-discovery"
  })
}

resource "aws_service_discovery_service" "prometheus" {
  name = "prometheus"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-prometheus-discovery"
  })
}

resource "aws_service_discovery_service" "otel" {
  name = "otel-collector"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-otel-discovery"
  })
}

# ─── IAM Roles for Observability Tasks ───────────────────────────────────────

resource "aws_iam_role" "prometheus_task" {
  name = "${var.project}-${var.environment}-prometheus-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "prometheus_task" {
  name = "${var.project}-${var.environment}-prometheus-policy"
  role = aws_iam_role.prometheus_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecs:ListClusters",
          "ecs:ListContainerInstances",
          "ecs:DescribeContainerInstances",
          "ecs:DescribeTasks",
          "ecs:DescribeTaskDefinition",
          "ec2:DescribeInstances",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role" "grafana_task" {
  name = "${var.project}-${var.environment}-grafana-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "grafana_task" {
  name = "${var.project}-${var.environment}-grafana-policy"
  role = aws_iam_role.grafana_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:DescribeAlarms",
          "cloudwatch:DescribeAlarmsForMetric",
          "cloudwatch:GetMetricData",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics",
          "logs:DescribeLogGroups",
          "logs:GetLogGroupFields",
          "logs:StartQuery",
          "logs:StopQuery",
          "logs:GetQueryResults",
          "logs:GetLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

# ─── Application Performance Monitoring Integration ──────────────────────────

resource "aws_cloudwatch_log_metric_filter" "api_latency_p99" {
  name           = "${var.project}-${var.environment}-api-latency-p99"
  log_group_name = aws_cloudwatch_log_group.application.name
  pattern        = "[timestamp, request_id, level, message, duration_ms]"

  metric_transformation {
    name      = "APILatencyP99"
    namespace = "PetSwipe/Performance"
    value     = "$duration_ms"
    unit      = "Milliseconds"
  }
}

resource "aws_cloudwatch_log_metric_filter" "error_rate" {
  name           = "${var.project}-${var.environment}-error-rate"
  log_group_name = aws_cloudwatch_log_group.application.name
  pattern        = "[timestamp, request_id, level=ERROR, ...]"

  metric_transformation {
    name      = "ApplicationErrors"
    namespace = "PetSwipe/Errors"
    value     = "1"
    unit      = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "business_metrics_swipes" {
  name           = "${var.project}-${var.environment}-swipe-count"
  log_group_name = aws_cloudwatch_log_group.application.name
  pattern        = "[timestamp, request_id, level, message=\"Pet swiped\", ...]"

  metric_transformation {
    name      = "SwipeCount"
    namespace = "PetSwipe/Business"
    value     = "1"
    unit      = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "business_metrics_matches" {
  name           = "${var.project}-${var.environment}-match-count"
  log_group_name = aws_cloudwatch_log_group.application.name
  pattern        = "[timestamp, request_id, level, message=\"Match created\", ...]"

  metric_transformation {
    name      = "MatchCount"
    namespace = "PetSwipe/Business"
    value     = "1"
    unit      = "Count"
  }
}

# ─── Custom CloudWatch Dashboard for SRE ─────────────────────────────────────

resource "aws_cloudwatch_dashboard" "sre" {
  dashboard_name = "${var.project}-${var.environment}-sre"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title = "Golden Signals - Latency"
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "Average", label = "Avg" }],
            ["...", { stat = "p50", label = "P50" }],
            ["...", { stat = "p95", label = "P95" }],
            ["...", { stat = "p99", label = "P99" }]
          ]
          region = var.aws_region
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title = "Golden Signals - Traffic"
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", { stat = "Sum", label = "Requests/min" }]
          ]
          region = var.aws_region
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title = "Golden Signals - Errors"
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", { stat = "Sum", label = "5XX Errors" }],
            [".", "HTTPCode_Target_4XX_Count", { stat = "Sum", label = "4XX Errors" }]
          ]
          region = var.aws_region
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title = "Golden Signals - Saturation"
          metrics = [
            ["AWS/ECS", "CPUUtilization", { stat = "Average", label = "CPU" }],
            [".", "MemoryUtilization", { stat = "Average", label = "Memory" }]
          ]
          region = var.aws_region
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title = "Service Level Indicators"
          metrics = [
            ["PetSwipe", "Availability", { stat = "Average" }],
            [".", "ErrorRate", { stat = "Average" }],
            [".", "RequestSuccess", { stat = "Sum" }]
          ]
          region = var.aws_region
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title = "Business Metrics"
          metrics = [
            ["PetSwipe/Business", "SwipeCount", { stat = "Sum" }],
            [".", "MatchCount", { stat = "Sum" }]
          ]
          region = var.aws_region
        }
      }
    ]
  })
}

# ─── CloudWatch Synthetics Canary ────────────────────────────────────────────

resource "aws_synthetics_canary" "api_health" {
  name                 = "${var.project}-${var.environment}-api-canary"
  artifact_s3_location = "s3://${aws_s3_bucket.canary_artifacts.id}/canary"
  execution_role_arn   = aws_iam_role.synthetics_canary.arn
  handler              = "apiCanaryBlueprint.handler"
  zip_file             = "${path.module}/../scripts/canary-script.zip"
  runtime_version      = "syn-nodejs-puppeteer-6.0"

  schedule {
    expression = "rate(5 minutes)"
  }

  run_config {
    timeout_in_seconds = 60
    memory_in_mb       = 960
    active_tracing     = true
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-api-canary"
  })
}

resource "aws_s3_bucket" "canary_artifacts" {
  bucket = "${var.project}-${var.environment}-canary-artifacts"

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-canary-artifacts"
  })
}

resource "aws_iam_role" "synthetics_canary" {
  name = "${var.project}-${var.environment}-synthetics-canary"

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

resource "aws_iam_role_policy_attachment" "synthetics_canary" {
  role       = aws_iam_role.synthetics_canary.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchSyntheticsFullAccess"
}
