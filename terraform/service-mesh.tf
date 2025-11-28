# ═══════════════════════════════════════════════════════════════════════════
# AWS App Mesh - Service Mesh for Microservices Traffic Management
# Advanced traffic routing, observability, and resilience patterns
# ═══════════════════════════════════════════════════════════════════════════

# ─── App Mesh Core Resources ─────────────────────────────────────────────────

resource "aws_appmesh_mesh" "main" {
  count = var.enable_service_mesh ? 1 : 0

  name = "${var.project}-${var.environment}-mesh"

  spec {
    egress_filter {
      type = "ALLOW_ALL"
    }

    service_discovery {
      ip_preference = "IPv4_PREFERRED"
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-mesh"
  })
}

# ─── Virtual Gateway for External Traffic ────────────────────────────────────

resource "aws_appmesh_virtual_gateway" "main" {
  count = var.enable_service_mesh ? 1 : 0

  name      = "${var.project}-${var.environment}-gateway"
  mesh_name = aws_appmesh_mesh.main[0].id

  spec {
    listener {
      port_mapping {
        port     = 443
        protocol = "http"
      }

      health_check {
        protocol            = "http"
        path                = "/health"
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout_millis      = 2000
        interval_millis     = 5000
      }

      tls {
        mode = "STRICT"
        certificate {
          acm {
            certificate_arn = var.acm_certificate_arn
          }
        }
      }
    }

    logging {
      access_log {
        file {
          path = "/dev/stdout"
          format {
            json {
              key   = "timestamp"
              value = "%START_TIME%"
            }
            json {
              key   = "method"
              value = "%REQ(:METHOD)%"
            }
            json {
              key   = "path"
              value = "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
            }
            json {
              key   = "status"
              value = "%RESPONSE_CODE%"
            }
            json {
              key   = "duration"
              value = "%DURATION%"
            }
          }
        }
      }
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-gateway"
  })
}

# ─── Virtual Nodes for Services ──────────────────────────────────────────────

resource "aws_appmesh_virtual_node" "backend" {
  count = var.enable_service_mesh ? 1 : 0

  name      = "${var.project}-${var.environment}-backend-vnode"
  mesh_name = aws_appmesh_mesh.main[0].id

  spec {
    listener {
      port_mapping {
        port     = 5001
        protocol = "http"
      }

      health_check {
        protocol            = "http"
        path                = "/health"
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout_millis      = 2000
        interval_millis     = 5000
      }

      timeout {
        http {
          idle {
            unit  = "s"
            value = 60
          }
          per_request {
            unit  = "s"
            value = 30
          }
        }
      }

      outlier_detection {
        max_ejection_percent = 50
        max_server_errors    = 5
        base_ejection_duration {
          unit  = "s"
          value = 30
        }
        interval {
          unit  = "s"
          value = 10
        }
      }
    }

    service_discovery {
      aws_cloud_map {
        service_name   = aws_service_discovery_service.backend[0].name
        namespace_name = aws_service_discovery_private_dns_namespace.main.name
      }
    }

    logging {
      access_log {
        file {
          path = "/dev/stdout"
          format {
            json {
              key   = "timestamp"
              value = "%START_TIME%"
            }
            json {
              key   = "method"
              value = "%REQ(:METHOD)%"
            }
            json {
              key   = "path"
              value = "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
            }
            json {
              key   = "status"
              value = "%RESPONSE_CODE%"
            }
            json {
              key   = "upstream_cluster"
              value = "%UPSTREAM_CLUSTER%"
            }
            json {
              key   = "duration"
              value = "%DURATION%"
            }
          }
        }
      }
    }

    backend {
      virtual_service {
        virtual_service_name = aws_appmesh_virtual_service.database_proxy[0].name
      }
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-backend-vnode"
  })
}

