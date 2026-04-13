# Multi-Tenant SaaS Demo — Azure

A full-stack multi-tenant SaaS demo built with React, Node.js/Express, Azure SQL, deployed on Azure App Service, monitored via Application Insights, provisioned with Terraform, and delivered via Azure DevOps CI/CD.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Client Layer       React SPA (Azure Static Web Apps)   │
├─────────────────────────────────────────────────────────┤
│  API Gateway        Azure API Management (optional)     │
├─────────────────────────────────────────────────────────┤
│  Application Layer  Node.js/Express (Azure App Service) │
├─────────────────────────────────────────────────────────┤
│  Data Layer         Azure SQL DB (multi-tenant)         │
├─────────────────────────────────────────────────────────┤
│  Monitoring         Azure Application Insights          │
├─────────────────────────────────────────────────────────┤
│  Infrastructure     Terraform + Azure DevOps CI/CD      │
└─────────────────────────────────────────────────────────┘
```

## Multi-Tenancy Strategy

Uses **shared database, shared schema** with `tenant_id` column on every table.
Row-level isolation is enforced at the middleware layer — every query is automatically
scoped to the authenticated tenant. No cross-tenant data leakage is possible through
normal API calls.

## Project Structure

```
saas-demo/
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/     # Shared UI components
│   │   ├── pages/          # Route-level pages
│   │   ├── services/       # API client (Axios)
│   │   └── hooks/          # Custom React hooks
│   └── package.json
├── backend/                # Node.js/Express API
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── middleware/      # Auth, tenant, telemetry
│   │   ├── models/         # DB models (mssql)
│   │   └── config/         # App config, DB connection
│   └── package.json
├── infrastructure/
│   ├── terraform/          # Root Terraform config
│   └── modules/            # Reusable TF modules
│       ├── app-service/
│       ├── sql/
│       └── monitoring/
└── .azuredevops/           # Azure DevOps YAML pipelines
    ├── ci.yml
    └── cd.yml
```

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- Azure SQL or SQL Server (local via Docker)
- Azure CLI (for deployment)

### 1. Backend
```bash
cd backend
cp .env.example .env        # fill in your values
npm install
npm run db:migrate          # create tables
npm run dev
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Deployment

### 1. Provision Infrastructure
```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars   # fill in values
terraform init
terraform plan
terraform apply
```

### 2. Configure Azure DevOps
1. Create a new Azure DevOps project
2. Import this repo
3. Create a service connection named `azure-service-connection`
4. Create pipelines from `.azuredevops/ci.yml` and `.azuredevops/cd.yml`
5. Set pipeline variables (see `.azuredevops/cd.yml` for variable list)

## Environment Variables

### Backend
| Variable | Description |
|---|---|
| `PORT` | Server port (default 3001) |
| `NODE_ENV` | `development` or `production` |
| `DB_SERVER` | Azure SQL server hostname |
| `DB_NAME` | Database name |
| `DB_USER` | SQL user |
| `DB_PASSWORD` | SQL password |
| `JWT_SECRET` | Secret for signing JWTs |
| `APPINSIGHTS_KEY` | Application Insights instrumentation key |

### Frontend
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |
