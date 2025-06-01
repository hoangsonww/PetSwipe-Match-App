variable "vpc_id" {
  type        = string
  description = "VPC ID where Nomad servers/clients run"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of Private Subnets for Nomad"
}

variable "nomad_server_count" {
  type        = number
  description = "Number of Nomad server nodes"
  default     = 3
}

variable "nomad_client_count" {
  type        = number
  description = "Number of Nomad client nodes"
  default     = 2
}

variable "server_instance_type" {
  type        = string
  description = "EC2 instance type for Nomad servers"
  default     = "t3.medium"
}

variable "client_instance_type" {
  type        = string
  description = "EC2 instance type for Nomad clients"
  default     = "t3.small"
}

variable "consul_server_ips" {
  type        = list(string)
  description = "Consul server IPs for service discovery"
}

variable "consul_acl_token" {
  type        = string
  description = "Consul ACL token (allows Nomad to join)"
  sensitive   = true
}

variable "vault_server_ips" {
  type        = list(string)
  description = "Vault server IPs to configure nomad-agent"
}

variable "vault_root_token" {
  type        = string
  description = "Vault root token or a policy-bound token for Nomad"
  sensitive   = true
}
