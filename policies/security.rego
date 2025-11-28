package security

# Security Policy Rules for PetSwipe
# Enforces security best practices and compliance requirements

# Deny root users in containers
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.securityContext.runAsNonRoot
    msg = sprintf("Container %v must run as non-root user", [container.name])
}

# Require read-only root filesystem
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.securityContext.readOnlyRootFilesystem
    msg = sprintf("Container %v must use read-only root filesystem", [container.name])
}

# Deny host network
deny[msg] {
    input.kind == "Deployment"
    input.spec.template.spec.hostNetwork == true
    msg = "Deployments cannot use host network"
}

# Deny host PID
deny[msg] {
    input.kind == "Deployment"
    input.spec.template.spec.hostPID == true
    msg = "Deployments cannot use host PID namespace"
}

# Deny host IPC
deny[msg] {
    input.kind == "Deployment"
    input.spec.template.spec.hostIPC == true
    msg = "Deployments cannot use host IPC namespace"
}

# Require specific capabilities to be dropped
required_dropped_capabilities := ["ALL"]

deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not capabilities_dropped(container)
    msg = sprintf("Container %v must drop ALL capabilities", [container.name])
}

capabilities_dropped(container) {
    dropped := container.securityContext.capabilities.drop
    required := required_dropped_capabilities[_]
    dropped[_] == required
}

# Deny dangerous capabilities
dangerous_capabilities := ["SYS_ADMIN", "NET_ADMIN", "SYS_MODULE"]

deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    cap := container.securityContext.capabilities.add[_]
    cap == dangerous_capabilities[_]
    msg = sprintf("Container %v cannot add dangerous capability: %v", [container.name, cap])
}

# Require secrets to be mounted as volumes (not env vars)
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    env := container.env[_]
    env.valueFrom.secretKeyRef
    msg = sprintf("Container %v: secrets must be mounted as volumes, not environment variables", [container.name])
}

# Validate ingress TLS configuration
deny[msg] {
    input.kind == "Ingress"
    input.metadata.labels.environment == "production"
    not input.spec.tls
    msg = "Production ingress must use TLS"
}

# Require security annotations
required_security_annotations := {
    "seccomp.security.alpha.kubernetes.io/pod": "runtime/default",
    "container.apparmor.security.beta.kubernetes.io": "runtime/default"
}

deny[msg] {
    input.kind == "Deployment"
    input.metadata.labels.environment == "production"
    annotation := required_security_annotations[key]
    not input.spec.template.metadata.annotations[key]
    msg = sprintf("Missing required security annotation: %v", [key])
}

# Validate service account
deny[msg] {
    input.kind == "Deployment"
    input.spec.template.spec.serviceAccountName == "default"
    msg = "Deployments must not use default service account"
}

# Require pod disruption budget for production
deny[msg] {
    input.kind == "Deployment"
    input.metadata.labels.environment == "production"
    not has_pod_disruption_budget(input.metadata.name)
    msg = sprintf("Production deployment %v must have a PodDisruptionBudget", [input.metadata.name])
}

# Note: This would need to be enriched with actual PDB data
has_pod_disruption_budget(name) {
    # This would check against a list of existing PDBs
    # Simplified for this example
    false
}

# Validate network policies
deny[msg] {
    input.kind == "Deployment"
    input.metadata.labels.environment == "production"
    not has_network_policy(input.metadata.name)
    msg = sprintf("Production deployment %v must have a NetworkPolicy", [input.metadata.name])
}

# Note: This would need to be enriched with actual NetworkPolicy data
has_network_policy(name) {
    # This would check against a list of existing NetworkPolicies
    # Simplified for this example
    false
}

# Require encryption for persistent volumes
deny[msg] {
    input.kind == "PersistentVolumeClaim"
    input.metadata.labels.environment == "production"
    not input.spec.storageClassName
    msg = "Production PVCs must specify storageClassName"
}

deny[msg] {
    input.kind == "PersistentVolumeClaim"
    input.metadata.labels.environment == "production"
    not input.metadata.annotations["encrypted"]
    msg = "Production PVCs must be encrypted"
}
