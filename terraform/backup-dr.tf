# ═══════════════════════════════════════════════════════════════════════════
# Automated Backup and Disaster Recovery Testing
# Backup automation, point-in-time recovery, and DR drills
# ═══════════════════════════════════════════════════════════════════════════

# ─── AWS Backup Vault ────────────────────────────────────────────────────────

resource "aws_backup_vault" "main" {
  name        = "${var.project}-${var.environment}-backup-vault"
  kms_key_arn = var.enable_kms_encryption ? aws_kms_key.main[0].arn : null

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-backup-vault"
  })
}

# ─── AWS Backup Plan ─────────────────────────────────────────────────────────

resource "aws_backup_plan" "main" {
  name = "${var.project}-${var.environment}-backup-plan"

  rule {
    rule_name         = "daily-backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 2 * * ? *)"  # 2 AM daily

    lifecycle {
      delete_after = 30  # Keep for 30 days
      cold_storage_after = 7  # Move to cold storage after 7 days
    }

    recovery_point_tags = merge(local.common_tags, {
      BackupType = "daily"
    })
  }

  rule {
    rule_name         = "weekly-backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 ? * SUN *)"  # 3 AM every Sunday

    lifecycle {
      delete_after = 90
      cold_storage_after = 30
    }

    recovery_point_tags = merge(local.common_tags, {
      BackupType = "weekly"
    })
  }

  rule {
    rule_name         = "monthly-backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 4 1 * ? *)"  # 4 AM on 1st of month

    lifecycle {
      delete_after = 365
      cold_storage_after = 90
    }

    recovery_point_tags = merge(local.common_tags, {
      BackupType = "monthly"
    })
  }

  tags = local.common_tags
}

# ─── Backup Selection ────────────────────────────────────────────────────────

resource "aws_backup_selection" "main" {
  name         = "${var.project}-${var.environment}-backup-selection"
  iam_role_arn = aws_iam_role.backup.arn
  plan_id      = aws_backup_plan.main.id

  resources = [
    aws_db_instance.postgres.arn,
    aws_dynamodb_table.sessions.arn,
    aws_efs_file_system.uploads.id,
  ]

  selection_tag {
    type  = "STRINGEQUALS"
    key   = "Backup"
    value = "Required"
  }
}

resource "aws_iam_role" "backup" {
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
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "backup_restore" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

# ─── DR Testing Automation Lambda ────────────────────────────────────────────

resource "aws_lambda_function" "dr_test" {
  filename         = "${path.module}/../lambda/dr-test.zip"
  function_name    = "${var.project}-${var.environment}-dr-test"
  role             = aws_iam_role.dr_test.arn
  handler          = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/../lambda/dr-test.zip")
  runtime          = "python3.11"
  timeout          = 900  # 15 minutes
  memory_size      = 512

  environment {
    variables = {
      BACKUP_VAULT_NAME    = aws_backup_vault.main.name
      TEST_VPC_ID          = var.dr_test_vpc_id
      TEST_SUBNET_IDS      = join(",", var.dr_test_subnet_ids)
      NOTIFICATION_TOPIC   = aws_sns_topic.dr_notifications.arn
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-dr-test"
  })
}

resource "aws_iam_role" "dr_test" {
  name = "${var.project}-${var.environment}-dr-test-role"

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

resource "aws_iam_role_policy" "dr_test" {
  name = "${var.project}-${var.environment}-dr-test-policy"
  role = aws_iam_role.dr_test.id

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
          "backup:ListRecoveryPointsByBackupVault",
          "backup:DescribeBackupVault",
          "backup:StartRestoreJob",
          "backup:DescribeRestoreJob"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "rds:CreateDBInstance",
          "rds:DescribeDBInstances",
          "rds:DeleteDBInstance",
          "rds:RestoreDBInstanceFromDBSnapshot"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.dr_notifications.arn
      }
    ]
  })
}

# ─── SNS Topic for DR Notifications ──────────────────────────────────────────

resource "aws_sns_topic" "dr_notifications" {
  name              = "${var.project}-${var.environment}-dr-notifications"
  kms_master_key_id = var.enable_kms_encryption ? aws_kms_key.main[0].id : null

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-dr-notifications"
  })
}

resource "aws_sns_topic_subscription" "dr_email" {
  topic_arn = aws_sns_topic.dr_notifications.arn
  protocol  = "email"
  endpoint  = var.ops_email
}

# ─── EventBridge Rule for Monthly DR Tests ───────────────────────────────────

resource "aws_cloudwatch_event_rule" "dr_test" {
  name                = "${var.project}-${var.environment}-dr-test"
  description         = "Monthly DR testing"
  schedule_expression = "cron(0 6 1 * ? *)"  # 6 AM on 1st of month

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "dr_test" {
  rule      = aws_cloudwatch_event_rule.dr_test.name
  target_id = "DRTestLambda"
  arn       = aws_lambda_function.dr_test.arn
}

resource "aws_lambda_permission" "dr_test" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.dr_test.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.dr_test.arn
}

# ─── Cross-Region Replication ────────────────────────────────────────────────

resource "aws_backup_vault" "replica" {
  provider    = aws.dr_region
  count       = var.enable_cross_region_backup ? 1 : 0

  name        = "${var.project}-${var.environment}-backup-vault-replica"
  kms_key_arn = var.dr_kms_key_arn

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-backup-vault-replica"
    Type = "DR-Replica"
  })
}

# ─── Outputs ─────────────────────────────────────────────────────────────────

output "backup_vault_arn" {
  description = "Backup vault ARN"
  value       = aws_backup_vault.main.arn
}

output "dr_test_lambda_arn" {
  description = "DR test Lambda ARN"
  value       = aws_lambda_function.dr_test.arn
}
