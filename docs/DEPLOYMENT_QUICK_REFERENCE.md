# PetSwipe Deployment Quick Reference

## Preflight

```bash
cp .env.production.example .env.production
bash scripts/deploy-preflight.sh .env.production
```

## Terraform Bootstrap

```bash
cp terraform/backend.hcl.example terraform/backend.hcl
cp terraform/environments/production.tfvars.example terraform/environments/production.tfvars

make tf-preflight ENV=production
make tf-init
make tf-plan ENV=production
make tf-apply ENV=production
```

## Production Docker Compose

```bash
docker compose --env-file .env.production \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  up -d --wait
```

## Release Bundle

```bash
make release-bundle
```

## Kubernetes

```bash
kubectl kustomize k8s/base
kubectl kustomize k8s/overlays/production
make k8s-preflight
kubectl apply -k k8s/overlays/production
```

## GHCR Image Publish

```bash
export GITHUB_USERNAME=your-org
export GITHUB_TOKEN=your-token
export IMAGE_TAG=stable
export NEXT_PUBLIC_API_URL=https://api.petswipe.example.com/api

./upload_to_ghcr.sh
```

## Blue-Green Deployment

```bash
export IMAGE_TAG=v1.2.3
export AUTO_PROMOTE=false
./scripts/blue-green-deploy.sh
```

## Canary Deployment

```bash
export IMAGE_TAG=v1.2.3
export CANARY_STAGES=5,10,25,50,100
export STAGE_DURATION=300
./scripts/canary-deploy.sh
```

## Emergency Rollback

### Blue-Green

```bash
aws elbv2 modify-listener \
  --listener-arn $LISTENER_ARN \
  --default-actions Type=forward,TargetGroupArn=$BLUE_TG_ARN
```

### Canary

```bash
./scripts/canary-deploy.sh --rollback
```

## Health Checks

```bash
aws ecs describe-services \
  --cluster petswipe-production-cluster \
  --services petswipe-production-blue
```

```bash
aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN
```

```bash
aws logs tail /aws/ecs/petswipe-production --follow
```
