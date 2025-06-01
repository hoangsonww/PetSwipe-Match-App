terraform {
  required_providers {
    aws   = { source = "hashicorp/aws" }
  }
  required_version = ">= 1.2"
}

provider "aws" {
  region = var.aws_region
}

# ------------------------------------------------------
# 1. KMS key for Vault auto‐unseal (no placeholders)
# ------------------------------------------------------
resource "aws_kms_key" "vault_auto_unseal" {
  description             = "KMS key used by Vault for auto‐unseal"
  deletion_window_in_days = 7

  tags = {
    Name        = "petswipe-vault-auto-unseal-key"
    Environment = "production"
  }
}

resource "aws_kms_alias" "vault_auto_unseal_alias" {
  name          = "alias/petswipe-vault"
  target_key_id = aws_kms_key.vault_auto_unseal.key_id
}


# ------------------------------------------------------
# 2. Security Group for Vault servers
# ------------------------------------------------------
resource "aws_security_group" "vault_sg" {
  name        = "vault-sg"
  description = "Allow Vault API (8200), gossip (8201), and Consul (8500) traffic"
  vpc_id      = var.vpc_id

  # Vault HTTP API
  ingress {
    from_port   = 8200
    to_port     = 8200
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Vault HTTP API"
  }

  # Vault cluster gossip
  ingress {
    from_port   = 8201
    to_port     = 8201
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Vault cluster gossip"
  }

  # Consul HTTP (for Vault storage backend)
  ingress {
    from_port   = 8500
    to_port     = 8500
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Consul HTTP (storage backend)"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "vault-sg"
    Environment = "production"
  }
}


# ------------------------------------------------------
# 3. Launch Vault cluster via official HashiCorp module
#    (auto‐unseal with AWS KMS, no placeholders)
# ------------------------------------------------------
module "vault" {
  source  = "hashicorp/vault/aws"
  version = "0.5.0"

  cluster_name   = "petswipe-vault"
  num_instances  = var.vault_cluster_size
  instance_type  = var.instance_type

  vpc_id             = var.vpc_id
  subnet_ids         = var.private_subnet_ids
  security_group_ids = [aws_security_group.vault_sg.id]

  # Use Consul as storage backend
  consul = {
    address       = join(",", var.consul_server_ips)
    scheme        = "http"
    acl_token     = var.consul_acl_token
    path          = "vault/"
    service_check = {
      name     = "Vault Health Check"
      interval = "10s"
    }
  }

  # Auto‐unseal with AWS KMS (replaces initial_root_token placeholder)
  auto_unseal = {
    type       = "awskms"
    kms_key_id = aws_kms_key.vault_auto_unseal.key_id
    region     = var.aws_region
  }

  # Instruct the module to initialize Vault after launch
  initialize = true

  tags = {
    Project = "PetSwipe"
    Role    = "vault-server"
  }
}


# ------------------------------------------------------
# 4. Expose Vault outputs: private IPs, root token, unseal keys
# ------------------------------------------------------
output "vault_private_ips" {
  description = "List of Vault server private IPs"
  value       = module.vault.servers_private_ips
}

output "vault_root_token" {
  description = "Vault Root Token (store this securely!)"
  value       = module.vault.root_token
  sensitive   = true
}

output "vault_unseal_keys_b64" {
  description = "Vault Unseal Keys (base64‐encoded), sensitive"
  value       = module.vault.unseal_keys_b64
  sensitive   = true
}
