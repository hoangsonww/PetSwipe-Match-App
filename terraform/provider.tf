terraform {
  required_version = ">= 1.3.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    # Datadog provider — gated by var.enable_datadog in datadog.tf
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.39"
    }
  }

  # S3 backend for state management
  # Configure with: terraform init -backend-config=backend.hcl
  backend "s3" {
    bucket         = "petswipe-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "petswipe-terraform-locks"

    # KMS encryption for state file
    kms_key_id = "alias/terraform-state-key"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "Terraform"
      Repository  = "https://github.com/hoangsonww/PetSwipe-Match-App"
      CostCenter  = "Engineering"
    }
  }

  # Assume role for cross-account access (if needed)
  # assume_role {
  #   role_arn = "arn:aws:iam::ACCOUNT_ID:role/TerraformRole"
  # }
}

# ─── Datadog Provider ─────────────────────────────────────────────────────────
# Configured here; resources live in datadog.tf and are gated by enable_datadog.
# Supply api_key/app_key via TF_VAR_datadog_api_key / TF_VAR_datadog_app_key
# or a .tfvars file (never commit keys to source).
provider "datadog" {
  api_key  = var.datadog_api_key
  app_key  = var.datadog_app_key
  api_url  = "https://api.${var.datadog_site}/"
  validate = var.enable_datadog
}

# Provider alias for DR region
provider "aws" {
  alias  = "dr"
  region = var.dr_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = "${var.environment}-dr"
      ManagedBy   = "Terraform"
      Repository  = "https://github.com/hoangsonww/PetSwipe-Match-App"
      CostCenter  = "Engineering"
    }
  }
}
