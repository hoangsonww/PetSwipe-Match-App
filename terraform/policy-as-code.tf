# ═══════════════════════════════════════════════════════════════════════════
# Policy as Code - Open Policy Agent (OPA) for Governance
# Infrastructure and deployment policy validation
# ═══════════════════════════════════════════════════════════════════════════

# ─── OPA Server on ECS ───────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "opa" {
  count = var.enable_policy_as_code ? 1 : 0

  family                   = "${var.project}-${var.environment}-opa"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([{
    name  = "opa"
    image = "openpolicyagent/opa:latest"
    command = [
      "run",
      "--server",
      "--log-level=info",
      "--set=decision_logs.console=true"
    ]
    portMappings = [{
      containerPort = 8181
      protocol      = "tcp"
    }]
    environment = [
      {
        name  = "ENVIRONMENT"
        value = var.environment
      }
    ]
    mountPoints = [{
      sourceVolume  = "opa-policies"
      containerPath = "/policies"
      readOnly      = true
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.project}-${var.environment}/opa"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "opa"
      }
    }
  }])

  volume {
    name = "opa-policies"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.opa_policies[0].id
      root_directory = "/policies"
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-opa"
  })
}

resource "aws_ecs_service" "opa" {
  count = var.enable_policy_as_code ? 1 : 0

  name            = "${var.project}-${var.environment}-opa"
  cluster         = aws_ecs_cluster.cluster.id
  task_definition = aws_ecs_task_definition.opa[0].arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.opa[0].arn
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-opa-service"
  })
}

resource "aws_efs_file_system" "opa_policies" {
  count = var.enable_policy_as_code ? 1 : 0

  creation_token = "${var.project}-${var.environment}-opa-policies"
  encrypted      = true
  kms_key_id     = var.enable_kms_encryption ? aws_kms_key.main[0].arn : null

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-opa-policies"
  })
}

resource "aws_service_discovery_service" "opa" {
  count = var.enable_policy_as_code ? 1 : 0

  name = "opa"

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
    Name = "${var.project}-opa-discovery"
  })
}

# ─── Policy Files Storage in S3 ──────────────────────────────────────────────

resource "aws_s3_bucket" "opa_policies" {
  count = var.enable_policy_as_code ? 1 : 0

  bucket = "${var.project}-${var.environment}-opa-policies"

  tags = merge(local.common_tags, {
    Name    = "${var.project}-${var.environment}-opa-policies"
    Purpose = "OPA Policy Storage"
  })
}

resource "aws_s3_bucket_versioning" "opa_policies" {
  count = var.enable_policy_as_code ? 1 : 0

  bucket = aws_s3_bucket.opa_policies[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

# Upload sample policies
resource "aws_s3_object" "deployment_policy" {
  count = var.enable_policy_as_code ? 1 : 0

  bucket = aws_s3_bucket.opa_policies[0].id
  key    = "deployment.rego"
  content = file("${path.module}/../policies/deployment.rego")
  etag   = filemd5("${path.module}/../policies/deployment.rego")

  tags = local.common_tags
}

resource "aws_s3_object" "security_policy" {
  count = var.enable_policy_as_code ? 1 : 0

  bucket = aws_s3_bucket.opa_policies[0].id
  key    = "security.rego"
  content = file("${path.module}/../policies/security.rego")
  etag   = filemd5("${path.module}/../policies/security.rego")

  tags = local.common_tags
}

resource "aws_s3_object" "resource_policy" {
  count = var.enable_policy_as_code ? 1 : 0

  bucket = aws_s3_bucket.opa_policies[0].id
  key    = "resource-limits.rego"
  content = file("${path.module}/../policies/resource-limits.rego")
  etag   = filemd5("${path.module}/../policies/resource-limits.rego")

  tags = local.common_tags
}

# ─── Lambda for Policy Validation ────────────────────────────────────────────

resource "aws_lambda_function" "policy_validator" {
  count = var.enable_policy_as_code ? 1 : 0

  filename         = "${path.module}/../lambda/policy-validator.zip"
  function_name    = "${var.project}-${var.environment}-policy-validator"
  role             = aws_iam_role.policy_validator[0].arn
  handler          = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/../lambda/policy-validator.zip")
  runtime          = "nodejs18.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      OPA_SERVER_URL = "http://opa.${var.project}.local:8181"
      ENVIRONMENT    = var.environment
      POLICY_BUCKET  = aws_s3_bucket.opa_policies[0].id
    }
  }

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.security_group_ids
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-policy-validator"
  })
}

