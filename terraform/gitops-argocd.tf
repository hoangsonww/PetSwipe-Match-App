# ═══════════════════════════════════════════════════════════════════════════
# GitOps with ArgoCD - Automated Continuous Deployment
# Declarative, Git-based deployment automation for Kubernetes/ECS
# ═══════════════════════════════════════════════════════════════════════════

# ─── EKS Cluster for ArgoCD (Optional - can also use ECS) ───────────────────

resource "aws_eks_cluster" "gitops" {
  count = var.enable_gitops ? 1 : 0

  name     = "${var.project}-${var.environment}-gitops-cluster"
  role_arn = aws_iam_role.eks_cluster[0].arn
  version  = "1.28"

  vpc_config {
    subnet_ids              = var.subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = true
    security_group_ids      = [aws_security_group.eks_cluster[0].id]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  encryption_config {
    provider {
      key_arn = var.enable_kms_encryption ? aws_kms_key.main[0].arn : null
    }
    resources = ["secrets"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-gitops-cluster"
  })

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_iam_role_policy_attachment.eks_vpc_resource_controller,
  ]
}

resource "aws_eks_node_group" "gitops" {
  count = var.enable_gitops ? 1 : 0

  cluster_name    = aws_eks_cluster.gitops[0].name
  node_group_name = "${var.project}-${var.environment}-gitops-nodes"
  node_role_arn   = aws_iam_role.eks_node_group[0].arn
  subnet_ids      = var.subnet_ids

  scaling_config {
    desired_size = 2
    max_size     = 4
    min_size     = 1
  }

  instance_types = ["t3.medium"]
  capacity_type  = "ON_DEMAND"

  update_config {
    max_unavailable = 1
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-gitops-nodes"
  })

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]
}

# ─── IAM Roles for EKS ───────────────────────────────────────────────────────

resource "aws_iam_role" "eks_cluster" {
  count = var.enable_gitops ? 1 : 0

  name = "${var.project}-${var.environment}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  count = var.enable_gitops ? 1 : 0

  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster[0].name
}

resource "aws_iam_role_policy_attachment" "eks_vpc_resource_controller" {
  count = var.enable_gitops ? 1 : 0

  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  role       = aws_iam_role.eks_cluster[0].name
}

resource "aws_iam_role" "eks_node_group" {
  count = var.enable_gitops ? 1 : 0

  name = "${var.project}-${var.environment}-eks-node-group-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  count = var.enable_gitops ? 1 : 0

  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_group[0].name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  count = var.enable_gitops ? 1 : 0

  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_group[0].name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  count = var.enable_gitops ? 1 : 0

  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_group[0].name
}

# ─── Security Group for EKS ──────────────────────────────────────────────────

resource "aws_security_group" "eks_cluster" {
  count = var.enable_gitops ? 1 : 0

  name        = "${var.project}-${var.environment}-eks-cluster-sg"
  description = "Security group for EKS cluster"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-eks-cluster-sg"
  })
}

# ─── ArgoCD Helm Release Configuration ───────────────────────────────────────

# Store ArgoCD configuration in SSM Parameter Store
resource "aws_ssm_parameter" "argocd_config" {
  count = var.enable_gitops ? 1 : 0

  name        = "/${var.project}/${var.environment}/argocd/config"
  description = "ArgoCD configuration for GitOps"
  type        = "SecureString"
  kms_key_id  = var.enable_kms_encryption ? aws_kms_key.main[0].id : null

  value = jsonencode({
    repo_url    = var.gitops_repo_url
    repo_branch = var.gitops_repo_branch
    sync_policy = {
      automated = {
        prune       = true
        self_heal   = true
        allow_empty = false
      }
      sync_options = [
        "CreateNamespace=true",
        "PrunePropagationPolicy=foreground",
        "PruneLast=true"
      ]
      retry = {
        limit = 5
        backoff = {
          duration     = "5s"
          max_duration = "3m"
          factor       = 2
        }
      }
    }
    notifications = {
      slack_webhook = var.slack_webhook_url
      enabled       = true
    }
  })

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-argocd-config"
  })
}

# ─── ArgoCD Application Definitions ──────────────────────────────────────────

# Store application manifests in S3 for ArgoCD to sync
resource "aws_s3_bucket" "gitops_manifests" {
  count = var.enable_gitops ? 1 : 0

  bucket = "${var.project}-${var.environment}-gitops-manifests"

  tags = merge(local.common_tags, {
    Name    = "${var.project}-${var.environment}-gitops-manifests"
    Purpose = "GitOps Application Manifests"
  })
}

