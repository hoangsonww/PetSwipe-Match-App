# Terraform Infrastructure

This directory contains Terraform configurations and modules to bootstrap your HashiCorp stack (Consul, Nomad, Vault) and any shared infrastructure. A `Dockerfile` is provided to run Terraform in a reproducible container.

---

## 📁 Layout

```

terraform/
├── Dockerfile               # Container for Terraform CLI
├── provider.tf              # Provider & backend configuration
├── main.tf                  # Root module (e.g. networking, IAM, remote‐state)
├── outputs.tf               # Root outputs
├── consul/                  # Consul cluster module
│   ├── variables.tf
│   ├── main.tf
│   └── outputs.tf
├── nomad/                   # Nomad cluster module
│   ├── variables.tf
│   ├── main.tf
│   └── outputs.tf
└── vault/                   # Vault cluster module
├── variables.tf
├── main.tf
└── outputs.tf

```

---

## 🚀 Prerequisites

- **Terraform** v1.0+
- **AWS CLI v2** (or other cloud CLI) configured with credentials
- **Docker** (optional, if you prefer containerized Terraform)
- A remote‐state backend (e.g. S3 + DynamoDB) configured in `provider.tf`

---

## 🛠️ Quickstart

1. **Build the Terraform container** (optional)

   ```bash
   cd terraform
   docker build -t terraform-cli .
   ```

2. **Initialize & plan**

- **Locally**

  ```bash
  terraform init
  terraform plan
  ```

- **With Docker**

  ```bash
  docker run --rm -v "$(pwd)":/workspace -w /workspace terraform-cli \
    terraform init
  docker run --rm -v "$(pwd)":/workspace -w /workspace terraform-cli \
    terraform plan
  ```

3. **Apply**

   ```bash
   terraform apply
   ```

   This will:

- Provision any root‐level resources (VPCs, IAM roles, remote‐state)
- Instantiate the **consul**, **nomad**, and **vault** modules

---

## 📦 Modules

Each subdirectory is a standalone Terraform module:

- **consul/**

  - Bootstraps a Consul cluster (servers + clients, autoscaling, security groups)
  - Variables: cluster size, instance types, networking
  - Outputs: Consul endpoints, join tokens

- **nomad/**

  - Provisions a Nomad cluster (server & client pools)
  - Variables: desired count, instance sizing, ACL keys
  - Outputs: Nomad server addresses

- **vault/**

  - Deploys a Vault HA cluster (init, unseal policies, auto‐unseal config)
  - Variables: node count, storage backend, seal settings
  - Outputs: Vault address, root token (sensitive)

---

## 📝 Variables & Outputs

- **Root module** (`variables.tf` in top-level) holds common settings:

  - `aws_region`, `environment`, `tags`, remote‐state config, etc.

- **Module variables** live in each `*/variables.tf`.
- **All outputs** are declared in `*/outputs.tf` so you can reference them in downstream tooling.

---

## 🔄 Workflows & Tips

- **Targeted changes**

  ```bash
  # e.g. only update Vault
  terraform apply -target=module.vault
  ```

- **Environments**
  Use Terraform workspaces (e.g. `dev`, `staging`, `prod`) or duplicate the root directory with different backend configs.
- **Destroy**

  ```bash
  terraform destroy
  ```

- **State locking**
  Ensure your backend supports locking (DynamoDB for S3 backend).

---

## 🤝 Contributing

1. Create a feature branch
2. Lint & format your `.tf` files (`terraform fmt && terraform validate`)
3. Open a PR for review

---

Happy provisioning! 🚀
