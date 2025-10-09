# ─────────────────────────────────────────────────────────────────────────────
# PetSwipe Main Terraform Configuration
# Production-Grade Infrastructure as Code
# ─────────────────────────────────────────────────────────────────────────────

locals {
  # Resource naming with environment prefix
  db_instance_id      = "${var.project}-${var.environment}-db"
  static_bucket       = "${var.project}-static-${var.environment}-${data.aws_caller_identity.current.account_id}"
  uploads_bucket      = "${var.project}-uploads-${var.environment}-${data.aws_caller_identity.current.account_id}"
  ecs_cluster_name    = "${var.project}-${var.environment}-cluster"
  ecs_service_name    = "${var.project}-${var.environment}-backend-svc"
  ecs_task_family     = "${var.project}-${var.environment}-backend"
  alb_name            = "${var.project}-${var.environment}-alb"
  target_group_name   = "${var.project}-${var.environment}-tg"
  log_group_name      = "/aws/ecs/${var.project}-${var.environment}"
  kms_key_alias       = "alias/${var.project}-${var.environment}-key"

  # Common tags
  common_tags = merge(var.common_tags, {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "Terraform"
  })
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# ═══════════════════════════════════════════════════════════════════════════
# KMS Encryption Key
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_kms_key" "main" {
  count = var.enable_kms_encryption ? 1 : 0

  description             = "KMS key for ${var.project} ${var.environment} encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = merge(local.common_tags, {
    Name = local.kms_key_alias
  })
}

resource "aws_kms_alias" "main" {
  count = var.enable_kms_encryption ? 1 : 0

  name          = local.kms_key_alias
  target_key_id = aws_kms_key.main[0].key_id
}

# ═══════════════════════════════════════════════════════════════════════════
# RDS PostgreSQL Database (Production-Grade)
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-${var.environment}-db-subnet"
  subnet_ids = var.subnet_ids

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-db-subnet"
  })
}

resource "aws_db_parameter_group" "postgres" {
  name   = "${var.project}-${var.environment}-postgres15"
  family = "postgres15"

  # Performance tuning parameters
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4096}"  # 25% of RAM
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory/2048}"  # 50% of RAM
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "2097152"  # 2GB
  }

  parameter {
    name  = "checkpoint_completion_target"
    value = "0.9"
  }

  parameter {
    name  = "wal_buffers"
    value = "16384"  # 16MB
  }

  parameter {
    name  = "default_statistics_target"
    value = "100"
  }

  parameter {
    name  = "random_page_cost"
    value = "1.1"  # SSD optimization
  }

  parameter {
    name  = "effective_io_concurrency"
    value = "200"
  }

  parameter {
    name  = "work_mem"
    value = "10485"  # 10MB
  }

  parameter {
    name  = "min_wal_size"
    value = "2048"  # 2GB
  }

  parameter {
    name  = "max_wal_size"
    value = "8192"  # 8GB
  }

  # Logging parameters
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries > 1s
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  tags = local.common_tags
}

resource "aws_db_instance" "postgres" {
  # Identification
  identifier     = local.db_instance_id
  engine         = "postgres"
  engine_version = var.db_engine_version

  # Instance configuration
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = var.enable_kms_encryption
  kms_key_id        = var.enable_kms_encryption ? aws_kms_key.main[0].arn : null

  # Database configuration
  db_name  = var.project
  username = var.db_username
  password = var.db_password
  port     = 5432

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = var.security_group_ids
  publicly_accessible    = false
  multi_az               = var.db_multi_az

  # Parameter and option groups
  parameter_group_name = aws_db_parameter_group.postgres.name

  # Backup configuration
  backup_retention_period = var.db_backup_retention_period
  backup_window           = var.db_backup_window
  maintenance_window      = var.db_maintenance_window
  skip_final_snapshot     = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${local.db_instance_id}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  # Deletion protection
  deletion_protection = var.environment == "production" ? true : false

  # Performance Insights
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled    = true
  performance_insights_retention_period = 7

  # Enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = merge(local.common_tags, {
    Name = local.db_instance_id
    Backup = "Required"
  })

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [password]
  }
}

# RDS Enhanced Monitoring IAM Role
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.project}-${var.environment}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# RDS Read Replica (for scaling read operations)
resource "aws_db_instance" "postgres_replica" {
  count = var.environment == "production" ? 1 : 0

  identifier          = "${local.db_instance_id}-replica"
  replicate_source_db = aws_db_instance.postgres.identifier
  instance_class      = var.db_instance_class
  storage_encrypted   = var.enable_kms_encryption

  # Performance Insights
  performance_insights_enabled = true

  # Enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  skip_final_snapshot = true

  tags = merge(local.common_tags, {
    Name = "${local.db_instance_id}-replica"
    Role = "Read Replica"
  })
}

# ─── S3 BUCKETS ──────────────────────────────────
resource "aws_s3_bucket" "static" {
  bucket = local.static_bucket
  acl    = "public-read"

  website {
    index_document = "index.html"
  }
}

resource "aws_s3_bucket" "uploads" {
  bucket = local.uploads_bucket
  acl    = "private"
}

# ─── ECR ─────────────────────────────────────────
resource "aws_ecr_repository" "backend" {
  name = "${var.project}-backend"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "frontend" {
  name = "${var.project}-frontend"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
}

# ─── ECS & IAM ──────────────────────────────────
resource "aws_ecs_cluster" "cluster" {
  name = "${var.project}-cluster"
}

resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project}-ecs-task-exec-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_exec_assume.json
}

data "aws_iam_policy_document" "ecs_task_exec_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_exec_policy" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu    = "512"
  memory = "1024"
  execution_role_arn = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${aws_ecr_repository.backend.repository_url}:latest"
      essential = true
      portMappings = [{
        containerPort = 5001
        hostPort      = 5001
      }]
      environment = [
        { name = "DB_HOST",  value = aws_db_instance.postgres.address },
        { name = "DB_NAME",  value = var.project },
        { name = "DB_USER",  value = var.db_username },
        { name = "DB_PASS",  value = var.db_password },
        { name = "DB_SSL",   value = "false" }
      ]
    }
  ])
}

resource "aws_ecs_service" "backend" {
  name            = "${var.project}-backend-svc"
  cluster         = aws_ecs_cluster.cluster.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.subnet_ids
    security_groups = var.security_group_ids
    assign_public_ip = true
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecs_task_exec_policy
  ]
}

# ─── CLOUD FRONT (OPTIONAL) ──────────────────────
resource "aws_cloudfront_distribution" "static" {
  count = var.cf_enabled ? 1 : 0

  origin {
    domain_name = aws_s3_bucket.static.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.static.id}"
    s3_origin_config {}
  }

  enabled             = true
  default_root_object = "index.html"
  price_class         = var.cf_price_class

  default_cache_behavior {
    allowed_methods  = ["GET","HEAD"]
    cached_methods   = ["GET","HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.static.id}"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
