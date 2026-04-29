# Terraform infrastructure

This folder contains the TrainMate Azure IaC.

## Layout

- `envs/dev`: environment composition for 3 subscriptions (frontend/backend/data-ai)
- `modules/resource_group`: reusable resource group module
- `modules/required_tags_policy`: required-tag deny policy definitions + assignments

## What Phase 2 now provisions

- Resource groups in all 3 subscriptions
- Networking baseline:
  - backend VNet/subnet for API ACI + NAT Gateway
  - data-ai VNet/subnets for AI ACI + MySQL delegated subnet + NAT Gateway
  - cross-subscription VNet peering
  - private DNS zone for MySQL (`privatelink.mysql.database.azure.com`) linked to both VNets
- Security and identity:
  - shared ACR in backend subscription
  - user-assigned managed identities for API and AI container groups
  - `AcrPull` assignments for both identities
  - Key Vault (RBAC-enabled) in data-ai subscription
  - Key Vault Secrets User role for API/AI identities
- Monitoring:
  - Log Analytics + Application Insights for frontend/backend/data-ai
- Compute and data:
  - Static Web App (frontend tier)
  - ACI for Node API (backend tier)
  - ACI for Python AI (data-ai tier)
  - MySQL Flexible Server with private access + delegated subnet
  - MySQL database bootstrap
- Governance:
  - custom deny policies requiring mandatory tags on resource groups and resources
  - policy assignments in each of the 3 subscriptions

## Availability zone note

The config sets `availability_zone = "1"` on resources that support explicit zone pinning
(for example: MySQL Flexible Server, NAT Gateway, Public IP, ACI).
Services like Static Web Apps do not expose explicit AZ pinning in this Terraform resource.

