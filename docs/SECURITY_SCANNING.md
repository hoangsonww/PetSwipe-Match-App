# Security Scanning

This repo includes lightweight secret detection and infrastructure scanning.
These checks are non-intrusive and do not change application behavior.

## Quick Secret Scan

Run the helper script:

```bash
./scripts/secret-scan.sh
```

This runs:
- `detect-secrets` against `.secrets.baseline`
- `gitleaks` with default rules

## Python Secrets Scan (Tox)

If you use tox:

```bash
tox -e secrets
```

## Infra Security Scan

The existing Makefile target runs tfsec and trivy:

```bash
make security-scan
```

## Notes

- Update `.secrets.baseline` when you intentionally add new secrets for testing.
- Never commit real credentials. Use AWS Secrets Manager or Vault for production.