resource "aws_appmesh_virtual_node" "frontend" {
  count = var.enable_service_mesh ? 1 : 0

  name      = "${var.project}-${var.environment}-frontend-vnode"
  mesh_name = aws_appmesh_mesh.main[0].id

  spec {
    listener {
      port_mapping {
        port     = 3000
        protocol = "http"
      }

      health_check {
        protocol            = "http"
        path                = "/api/health"
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout_millis      = 2000
        interval_millis     = 5000
      }
    }

    service_discovery {
      aws_cloud_map {
        service_name   = aws_service_discovery_service.frontend[0].name
        namespace_name = aws_service_discovery_private_dns_namespace.main.name
      }
    }

    backend {
      virtual_service {
        virtual_service_name = aws_appmesh_virtual_service.backend[0].name
      }
    }

    logging {
      access_log {
        file {
          path = "/dev/stdout"
        }
      }
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-frontend-vnode"
  })
}

# ─── Virtual Services ────────────────────────────────────────────────────────

resource "aws_appmesh_virtual_service" "backend" {
  count = var.enable_service_mesh ? 1 : 0

  name      = "backend.${var.project}.local"
  mesh_name = aws_appmesh_mesh.main[0].id

  spec {
    provider {
      virtual_router {
        virtual_router_name = aws_appmesh_virtual_router.backend[0].name
      }
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-backend-vsvc"
  })
}

resource "aws_appmesh_virtual_service" "database_proxy" {
  count = var.enable_service_mesh ? 1 : 0

  name      = "database.${var.project}.local"
  mesh_name = aws_appmesh_mesh.main[0].id

  spec {
    provider {
      virtual_node {
        virtual_node_name = aws_appmesh_virtual_node.database_proxy[0].name
      }
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-database-vsvc"
  })
}

# ─── Virtual Routers for Traffic Management ──────────────────────────────────

resource "aws_appmesh_virtual_router" "backend" {
  count = var.enable_service_mesh ? 1 : 0

  name      = "${var.project}-${var.environment}-backend-vrouter"
  mesh_name = aws_appmesh_mesh.main[0].id

  spec {
    listener {
      port_mapping {
        port     = 5001
        protocol = "http"
      }
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-backend-vrouter"
  })
}

# ─── Routes with Advanced Traffic Policies ───────────────────────────────────

resource "aws_appmesh_route" "backend_weighted" {
  count = var.enable_service_mesh ? 1 : 0

  name                = "${var.project}-${var.environment}-backend-weighted-route"
  mesh_name           = aws_appmesh_mesh.main[0].id
  virtual_router_name = aws_appmesh_virtual_router.backend[0].name

  spec {
    http_route {
      match {
        prefix = "/"
      }

      retry_policy {
        http_retry_events = [
          "server-error",
          "gateway-error"
        ]
        tcp_retry_events = [
          "connection-error"
        ]
        max_retries = 3
        per_retry_timeout {
          unit  = "s"
          value = 5
        }
      }

      timeout {
        idle {
          unit  = "s"
          value = 60
        }
        per_request {
          unit  = "s"
          value = 30
        }
      }

      action {
        weighted_target {
          virtual_node = aws_appmesh_virtual_node.backend[0].name
          weight       = 90
        }

        # Canary deployment target (10% traffic)
        weighted_target {
          virtual_node = aws_appmesh_virtual_node.backend_canary[0].name
          weight       = 10
        }
      }
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-backend-weighted-route"
  })
}

# ─── Canary Virtual Node ─────────────────────────────────────────────────────

resource "aws_appmesh_virtual_node" "backend_canary" {
  count = var.enable_service_mesh ? 1 : 0

  name      = "${var.project}-${var.environment}-backend-canary-vnode"
  mesh_name = aws_appmesh_mesh.main[0].id

  spec {
    listener {
      port_mapping {
        port     = 5001
        protocol = "http"
      }

      health_check {
        protocol            = "http"
        path                = "/health"
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout_millis      = 2000
        interval_millis     = 5000
      }
    }

    service_discovery {
      aws_cloud_map {
        service_name   = "${aws_service_discovery_service.backend[0].name}-canary"
        namespace_name = aws_service_discovery_private_dns_namespace.main.name
      }
    }

    logging {
      access_log {
        file {
          path = "/dev/stdout"
        }
      }
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-backend-canary-vnode"
  })
}

# ─── Database Proxy Virtual Node ─────────────────────────────────────────────

