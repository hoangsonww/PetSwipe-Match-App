terraform {
  required_providers {
    aws    = { source = "hashicorp/aws" }
    consul = { source = "hashicorp/consul", version = "2.7.3" }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "consul" {
  address    = aws_instance.consul_server[0].private_ip
  scheme     = "http"
  datacenter = "dc1"
}

# 1. Security Group for Consul servers
resource "aws_security_group" "consul_sg" {
  name        = "consul-sg"
  description = "Allow 8300-8302, 8400, 8500, 8600"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 8300
    to_port     = 8302
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Consul RPC and Serf"
  }
  ingress {
    from_port   = 8500
    to_port     = 8500
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Consul HTTP API"
  }
  ingress {
    from_port   = 8600
    to_port     = 8600
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Consul DNS"
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 2. Launch Consul Server cluster via official module
module "consul" {
  source  = "hashicorp/consul/aws"
  version = "0.4.0"

  cluster_name        = "petswipe-consul"
  create_servers      = true
  servers             = var.consul_cluster_size
  server_instance_type = var.instance_type

  vpc_id               = var.vpc_id
  subnet_ids           = var.private_subnet_ids

  security_group_ids   = [aws_security_group.consul_sg.id]
  enable_consul_acl    = true

  # Persist data to EBS
  ebs_volume_size = 30

  # Userdata is handled by the module to bootstrap Consul
  tags = {
    Project = "PetSwipe"
    Role    = "consul-server"
  }
}

# 3. Export the Consul server private IPs (for Nomad & Vault)
output "consul_server_private_ips" {
  value       = module.consul.server_private_ips
  description = "Private IPs of Consul servers"
}

output "consul_acl_bootstrap_token" {
  value       = module.consul.acl_bootstrap_token
  description = "Initial Consul ACL token (store securely!)"
  sensitive   = true
}
