# ─────────────────────────────────────────────────────────────────────────────
# Terraform Variables for PetSwipe Infrastructure
# ─────────────────────────────────────────────────────────────────────────────

# ─── Project Configuration ───────────────────────────────────────────────────

variable "project" {
  description = "Project name used for resource naming"
  type        = string
  default     = "petswipe"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

# ─── AWS Configuration ───────────────────────────────────────────────────────

variable "aws_region" {
  description = "Primary AWS region"
  type        = string
  default     = "us-east-1"
}

variable "dr_region" {
  description = "Disaster Recovery AWS region"
  type        = string
  default     = "us-west-2"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# ─── Network Configuration ───────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

variable "subnet_ids" {
  description = "List of subnet IDs for ECS tasks and ALB"
  type        = list(string)
  default     = []
}

variable "security_group_ids" {
  description = "List of security group IDs"
  type        = list(string)
  default     = []
}

# ─── Database Configuration (RDS) ────────────────────────────────────────────

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "petswipe_admin"
  sensitive   = true
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 16
    error_message = "Database password must be at least 16 characters long."
  }
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"

  validation {
    condition     = can(regex("^db\\.", var.db_instance_class))
    error_message = "Instance class must start with 'db.'."
  }
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 100

  validation {
    condition     = var.db_allocated_storage >= 20 && var.db_allocated_storage <= 1000
    error_message = "Allocated storage must be between 20 and 1000 GB."
  }
}

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.4"
}

variable "db_multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = true
}

variable "db_backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30

  validation {
    condition     = var.db_backup_retention_period >= 7 && var.db_backup_retention_period <= 35
    error_message = "Backup retention must be between 7 and 35 days."
  }
}

variable "db_backup_window" {
  description = "Preferred backup window (UTC)"
  type        = string
  default     = "03:00-04:00"
}

variable "db_maintenance_window" {
  description = "Preferred maintenance window (UTC)"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

# ─── ECS Configuration ───────────────────────────────────────────────────────

variable "ecs_task_cpu" {
  description = "CPU units for ECS task (1024 = 1 vCPU)"
  type        = number
  default     = 1024

  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.ecs_task_cpu)
    error_message = "ECS task CPU must be one of: 256, 512, 1024, 2048, 4096."
  }
}

variable "ecs_task_memory" {
  description = "Memory for ECS task in MB"
  type        = number
  default     = 2048

  validation {
    condition     = var.ecs_task_memory >= 512 && var.ecs_task_memory <= 30720
    error_message = "ECS task memory must be between 512 and 30720 MB."
  }
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 4

  validation {
    condition     = var.ecs_desired_count >= 2 && var.ecs_desired_count <= 20
    error_message = "Desired count must be between 2 and 20."
  }
}

variable "ecs_min_capacity" {
  description = "Minimum number of ECS tasks (auto-scaling)"
  type        = number
  default     = 2
}

variable "ecs_max_capacity" {
  description = "Maximum number of ECS tasks (auto-scaling)"
  type        = number
  default     = 20
}

variable "ecs_cpu_target" {
  description = "Target CPU utilization for auto-scaling (%)"
  type        = number
  default     = 70

  validation {
    condition     = var.ecs_cpu_target >= 50 && var.ecs_cpu_target <= 90
    error_message = "CPU target must be between 50 and 90%."
  }
}

variable "ecs_memory_target" {
  description = "Target memory utilization for auto-scaling (%)"
  type        = number
  default     = 80
}

# ─── S3 Configuration ────────────────────────────────────────────────────────

variable "s3_versioning_enabled" {
  description = "Enable versioning for S3 buckets"
  type        = bool
  default     = true
}

variable "s3_lifecycle_enabled" {
  description = "Enable lifecycle rules for S3"
  type        = bool
  default     = true
}

variable "s3_transition_to_ia_days" {
  description = "Days before transitioning to Infrequent Access"
  type        = number
  default     = 90
}

variable "s3_transition_to_glacier_days" {
  description = "Days before transitioning to Glacier"
  type        = number
  default     = 180
}

variable "s3_expiration_days" {
  description = "Days before object expiration (0 = never)"
  type        = number
  default     = 365
}

# ─── CloudFront Configuration ────────────────────────────────────────────────

variable "cf_enabled" {
  description = "Enable CloudFront distribution"
  type        = bool
  default     = true
}

variable "cf_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"

  validation {
    condition = contains([
      "PriceClass_100",
      "PriceClass_200",
      "PriceClass_All"
    ], var.cf_price_class)
    error_message = "Invalid CloudFront price class."
  }
}

variable "cf_min_ttl" {
  description = "Minimum TTL for CloudFront cache (seconds)"
  type        = number
  default     = 0
}

variable "cf_default_ttl" {
  description = "Default TTL for CloudFront cache (seconds)"
  type        = number
  default     = 3600
}

variable "cf_max_ttl" {
  description = "Maximum TTL for CloudFront cache (seconds)"
  type        = number
  default     = 86400
}

# ─── ElastiCache (Redis) Configuration ──────────────────────────────────────

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 2
}

variable "redis_parameter_group_family" {
  description = "Redis parameter group family"
  type        = string
  default     = "redis7"
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

# ─── Monitoring & Logging ────────────────────────────────────────────────────

variable "enable_cloudwatch_logs" {
  description = "Enable CloudWatch Logs"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention period (days)"
  type        = number
  default     = 30

  validation {
    condition = contains([
      1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653
    ], var.log_retention_days)
    error_message = "Invalid log retention period."
  }
}

variable "enable_xray_tracing" {
  description = "Enable AWS X-Ray tracing"
  type        = bool
  default     = true
}

# ─── HashiCorp Stack Configuration ──────────────────────────────────────────

variable "enable_consul" {
  description = "Enable HashiCorp Consul"
  type        = bool
  default     = false
}

variable "enable_vault" {
  description = "Enable HashiCorp Vault"
  type        = bool
  default     = false
}

variable "enable_nomad" {
  description = "Enable HashiCorp Nomad"
  type        = bool
  default     = false
}

variable "consul_version" {
  description = "Consul version"
  type        = string
  default     = "1.17.0"
}

variable "vault_version" {
  description = "Vault version"
  type        = string
  default     = "1.15.0"
}

variable "nomad_version" {
  description = "Nomad version"
  type        = string
  default     = "1.6.0"
}

# ─── Tags ────────────────────────────────────────────────────────────────────

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "PetSwipe"
    ManagedBy   = "Terraform"
    Environment = "production"
  }
}

# ─── Feature Flags ───────────────────────────────────────────────────────────

variable "enable_waf" {
  description = "Enable AWS WAF"
  type        = bool
  default     = true
}

variable "enable_shield" {
  description = "Enable AWS Shield (Standard)"
  type        = bool
  default     = true
}

variable "enable_backup" {
  description = "Enable AWS Backup"
  type        = bool
  default     = true
}

variable "enable_kms_encryption" {
  description = "Enable KMS encryption for all resources"
  type        = bool
  default     = true
}
