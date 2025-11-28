package resource_limits

# Resource Limits Policy for PetSwipe
# Ensures proper resource allocation and prevents resource exhaustion

# CPU limits
max_cpu_limits := {
    "development": "2",
    "staging": "4",
    "production": "8"
}

min_cpu_requests := {
    "development": "0.1",
    "staging": "0.25",
    "production": "0.5"
}

deny[msg] {
    input.kind == "Deployment"
    environment := input.metadata.labels.environment
    container := input.spec.template.spec.containers[_]
    cpu_limit := container.resources.limits.cpu
    max_limit := max_cpu_limits[environment]
    to_millicores(cpu_limit) > to_millicores(max_limit)
    msg = sprintf("Container %v CPU limit %v exceeds maximum %v for %v environment",
        [container.name, cpu_limit, max_limit, environment])
}

deny[msg] {
    input.kind == "Deployment"
    environment := input.metadata.labels.environment
    container := input.spec.template.spec.containers[_]
    cpu_request := container.resources.requests.cpu
    min_request := min_cpu_requests[environment]
    to_millicores(cpu_request) < to_millicores(min_request)
    msg = sprintf("Container %v CPU request %v below minimum %v for %v environment",
        [container.name, cpu_request, min_request, environment])
}

# Memory limits
max_memory_limits := {
    "development": "2Gi",
    "staging": "4Gi",
    "production": "8Gi"
}

min_memory_requests := {
    "development": "128Mi",
    "staging": "256Mi",
    "production": "512Mi"
}

deny[msg] {
    input.kind == "Deployment"
    environment := input.metadata.labels.environment
    container := input.spec.template.spec.containers[_]
    memory_limit := container.resources.limits.memory
    max_limit := max_memory_limits[environment]
    to_bytes(memory_limit) > to_bytes(max_limit)
    msg = sprintf("Container %v memory limit %v exceeds maximum %v for %v environment",
        [container.name, memory_limit, max_limit, environment])
}

deny[msg] {
    input.kind == "Deployment"
    environment := input.metadata.labels.environment
    container := input.spec.template.spec.containers[_]
    memory_request := container.resources.requests.memory
    min_request := min_memory_requests[environment]
    to_bytes(memory_request) < to_bytes(min_request)
    msg = sprintf("Container %v memory request %v below minimum %v for %v environment",
        [container.name, memory_request, min_request, environment])
}

# Ensure requests <= limits
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    cpu_request := container.resources.requests.cpu
    cpu_limit := container.resources.limits.cpu
    to_millicores(cpu_request) > to_millicores(cpu_limit)
    msg = sprintf("Container %v CPU request %v exceeds limit %v",
        [container.name, cpu_request, cpu_limit])
}

deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    memory_request := container.resources.requests.memory
    memory_limit := container.resources.limits.memory
    to_bytes(memory_request) > to_bytes(memory_limit)
    msg = sprintf("Container %v memory request %v exceeds limit %v",
        [container.name, memory_request, memory_limit])
}

# Storage limits
max_storage_requests := {
    "development": "10Gi",
    "staging": "50Gi",
    "production": "100Gi"
}

deny[msg] {
    input.kind == "PersistentVolumeClaim"
    environment := input.metadata.labels.environment
    storage_request := input.spec.resources.requests.storage
    max_request := max_storage_requests[environment]
    to_bytes(storage_request) > to_bytes(max_request)
    msg = sprintf("PVC %v storage request %v exceeds maximum %v for %v environment",
        [input.metadata.name, storage_request, max_request, environment])
}

# Limit number of replicas
max_replicas := {
    "development": 3,
    "staging": 10,
    "production": 50
}

deny[msg] {
    input.kind == "Deployment"
    environment := input.metadata.labels.environment
    replicas := input.spec.replicas
    max_rep := max_replicas[environment]
    replicas > max_rep
    msg = sprintf("Deployment %v replicas %v exceeds maximum %v for %v environment",
        [input.metadata.name, replicas, max_rep, environment])
}

# Helper functions to convert resource values to comparable numbers

to_millicores(cpu) = millicores {
    endswith(cpu, "m")
    millicores := to_number(trim_suffix(cpu, "m"))
} else = millicores {
    millicores := to_number(cpu) * 1000
}

to_bytes(mem) = bytes {
    endswith(mem, "Ki")
    bytes := to_number(trim_suffix(mem, "Ki")) * 1024
} else = bytes {
    endswith(mem, "Mi")
    bytes := to_number(trim_suffix(mem, "Mi")) * 1024 * 1024
} else = bytes {
    endswith(mem, "Gi")
    bytes := to_number(trim_suffix(mem, "Gi")) * 1024 * 1024 * 1024
} else = bytes {
    bytes := to_number(mem)
}

# Validate HPA (Horizontal Pod Autoscaler) configurations
deny[msg] {
    input.kind == "HorizontalPodAutoscaler"
    input.spec.minReplicas < 2
    input.metadata.labels.environment == "production"
    msg = sprintf("HPA %v must have minReplicas >= 2 in production", [input.metadata.name])
}

deny[msg] {
    input.kind == "HorizontalPodAutoscaler"
    environment := input.metadata.labels.environment
    max_rep := max_replicas[environment]
    input.spec.maxReplicas > max_rep
    msg = sprintf("HPA %v maxReplicas %v exceeds limit %v for %v environment",
        [input.metadata.name, input.spec.maxReplicas, max_rep, environment])
}

# Validate resource quotas
deny[msg] {
    input.kind == "ResourceQuota"
    not input.spec.hard
    msg = "ResourceQuota must define hard limits"
}

# Cost optimization: warn about over-provisioning
warn[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    cpu_request := container.resources.requests.cpu
    cpu_limit := container.resources.limits.cpu
    ratio := to_millicores(cpu_limit) / to_millicores(cpu_request)
    ratio > 4
    msg = sprintf("Container %v may be over-provisioned: CPU limit/request ratio is %v",
        [container.name, ratio])
}

warn[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    memory_request := container.resources.requests.memory
    memory_limit := container.resources.limits.memory
    ratio := to_bytes(memory_limit) / to_bytes(memory_request)
    ratio > 4
    msg = sprintf("Container %v may be over-provisioned: Memory limit/request ratio is %v",
        [container.name, ratio])
}
