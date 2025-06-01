output "consul_servers" {
  value       = module.consul.server_private_ips
  description = "Consul server private IP addresses"
}

output "consul_acl_token" {
  value       = module.consul.acl_bootstrap_token
  description = "Consul ACL bootstrap token (sensitive)"
  sensitive   = true
}
