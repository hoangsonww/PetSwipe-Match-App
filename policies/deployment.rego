package deployment

# Deployment Policy Rules for PetSwipe
# Validates deployment configurations against best practices

# Deny deployments without health checks
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.livenessProbe
    msg = sprintf("Container %v must have a liveness probe", [container.name])
}

deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.readinessProbe
    msg = sprintf("Container %v must have a readiness probe", [container.name])
}

# Require resource limits
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.resources.limits
    msg = sprintf("Container %v must specify resource limits", [container.name])
}

deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.resources.requests
    msg = sprintf("Container %v must specify resource requests", [container.name])
}

# Require minimum replicas for production
deny[msg] {
    input.kind == "Deployment"
    input.metadata.labels.environment == "production"
    input.spec.replicas < 2
    msg = "Production deployments must have at least 2 replicas"
}

# Require specific labels
required_labels := ["app", "environment", "version", "team"]

deny[msg] {
    input.kind == "Deployment"
    label := required_labels[_]
    not input.metadata.labels[label]
    msg = sprintf("Deployment must have label: %v", [label])
}

# Deny privileged containers
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    container.securityContext.privileged == true
    msg = sprintf("Container %v cannot run in privileged mode", [container.name])
}

# Require image from approved registries
approved_registries := [
    "ghcr.io/hoangsonww",
    "public.ecr.aws/petswipe"
]

deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not image_from_approved_registry(container.image)
    msg = sprintf("Container %v uses image from unapproved registry: %v", [container.name, container.image])
}

image_from_approved_registry(image) {
    registry := approved_registries[_]
    startswith(image, registry)
}

# Require image tags (no :latest in production)
deny[msg] {
    input.kind == "Deployment"
    input.metadata.labels.environment == "production"
    container := input.spec.template.spec.containers[_]
    endswith(container.image, ":latest")
    msg = sprintf("Container %v cannot use :latest tag in production", [container.name])
}

# Validate rollout strategy
deny[msg] {
    input.kind == "Deployment"
    input.metadata.labels.environment == "production"
    strategy := input.spec.strategy
    strategy.type == "Recreate"
    msg = "Production deployments cannot use Recreate strategy"
}

# Validate rolling update parameters
deny[msg] {
    input.kind == "Deployment"
    input.metadata.labels.environment == "production"
    strategy := input.spec.strategy
    strategy.type == "RollingUpdate"
    max_unavailable := strategy.rollingUpdate.maxUnavailable
    to_number(max_unavailable) > 1
    msg = "Production deployments must maintain high availability (maxUnavailable <= 1)"
}

# Validate annotations for monitoring
deny[msg] {
    input.kind == "Deployment"
    input.metadata.labels.environment == "production"
    not input.metadata.annotations["prometheus.io/scrape"]
    msg = "Production deployments must enable Prometheus scraping"
}

# Helper function
to_number(str) = num {
    num := to_number(str)
} else = num {
    num := str
}
