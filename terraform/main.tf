locals {
  db_instance_id = "${var.project}-db"
  static_bucket  = "${var.project}-static-${data.aws_caller_identity.current.account_id}"
  uploads_bucket = "${var.project}-uploads-${data.aws_caller_identity.current.account_id}"
}

data "aws_caller_identity" "current" {}

# ─── RDS ─────────────────────────────────────────
resource "aws_db_instance" "postgres" {
  identifier         = local.db_instance_id
  engine             = "postgres"
  engine_version     = "15"
  instance_class     = "db.t3.micro"
  allocated_storage  = 20
  name               = var.project
  username           = var.db_username
  password           = var.db_password
  vpc_security_group_ids = var.security_group_ids
  skip_final_snapshot = true
  publicly_accessible = false
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
