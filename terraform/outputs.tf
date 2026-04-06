output "rds_endpoint" {
  value = aws_db_instance.postgres.address
}

output "static_bucket_url" {
  value = aws_s3_bucket.static.website_endpoint
}

output "uploads_bucket_name" {
  value = aws_s3_bucket.uploads.bucket
}

output "backend_ecr_uri" {
  value = aws_ecr_repository.backend.repository_url
}

output "frontend_ecr_uri" {
  value = aws_ecr_repository.frontend.repository_url
}

output "ecs_cluster" {
  value = aws_ecs_cluster.cluster.id
}

output "ecs_service_backend" {
  value = aws_ecs_service.backend.name
}

output "cloudfront_domain" {
  value = try(aws_cloudfront_distribution.static[0].domain_name, "")
}

# ─── Datadog Outputs ─────────────────────────────────────────────────────────

output "datadog_forwarder_arn" {
  description = "Datadog log forwarder Lambda ARN"
  value       = var.enable_datadog ? aws_cloudformation_stack.datadog_forwarder[0].outputs["DatadogForwarderArn"] : null
}

output "datadog_dashboard_url" {
  description = "Datadog overview dashboard URL"
  value       = var.enable_datadog ? "https://app.${var.datadog_site}/dashboard/${datadog_dashboard.overview[0].id}" : null
}

output "datadog_availability_slo_id" {
  description = "Datadog availability SLO ID"
  value       = var.enable_datadog ? datadog_service_level_objective.availability[0].id : null
}

output "datadog_latency_slo_id" {
  description = "Datadog latency SLO ID"
  value       = var.enable_datadog ? datadog_service_level_objective.latency[0].id : null
}

output "datadog_synthetics_health_id" {
  description = "Datadog synthetics /health test public ID"
  value       = var.enable_datadog ? datadog_synthetics_test.api_health[0].id : null
}

output "datadog_synthetics_ready_id" {
  description = "Datadog synthetics /ready test public ID"
  value       = var.enable_datadog ? datadog_synthetics_test.api_ready[0].id : null
}