resource "aws_appmesh_virtual_node" "database_proxy" {
  count = var.enable_service_mesh ? 1 : 0

  name      = "${var.project}-${var.environment}-database-proxy-vnode"
  mesh_name = aws_appmesh_mesh.main[0].id

  spec {
    listener {
      port_mapping {
        port     = 5432
        protocol = "tcp"
      }

      timeout {
        tcp {
          idle {
            unit  = "s"
            value = 300
          }
        }
      }

      connection_pool {
        tcp {
          max_connections = 100
        }
      }
    }

    service_discovery {
      dns {
        hostname = aws_db_instance.postgres.address
      }
    }

    logging {
      access_log {
        file {
          path = "/dev/stdout"
        }
      }
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-database-proxy-vnode"
  })
}

# ─── Service Discovery for App Mesh Services ─────────────────────────────────

resource "aws_service_discovery_service" "backend" {
  count = var.enable_service_mesh ? 1 : 0

  name = "backend"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-backend-discovery"
  })
}

resource "aws_service_discovery_service" "frontend" {
  count = var.enable_service_mesh ? 1 : 0

  name = "frontend"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-frontend-discovery"
  })
}

# ─── Gateway Routes ──────────────────────────────────────────────────────────

resource "aws_appmesh_gateway_route" "api" {
  count = var.enable_service_mesh ? 1 : 0

  name                 = "${var.project}-${var.environment}-api-gateway-route"
  mesh_name            = aws_appmesh_mesh.main[0].id
  virtual_gateway_name = aws_appmesh_virtual_gateway.main[0].name

  spec {
    http_route {
      match {
        prefix = "/api"
      }

      action {
        target {
          virtual_service {
            virtual_service_name = aws_appmesh_virtual_service.backend[0].name
          }
        }

        rewrite {
          prefix {
            default_prefix = "ENABLED"
          }
        }
      }
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-api-gateway-route"
  })
}

# ─── Envoy Proxy Configuration ───────────────────────────────────────────────

resource "aws_ssm_parameter" "envoy_config" {
  count = var.enable_service_mesh ? 1 : 0

  name        = "/${var.project}/${var.environment}/envoy/config"
  description = "Envoy proxy configuration for App Mesh"
  type        = "String"

  value = jsonencode({
    admin = {
      access_log_path = "/dev/stdout"
      address = {
        socket_address = {
          address   = "0.0.0.0"
          port_value = 9901
        }
      }
    }
    tracing = {
      http = {
        name = "envoy.tracers.xray"
        typed_config = {
          "@type"          = "type.googleapis.com/envoy.config.trace.v3.XRayConfig"
          daemon_endpoint  = "127.0.0.1:2000"
          segment_name     = "${var.project}-${var.environment}"
          sampling_rule_manifest = {
            version = 2
            rules = [
              {
                description  = "Sample all requests"
                service_name = "*"
                http_method  = "*"
                url_path     = "*"
                fixed_target = 1
                rate         = 0.05
              }
            ]
          }
        }
      }
    }
  })

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-envoy-config"
  })
}

# ─── CloudWatch Metrics for Service Mesh ─────────────────────────────────────

resource "aws_cloudwatch_log_group" "appmesh" {
  count = var.enable_service_mesh ? 1 : 0

  name              = "/aws/appmesh/${var.project}-${var.environment}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.enable_kms_encryption ? aws_kms_key.main[0].arn : null

  tags = merge(local.common_tags, {
    Name = "/aws/appmesh/${var.project}-${var.environment}"
  })
}

# ─── Outputs ─────────────────────────────────────────────────────────────────

output "appmesh_mesh_id" {
  description = "App Mesh ID"
  value       = var.enable_service_mesh ? aws_appmesh_mesh.main[0].id : null
}

output "appmesh_virtual_gateway_name" {
  description = "Virtual Gateway name"
  value       = var.enable_service_mesh ? aws_appmesh_virtual_gateway.main[0].name : null
}

output "appmesh_backend_virtual_service" {
  description = "Backend virtual service name"
  value       = var.enable_service_mesh ? aws_appmesh_virtual_service.backend[0].name : null
}
