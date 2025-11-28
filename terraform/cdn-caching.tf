# ═══════════════════════════════════════════════════════════════════════════
# Advanced CDN and Edge Caching with CloudFront
# Global content delivery with intelligent caching and invalidation
# ═══════════════════════════════════════════════════════════════════════════

# ─── CloudFront Distribution ─────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "main" {
  count = var.enable_cdn ? 1 : 0

  enabled             = true
  is_ipv6_enabled     = true
  http_version        = "http2and3"
  price_class         = var.cdn_price_class
  comment             = "${var.project}-${var.environment} CDN"
  default_root_object = "index.html"
  web_acl_id          = var.enable_waf ? aws_wafv2_web_acl.main[0].arn : null

  # Origin for API (ALB)
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "alb-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_read_timeout    = 60
      origin_keepalive_timeout = 5
    }

    origin_shield {
      enabled              = true
      origin_shield_region = var.aws_region
    }

    custom_header {
      name  = "X-Origin-Verify"
      value = random_password.origin_verify[0].result
    }
  }

  # Origin for Static Assets (S3)
  origin {
    domain_name = aws_s3_bucket.static.bucket_regional_domain_name
    origin_id   = "s3-origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main[0].cloudfront_access_identity_path
    }

    origin_shield {
      enabled              = true
      origin_shield_region = var.aws_region
    }
  }

  # Default cache behavior (Static assets)
  default_cache_behavior {
    target_origin_id       = "s3-origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]

    cache_policy_id            = aws_cloudfront_cache_policy.static_assets[0].id
    origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.cors_s3.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security[0].id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite[0].arn
    }
  }

  # API cache behavior
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "alb-origin"
    viewer_protocol_policy = "https-only"
    compress               = true
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]

    cache_policy_id            = aws_cloudfront_cache_policy.api[0].id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.api[0].id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security[0].id
  }

  # Images cache behavior (longer TTL)
  ordered_cache_behavior {
    path_pattern           = "/images/*"
    target_origin_id       = "s3-origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    cache_policy_id            = aws_cloudfront_cache_policy.images[0].id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security[0].id
  }

  # Custom error responses
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }

  # Viewer certificate
  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # Geo restrictions
  restrictions {
    geo_restriction {
      restriction_type = var.cdn_geo_restriction_type
      locations        = var.cdn_geo_restriction_locations
    }
  }

  # Logging
  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.cdn_logs[0].bucket_domain_name
    prefix          = "cdn-logs/"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-cdn"
  })
}

# ─── CloudFront Origin Access Identity ───────────────────────────────────────

resource "aws_cloudfront_origin_access_identity" "main" {
  count = var.enable_cdn ? 1 : 0

  comment = "${var.project}-${var.environment} OAI"
}

# ─── Cache Policies ──────────────────────────────────────────────────────────

resource "aws_cloudfront_cache_policy" "static_assets" {
  count = var.enable_cdn ? 1 : 0

  name        = "${var.project}-${var.environment}-static-assets"
  comment     = "Cache policy for static assets"
  min_ttl     = 0
  default_ttl = 86400    # 1 day
  max_ttl     = 31536000 # 1 year

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_cache_policy" "api" {
  count = var.enable_cdn ? 1 : 0

  name        = "${var.project}-${var.environment}-api"
  comment     = "Cache policy for API endpoints"
  min_ttl     = 0
  default_ttl = 0     # No caching by default
  max_ttl     = 3600  # 1 hour max

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "all"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Authorization", "CloudFront-Viewer-Country", "Accept"]
      }
    }

    query_strings_config {
      query_string_behavior = "all"
    }
  }
}

resource "aws_cloudfront_cache_policy" "images" {
  count = var.enable_cdn ? 1 : 0

  name        = "${var.project}-${var.environment}-images"
  comment     = "Cache policy for images"
  min_ttl     = 86400     # 1 day
  default_ttl = 604800    # 7 days
  max_ttl     = 31536000  # 1 year

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Accept"]
      }
    }

    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = ["w", "h", "fit"]  # Image manipulation parameters
      }
    }
  }
}

