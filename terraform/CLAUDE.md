# Terraform Memory

## Scope

These instructions apply to work inside `terraform/`.

## Structure

- Main AWS infrastructure is in the root `terraform/` module set.
- Example operator files live at:
  - `terraform/backend.hcl.example`
  - `terraform/environments/development.tfvars.example`
  - `terraform/environments/staging.tfvars.example`
  - `terraform/environments/production.tfvars.example`
- Optional HashiCorp stack modules also exist for Vault, Consul, and Nomad.

## How To Work Here

- Keep operator flows explicit. If real deployment requires copying an example file or replacing placeholders, say so.
- Do not imply Terraform is ready to apply unless the real operator files exist and preflight passes.
- Sync `terraform/README.md` and higher-level deployment docs when workflow expectations change.

## Validation

- `make tf-preflight ENV=production`
- `make tf-init ENV=production`
- `make tf-plan ENV=production`

## Caution

- Avoid casual edits that change infrastructure intent without updating docs and validation guidance.
- If Terraform cannot be executed because tooling or operator files are missing, say that plainly.
