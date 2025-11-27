# ═══════════════════════════════════════════════════════════════════════════
# Disaster Recovery and Business Continuity Configuration
# Multi-Region Setup, Automated Backups, RTO/RPO Compliance
# ═══════════════════════════════════════════════════════════════════════════

# ─── AWS Backup Vault ────────────────────────────────────────────────────────

resource "aws_backup_vault" "main" {
  count = var.enable_backup ? 1 : 0

  name        = "${var.project}-${var.environment}-backup-vault"
  kms_key_arn = var.enable_kms_encryption ? aws_kms_key.main[0].arn : null

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-backup-vault"
  })
}

resource "aws_backup_vault" "dr_region" {
  count = var.enable_backup ? 1 : 0

  provider    = aws.dr_region
  name        = "${var.project}-${var.environment}-backup-vault-dr"
  kms_key_arn = var.enable_kms_encryption ? aws_kms_key.dr_region[0].arn : null

  tags = merge(local.common_tags, {
    Name   = "${var.project}-${var.environment}-backup-vault-dr"
    Region = var.dr_region
  })
}

# ─── Backup Plans ────────────────────────────────────────────────────────────

resource "aws_backup_plan" "continuous" {
  count = var.enable_backup ? 1 : 0

  name = "${var.project}-${var.environment}-continuous-backup"

  # Continuous backups every hour
  rule {
    rule_name         = "hourly_backup"
    target_vault_name = aws_backup_vault.main[0].name
    schedule          = "cron(0 * * * ? *)"  # Every hour

    lifecycle {
      delete_after = 7  # Keep for 7 days
    }

    recovery_point_tags = merge(local.common_tags, {
      BackupType = "Hourly"
    })
  }

  # Daily backups retained for 30 days
  rule {
    rule_name         = "daily_backup"
    target_vault_name = aws_backup_vault.main[0].name
    schedule          = "cron(0 3 * * ? *)"  # 3 AM UTC

    lifecycle {
      delete_after = 30
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.dr_region[0].arn

      lifecycle {
        delete_after = 30
      }
    }

    recovery_point_tags = merge(local.common_tags, {
      BackupType = "Daily"
    })
  }

  # Weekly backups retained for 90 days
  rule {
    rule_name         = "weekly_backup"
    target_vault_name = aws_backup_vault.main[0].name
    schedule          = "cron(0 4 ? * 1 *)"  # Sundays at 4 AM UTC

    lifecycle {
      delete_after = 90
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.dr_region[0].arn

      lifecycle {
        delete_after = 90
      }
    }

    recovery_point_tags = merge(local.common_tags, {
      BackupType = "Weekly"
    })
  }

  # Monthly backups retained for 365 days
  rule {
    rule_name         = "monthly_backup"
    target_vault_name = aws_backup_vault.main[0].name
    schedule          = "cron(0 5 1 * ? *)"  # 1st of month at 5 AM UTC

    lifecycle {
      delete_after = 365
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.dr_region[0].arn

      lifecycle {
        delete_after = 365
      }
    }

    recovery_point_tags = merge(local.common_tags, {
      BackupType = "Monthly"
    })
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-backup-plan"
  })
}

# ─── Backup Selection ────────────────────────────────────────────────────────

resource "aws_backup_selection" "main" {
  count = var.enable_backup ? 1 : 0

  name         = "${var.project}-${var.environment}-backup-selection"
  plan_id      = aws_backup_plan.continuous[0].id
  iam_role_arn = aws_iam_role.backup[0].arn

  resources = [
    aws_db_instance.postgres.arn,
    aws_ecs_cluster.cluster.arn,
  ]

  condition {
    string_equals {
      key   = "aws:ResourceTag/Environment"
      value = var.environment
    }
  }
}

# ─── Backup IAM Role ─────────────────────────────────────────────────────────