# ─── Origin Request Policies ─────────────────────────────────────────────────

resource "aws_cloudfront_origin_request_policy" "api" {
  count = var.enable_cdn ? 1 : 0

  name    = "${var.project}-${var.environment}-api"
  comment = "Origin request policy for API"

  cookies_config {
    cookie_behavior = "all"
  }

  headers_config {
    header_behavior = "allViewer"
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}

# ─── Response Headers Policies ───────────────────────────────────────────────

resource "aws_cloudfront_response_headers_policy" "security" {
  count = var.enable_cdn ? 1 : 0

  name    = "${var.project}-${var.environment}-security"
  comment = "Security headers policy"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    content_security_policy {
      content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
      override                = true
    }
  }

  cors_config {
    access_control_allow_credentials = true
    access_control_allow_headers {
      items = ["*"]
    }
    access_control_allow_methods {
      items = ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    }
    access_control_allow_origins {
      items = ["*"]
    }
    access_control_max_age_sec = 3600
    origin_override            = true
  }
}

# ─── CloudFront Functions ────────────────────────────────────────────────────

resource "aws_cloudfront_function" "url_rewrite" {
  count = var.enable_cdn ? 1 : 0

  name    = "${var.project}-${var.environment}-url-rewrite"
  runtime = "cloudfront-js-1.0"
  comment = "URL rewrite for SPA routing"
  publish = true
  code    = file("${path.module}/../cloudfront-functions/url-rewrite.js")
}

# ─── Cache Invalidation Lambda ───────────────────────────────────────────────

resource "aws_lambda_function" "cache_invalidation" {
  count = var.enable_cdn ? 1 : 0

  filename         = "${path.module}/../lambda/cache-invalidation.zip"
  function_name    = "${var.project}-${var.environment}-cache-invalidation"
  role             = aws_iam_role.cache_invalidation[0].arn
  handler          = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/../lambda/cache-invalidation.zip")
  runtime          = "nodejs18.x"
  timeout          = 60
  memory_size      = 256

  environment {
    variables = {
      DISTRIBUTION_ID = aws_cloudfront_distribution.main[0].id
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-cache-invalidation"
  })
}

resource "aws_iam_role" "cache_invalidation" {
  count = var.enable_cdn ? 1 : 0

  name = "${var.project}-${var.environment}-cache-invalidation-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "cache_invalidation" {
  count = var.enable_cdn ? 1 : 0

  name = "${var.project}-${var.environment}-cache-invalidation-policy"
  role = aws_iam_role.cache_invalidation[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
          "cloudfront:ListInvalidations"
        ]
        Resource = aws_cloudfront_distribution.main[0].arn
      }
    ]
  })
}

# ─── S3 Bucket for CDN Logs ──────────────────────────────────────────────────

resource "aws_s3_bucket" "cdn_logs" {
  count = var.enable_cdn ? 1 : 0

  bucket = "${var.project}-${var.environment}-cdn-logs"

  tags = merge(local.common_tags, {
    Name    = "${var.project}-${var.environment}-cdn-logs"
    Purpose = "CloudFront Logs"
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "cdn_logs" {
  count = var.enable_cdn ? 1 : 0

  bucket = aws_s3_bucket.cdn_logs[0].id

  rule {
    id     = "delete-old-logs"
    status = "Enabled"

    expiration {
      days = 90
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }
}

# ─── Random Password for Origin Verification ─────────────────────────────────

resource "random_password" "origin_verify" {
  count = var.enable_cdn ? 1 : 0

  length  = 32
  special = true
}

# ─── Data Sources ────────────────────────────────────────────────────────────

data "aws_cloudfront_origin_request_policy" "cors_s3" {
  name = "Managed-CORS-S3Origin"
}

# ─── Outputs ─────────────────────────────────────────────────────────────────

output "cdn_domain_name" {
  description = "CloudFront distribution domain name"
  value       = var.enable_cdn ? aws_cloudfront_distribution.main[0].domain_name : null
}

output "cdn_distribution_id" {
  description = "CloudFront distribution ID"
  value       = var.enable_cdn ? aws_cloudfront_distribution.main[0].id : null
}
