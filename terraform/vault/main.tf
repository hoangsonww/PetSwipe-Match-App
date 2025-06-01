terraform {
  required_providers {
    aws   = { source = "hashicorp/aws" }
    vault = { source = "hashicorp/vault", version = "3.2.0" }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "vault" {
  address = "http://${var.vault_private_ips[0]}:8200"
  token   = local.initial_root_token
}

locals {
  # We’ll bootstrap Vault once and store the root token in AWS Secrets Manager (or somewhere else).
  initial_root_token = "REPLACE_ME_AFTER_INIT"
}

# 1. Security Group for Vault servers
resource "aws_security_group" "vault_sg" {
  name        = "vault-sg"
  description = "Allow 8200, 8201, and Consul ports"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 8200
    to_port     = 8200
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Vault HTTP API"
  }
  ingress {
    from_port   = 8201
    to_port     = 8201
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Vault cluster gossip"
  }
  ingress {
    from_port   = 8500
    to_port     = 8500
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Consul HTTP (for integrated storage)"
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 2. Launch Vault cluster via official module (uses Consul backend)
module "vault" {
  source  = "hashicorp/vault/aws"
  version = "0.5.0"

  cluster_name        = "petswipe-vault"
  num_instances       = var.vault_cluster_size
  instance_type       = var.instance_type

  vpc_id              = var.vpc_id
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vault_sg.id]

  # Use Consul as storage backend
  consul = {
    address        = join(",", var.consul_server_ips)
    scheme         = "http"
    acl_token      = var.consul_acl_token
    path           = "vault"
    service_check  = {
      name     = "Vault Health Check"
      interval = "10s"
    }
  }

  # Auto-unseal via AWS KMS (optionally)
  # auto_unseal = {
  #   type         = "awskms"
  #   kms_key_id   = aws_kms_key.vault_key.arn
  #   region       = var.aws_region
  # }

  tags = {
    Project = "PetSwipe"
    Role    = "vault-server"
  }
}

# 3. Once Vault is up, you must manually init & unseal (or automate it).
#    For a production setup, you’d use AWS KMS auto-unseal.

# 4. Outputs: IPs of Vault servers
output "vault_private_ips" {
  value       = module.vault.servers_private_ips
  description = "List of Vault server private IPs"
}