resource "aws_iam_role" "policy_validator" {
  count = var.enable_policy_as_code ? 1 : 0

  name = "${var.project}-${var.environment}-policy-validator-role"

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

resource "aws_iam_role_policy" "policy_validator" {
  count = var.enable_policy_as_code ? 1 : 0

  name = "${var.project}-${var.environment}-policy-validator-policy"
  role = aws_iam_role.policy_validator[0].id

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
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.opa_policies[0].arn,
          "${aws_s3_bucket.opa_policies[0].arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices",
          "ecs:DescribeTasks",
          "ecs:DescribeTaskDefinition"
        ]
        Resource = "*"
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

# ─── EventBridge Rule for Deployment Validation ──────────────────────────────

resource "aws_cloudwatch_event_rule" "deployment_validation" {
  count = var.enable_policy_as_code ? 1 : 0

  name        = "${var.project}-${var.environment}-deployment-validation"
  description = "Validate deployments against policies"

  event_pattern = jsonencode({
    source      = ["aws.ecs", "aws.codepipeline"]
    detail-type = [
      "ECS Task State Change",
      "CodePipeline Pipeline Execution State Change"
    ]
  })

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "deployment_validation" {
  count = var.enable_policy_as_code ? 1 : 0

  rule      = aws_cloudwatch_event_rule.deployment_validation[0].name
  target_id = "PolicyValidationLambda"
  arn       = aws_lambda_function.policy_validator[0].arn
}

resource "aws_lambda_permission" "deployment_validation" {
  count = var.enable_policy_as_code ? 1 : 0

  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.policy_validator[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.deployment_validation[0].arn
}

# ─── Config Rules for Compliance ─────────────────────────────────────────────

resource "aws_config_organization_custom_rule" "terraform_policy" {
  count = var.enable_policy_as_code ? 1 : 0

  name = "${var.project}-${var.environment}-terraform-policy"

  lambda_function_arn = aws_lambda_function.policy_validator[0].arn

  trigger_types = ["ConfigurationItemChangeNotification"]
  resource_types_scope = [
    "AWS::EC2::Instance",
    "AWS::RDS::DBInstance",
    "AWS::S3::Bucket",
    "AWS::ECS::Service"
  ]

  depends_on = [aws_lambda_permission.config_rule]
}

resource "aws_lambda_permission" "config_rule" {
  count = var.enable_policy_as_code ? 1 : 0

  statement_id  = "AllowExecutionFromConfig"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.policy_validator[0].function_name
  principal     = "config.amazonaws.com"
}

# ─── CloudWatch Dashboard for Policy Violations ──────────────────────────────

resource "aws_cloudwatch_dashboard" "policy_governance" {
  count = var.enable_policy_as_code ? 1 : 0

  dashboard_name = "${var.project}-${var.environment}-policy-governance"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title = "Policy Validation Results"
          metrics = [
            ["OPA", "PolicyViolations", { stat = "Sum", label = "Violations" }],
            [".", "PolicyEvaluations", { stat = "Sum", label = "Evaluations" }]
          ]
          region = var.aws_region
          period = 300
        }
      },
      {
        type   = "log"
        width  = 12
        height = 6
        properties = {
          query   = <<-QUERY
            SOURCE '/ecs/${var.project}-${var.environment}/opa'
            | fields @timestamp, @message
            | filter @message like /violation/
            | sort @timestamp desc
            | limit 20
          QUERY
          region = var.aws_region
          title  = "Recent Policy Violations"
        }
      }
    ]
  })
}

# ─── Outputs ─────────────────────────────────────────────────────────────────

output "opa_service_url" {
  description = "OPA service URL"
  value       = var.enable_policy_as_code ? "http://opa.${var.project}.local:8181" : null
}

output "policy_bucket" {
  description = "S3 bucket containing OPA policies"
  value       = var.enable_policy_as_code ? aws_s3_bucket.opa_policies[0].id : null
}
