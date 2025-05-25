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