resource "aws_s3_bucket_versioning" "gitops_manifests" {
  count = var.enable_gitops ? 1 : 0

  bucket = aws_s3_bucket.gitops_manifests[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "gitops_manifests" {
  count = var.enable_gitops ? 1 : 0

  bucket = aws_s3_bucket.gitops_manifests[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.enable_kms_encryption ? "aws:kms" : "AES256"
      kms_master_key_id = var.enable_kms_encryption ? aws_kms_key.main[0].arn : null
    }
  }
}

# ─── CodeCommit Repository for GitOps (Alternative to GitHub) ────────────────

resource "aws_codecommit_repository" "gitops" {
  count = var.enable_gitops && var.use_codecommit ? 1 : 0

  repository_name = "${var.project}-${var.environment}-gitops"
  description     = "GitOps repository for ${var.project} deployments"

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-gitops-repo"
  })
}

# ─── EventBridge Rules for GitOps Automation ─────────────────────────────────

resource "aws_cloudwatch_event_rule" "gitops_sync" {
  count = var.enable_gitops ? 1 : 0

  name        = "${var.project}-${var.environment}-gitops-sync"
  description = "Trigger ArgoCD sync on deployment events"

  event_pattern = jsonencode({
    source      = ["aws.ecs", "aws.codepipeline"]
    detail-type = ["ECS Deployment State Change", "CodePipeline Pipeline Execution State Change"]
  })

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "gitops_sync_lambda" {
  count = var.enable_gitops ? 1 : 0

  rule      = aws_cloudwatch_event_rule.gitops_sync[0].name
  target_id = "TriggerGitOpsSync"
  arn       = aws_lambda_function.gitops_sync[0].arn
}

# ─── Lambda for GitOps Sync Automation ───────────────────────────────────────

resource "aws_lambda_function" "gitops_sync" {
  count = var.enable_gitops ? 1 : 0

  filename         = "${path.module}/../lambda/gitops-sync.zip"
  function_name    = "${var.project}-${var.environment}-gitops-sync"
  role             = aws_iam_role.gitops_sync_lambda[0].arn
  handler          = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/../lambda/gitops-sync.zip")
  runtime          = "nodejs18.x"
  timeout          = 300
  memory_size      = 256

  environment {
    variables = {
      ARGOCD_SERVER     = "argocd-server.${var.project}.local"
      ARGOCD_AUTH_TOKEN = aws_secretsmanager_secret.argocd_token[0].arn
      EKS_CLUSTER_NAME  = aws_eks_cluster.gitops[0].name
      ENVIRONMENT       = var.environment
    }
  }

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.security_group_ids
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-gitops-sync-lambda"
  })
}

resource "aws_iam_role" "gitops_sync_lambda" {
  count = var.enable_gitops ? 1 : 0

  name = "${var.project}-${var.environment}-gitops-sync-lambda-role"

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

resource "aws_iam_role_policy" "gitops_sync_lambda" {
  count = var.enable_gitops ? 1 : 0

  name = "${var.project}-${var.environment}-gitops-sync-lambda-policy"
  role = aws_iam_role.gitops_sync_lambda[0].id

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
          "eks:DescribeCluster",
          "eks:ListClusters"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.argocd_token[0].arn
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

resource "aws_lambda_permission" "gitops_sync" {
  count = var.enable_gitops ? 1 : 0

  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.gitops_sync[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.gitops_sync[0].arn
}

# ─── Secrets Manager for ArgoCD Token ────────────────────────────────────────

resource "aws_secretsmanager_secret" "argocd_token" {
  count = var.enable_gitops ? 1 : 0

  name        = "${var.project}-${var.environment}-argocd-token"
  description = "ArgoCD authentication token"
  kms_key_id  = var.enable_kms_encryption ? aws_kms_key.main[0].arn : null

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-argocd-token"
  })
}

resource "random_password" "argocd_token" {
  count = var.enable_gitops ? 1 : 0

  length  = 32
  special = true
}

resource "aws_secretsmanager_secret_version" "argocd_token" {
  count = var.enable_gitops ? 1 : 0

  secret_id     = aws_secretsmanager_secret.argocd_token[0].id
  secret_string = random_password.argocd_token[0].result
}

# ─── CloudWatch Alarms for GitOps Health ─────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "gitops_sync_failures" {
  count = var.enable_gitops ? 1 : 0

  alarm_name          = "${var.project}-${var.environment}-gitops-sync-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "GitOps sync failures detected"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.gitops_sync[0].function_name
  }

  tags = local.common_tags
}

# ─── Outputs ─────────────────────────────────────────────────────────────────

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint for ArgoCD"
  value       = var.enable_gitops ? aws_eks_cluster.gitops[0].endpoint : null
}

output "argocd_config_parameter" {
  description = "SSM parameter containing ArgoCD configuration"
  value       = var.enable_gitops ? aws_ssm_parameter.argocd_config[0].name : null
}

output "gitops_manifests_bucket" {
  description = "S3 bucket for GitOps manifests"
  value       = var.enable_gitops ? aws_s3_bucket.gitops_manifests[0].id : null
}
