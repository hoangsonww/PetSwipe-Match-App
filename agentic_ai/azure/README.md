# Azure Deployment Configuration

This directory contains Azure deployment configurations for the Agentic AI pipeline.

## Deployment Options

### 1. Azure Container Apps (Recommended)
- Fully managed serverless containers
- Built-in auto-scaling
- HTTPS ingress support
- Event-driven architecture

### 2. Azure Kubernetes Service (AKS)
- Full Kubernetes control
- Advanced orchestration
- Hybrid cloud capabilities

### 3. Azure Functions
- Serverless compute
- Pay-per-execution model
- Event-driven processing

## Prerequisites

- Azure CLI installed and configured
- Docker installed
- Terraform installed (v1.0+)
- Azure subscription

## Quick Start

### Login to Azure

```bash
az login
az account set --subscription "your-subscription-id"
```

### Using Terraform

```bash
cd azure/terraform
terraform init
terraform plan
terraform apply
```

### Using Azure CLI

```bash
# Create resource group
az group create --name agentic-ai-rg --location eastus

# Deploy Container App
az containerapp create \
  --name agentic-ai-app \
  --resource-group agentic-ai-rg \
  --image your-registry/agentic-ai:latest \
  --target-port 8765 \
  --ingress external \
  --environment agentic-ai-env
```

## Environment Variables

Required environment variables:

```bash
export AZURE_LOCATION=eastus
export OPENAI_API_KEY=your_api_key
export AZURE_SUBSCRIPTION_ID=your_subscription_id
```

## Monitoring

- Application Insights for telemetry
- Azure Monitor for metrics
- Log Analytics for log aggregation
