variable "vpc_id" {
  type        = string
  description = "VPC ID where Vault servers should run"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of Private Subnets for Vault servers"
}

variable "vault_cluster_size" {
  type        = number
  description = "Number of Vault server nodes"
  default     = 2
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type for Vault servers"
  default     = "t3.medium"
}

variable "consul_server_ips" {
  type        = list(string)
  description = "Private IPs of Consul servers (used as storage backend)"
}

variable "consul_acl_token" {
  type        = string
  description = "Consul ACL Token with permissions to create KV paths"
  default     = ""
  sensitive   = true
}
