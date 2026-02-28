## Terraform Expectations

These instructions apply inside `terraform/`.

## Structure

- Root Terraform files define the main AWS-oriented infrastructure stack.
- Example operator files live in:
  - `terraform/backend.hcl.example`
  - `terraform/environments/*.tfvars.example`

## Working Agreements

- Do not imply Terraform is ready to apply until the real operator files exist and preflight passes.
- Keep Terraform docs aligned with real init/plan/apply workflow.
- Call out missing tooling or missing operator files clearly.

## Validation

- `make tf-preflight ENV=production`
- `make tf-init ENV=production`
- `make tf-plan ENV=production`
