output "vault_servers_ips" {
  value       = module.vault.servers_private_ips
  description = "Vault server private IP addresses"
}
