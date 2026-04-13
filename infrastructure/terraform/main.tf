terraform {
  required_version = ">= 1.7.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.110"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Remote state — update storage account details after bootstrapping
  backend "azurerm" {
    resource_group_name  = "rg-tfstate"
    storage_account_name = "stftstate<your-suffix>"
    container_name       = "tfstate"
    key                  = "saas-demo.tfstate"
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

# ── Resource group
resource "azurerm_resource_group" "main" {
  name     = "rg-${var.app_name}-${var.environment}"
  location = var.location

  tags = local.tags
}

# ── Random suffix for globally unique names
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

locals {
  suffix = random_string.suffix.result
  tags = {
    environment = var.environment
    app         = var.app_name
    managed_by  = "terraform"
  }
}

# ── Monitoring (must be created first — other modules reference its key)
module "monitoring" {
  source              = "../modules/monitoring"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  app_name            = var.app_name
  environment         = var.environment
  tags                = local.tags
}

# ── Azure SQL
module "sql" {
  source              = "../modules/sql"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  app_name            = var.app_name
  environment         = var.environment
  suffix              = local.suffix
  sql_admin_user      = var.sql_admin_user
  sql_admin_password  = var.sql_admin_password
  tags                = local.tags
}

# ── App Service (backend)
module "app_service" {
  source                   = "../modules/app-service"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = var.location
  app_name                 = var.app_name
  environment              = var.environment
  suffix                   = local.suffix
  db_server                = module.sql.server_fqdn
  db_name                  = module.sql.database_name
  db_user                  = var.sql_admin_user
  db_password              = var.sql_admin_password
  jwt_secret               = var.jwt_secret
  appinsights_key          = module.monitoring.instrumentation_key
  appinsights_conn_string  = module.monitoring.connection_string
  frontend_url             = var.frontend_url
  tags                     = local.tags
}
