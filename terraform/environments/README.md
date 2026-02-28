# Terraform Environment Files

This directory holds operator-specific Terraform variable files.

Use the shipped examples as templates:

```bash
cp terraform/environments/development.tfvars.example terraform/environments/development.tfvars
cp terraform/environments/staging.tfvars.example terraform/environments/staging.tfvars
cp terraform/environments/production.tfvars.example terraform/environments/production.tfvars
```

Important notes:

- The file name matches the `Makefile` `ENV` value.
- The Terraform `environment` variable inside the file must still be one of `dev`, `staging`, or `production`.
- These `.tfvars` files are intentionally gitignored because they contain environment-specific and potentially sensitive values.