resource "aws_iam_role" "backup" {
  count = var.enable_backup ? 1 : 0

  name = "${var.project}-${var.environment}-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "backup.amazonaws.com"
      }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "backup" {
  count = var.enable_backup ? 1 : 0

  role       = aws_iam_role.backup[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "backup_restore" {
  count = var.enable_backup ? 1 : 0

  role       = aws_iam_role.backup[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

# ─── RDS Read Replica in DR Region ──────────────────────────────────────────

resource "aws_db_instance" "postgres_replica" {
  provider = aws.dr_region

  identifier              = "${var.project}-${var.environment}-postgres-replica"
  replicate_source_db     = aws_db_instance.postgres.arn
  instance_class          = var.db_instance_class
  auto_minor_version_upgrade = true
  publicly_accessible     = false
  skip_final_snapshot     = var.environment != "production"
  storage_encrypted       = true
  kms_key_id              = var.enable_kms_encryption ? aws_kms_key.dr_region[0].arn : null

  # Backup configuration
  backup_retention_period = var.db_backup_retention_period
  backup_window           = var.db_backup_window

  # Enable automated backups in replica
  copy_tags_to_snapshot = true

  tags = merge(local.common_tags, {
    Name   = "${var.project}-${var.environment}-postgres-replica"
    Region = var.dr_region
    Role   = "read-replica"
  })
}

# ─── S3 Cross-Region Replication ─────────────────────────────────────────────

resource "aws_s3_bucket" "assets_replica" {
  provider = aws.dr_region

  bucket = "${var.project}-${var.environment}-assets-replica"

  tags = merge(local.common_tags, {
    Name   = "${var.project}-${var.environment}-assets-replica"
    Region = var.dr_region
  })
}

resource "aws_s3_bucket_versioning" "assets_replica" {
  provider = aws.dr_region

  bucket = aws_s3_bucket.assets_replica.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_replication_configuration" "assets" {
  depends_on = [aws_s3_bucket_versioning.assets_replica]

  role   = aws_iam_role.s3_replication.arn
  bucket = aws_s3_bucket.assets.id

  rule {
    id       = "replicate-all"
    status   = "Enabled"
    priority = 1

    filter {}

    destination {
      bucket        = aws_s3_bucket.assets_replica.arn
      storage_class = "STANDARD_IA"

      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }

      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }
    }

    delete_marker_replication {
      status = "Enabled"
    }
  }
}

resource "aws_s3_bucket" "assets" {
  bucket = "${var.project}-${var.environment}-assets"

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-assets"
  })
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_iam_role" "s3_replication" {
  name = "${var.project}-${var.environment}-s3-replication"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "s3.amazonaws.com"
      }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "s3_replication" {
  name = "${var.project}-${var.environment}-s3-replication-policy"
  role = aws_iam_role.s3_replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Effect = "Allow"
        Resource = [
          aws_s3_bucket.assets.arn
        ]
      },
      {
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Effect = "Allow"
        Resource = [
          "${aws_s3_bucket.assets.arn}/*"
        ]
      },
      {
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Effect = "Allow"
        Resource = [
          "${aws_s3_bucket.assets_replica.arn}/*"
        ]
      }
    ]
  })
}

# ─── Route53 Health Checks and Failover ──────────────────────────────────────

resource "aws_route53_health_check" "primary" {
  fqdn              = aws_lb.main.dns_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-primary-health"
  })
}

# ─── KMS Key in DR Region ────────────────────────────────────────────────────

resource "aws_kms_key" "dr_region" {
  count = var.enable_kms_encryption ? 1 : 0

  provider                = aws.dr_region
  description             = "${var.project}-${var.environment} DR encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = merge(local.common_tags, {
    Name   = "${var.project}-${var.environment}-kms-dr"
    Region = var.dr_region
  })
}

# ─── Disaster Recovery Runbook Automation ────────────────────────────────────

resource "aws_lambda_function" "dr_failover" {
  filename      = "${path.module}/../scripts/dr-failover.zip"
  function_name = "${var.project}-${var.environment}-dr-failover"
  role          = aws_iam_role.dr_failover_lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 300

  environment {
    variables = {
      PRIMARY_REGION     = var.aws_region
      DR_REGION          = var.dr_region
      RDS_REPLICA_ID     = aws_db_instance.postgres_replica.id
      CLUSTER_NAME       = aws_ecs_cluster.cluster.name
      SNS_TOPIC_ARN      = aws_sns_topic.alerts.arn
    }
  }

  tags = merge(local.common_tags, {
    Name    = "${var.project}-${var.environment}-dr-failover"
    Purpose = "Disaster Recovery Automation"
  })
}

resource "aws_iam_role" "dr_failover_lambda" {
  name = "${var.project}-${var.environment}-dr-failover-lambda"

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

resource "aws_iam_role_policy" "dr_failover_lambda" {
  name = "${var.project}-${var.environment}-dr-failover-policy"
  role = aws_iam_role.dr_failover_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds:PromoteReadReplica",
          "rds:DescribeDBInstances",
          "rds:ModifyDBInstance",
          "route53:ChangeResourceRecordSets",
          "route53:GetHealthCheckStatus",
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "sns:Publish",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

# ─── CloudWatch Alarm for DR Failover ────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "dr_trigger" {
  alarm_name          = "${var.project}-${var.environment}-dr-trigger"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Maximum"
  threshold           = var.ecs_desired_count
  alarm_description   = "Trigger DR failover if all hosts unhealthy for 3 minutes"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.dr_alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = merge(local.common_tags, {
    Purpose = "DR Automation"
  })
}

resource "aws_sns_topic" "dr_alerts" {
  name              = "${var.project}-${var.environment}-dr-alerts"
  kms_master_key_id = var.enable_kms_encryption ? aws_kms_key.main[0].id : null

  tags = merge(local.common_tags, {
    Name    = "${var.project}-${var.environment}-dr-alerts"
    Purpose = "Disaster Recovery Notifications"
  })
}

# ─── AWS Provider for DR Region ──────────────────────────────────────────────

provider "aws" {
  alias  = "dr_region"
  region = var.dr_region
}
