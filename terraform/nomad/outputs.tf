output "nomad_servers" {
  value       = module.nomad.server_private_ips
  description = "Nomad server private IP addresses"
}

output "nomad_clients" {
  value       = module.nomad.client_private_ips
  description = "Nomad client private IP addresses"
}
