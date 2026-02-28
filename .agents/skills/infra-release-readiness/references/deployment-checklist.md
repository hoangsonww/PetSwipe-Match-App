# Deployment Checklist

- `make preflight`
- `make tf-preflight ENV=production`
- `make k8s-preflight`
- `make k8s-render`
- `make k8s-render-prod`
- `make release-bundle`

Report clearly whether failures are due to:

- missing local tooling
- placeholder values
- missing operator files
- actual manifest or script defects
