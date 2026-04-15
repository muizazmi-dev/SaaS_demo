variable "resource_group_name" {}
variable "location"            {}
variable "app_name"            {}
variable "environment"         {}
variable "suffix"              {}
variable "db_server"           {}
variable "db_name"             {}
variable "db_user"             {}
variable "db_password"         { sensitive = true }
variable "jwt_secret"          { sensitive = true }
variable "appinsights_key"     { sensitive = true }
variable "appinsights_conn_string" { sensitive = true }
variable "frontend_url"        {}
variable "tags"                { type = map(string) }

# App Service Plan — B2 is the minimum for always-on + deployment slots
resource "azurerm_service_plan" "main" {
  name                = "asp-${var.app_name}-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = var.environment == "prod" ? "P1v3" : "B2"
  tags                = var.tags
}

# Web App — Node.js 20
resource "azurerm_linux_web_app" "main" {
  name                = "app-${var.app_name}-${var.environment}-${var.suffix}"
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.main.id
  https_only          = true
  tags                = var.tags

  site_config {
    always_on        = true
    health_check_path = "/health"

    application_stack {
      node_version = "18-lts"
    }

    cors {
      allowed_origins     = [var.frontend_url]
      support_credentials = true
    }
  }

  app_settings = {
    NODE_ENV                        = var.environment
    PORT                            = "8080"

    # Database
    DB_SERVER                       = var.db_server
    DB_NAME                         = var.db_name
    DB_USER                         = var.db_user
    DB_PASSWORD                     = var.db_password

    # Auth
    JWT_SECRET                      = var.jwt_secret
    JWT_EXPIRES_IN                  = "7d"

    # CORS
    CORS_ORIGIN                     = var.frontend_url

    # Application Insights
    APPINSIGHTS_KEY                 = var.appinsights_key
    APPLICATIONINSIGHTS_CONNECTION_STRING = var.appinsights_conn_string

    # SCM / deployment
    SCM_DO_BUILD_DURING_DEPLOYMENT  = "true"
    WEBSITE_NODE_DEFAULT_VERSION    = "~20"
  }

  logs {
    application_logs {
      file_system_level = "Information"
    }
    http_logs {
      file_system {
        retention_in_days = 7
        retention_in_mb   = 35
      }
    }
  }

  identity {
    type = "SystemAssigned"
  }
}

# Deployment slot — staging (prod only)
resource "azurerm_linux_web_app_slot" "staging" {
  count          = var.environment == "prod" ? 1 : 0
  name           = "staging"
  app_service_id = azurerm_linux_web_app.main.id
  https_only     = true

  site_config {
    always_on        = false
    health_check_path = "/health"
    application_stack {
      node_version = "18-lts"
    }
  }

  app_settings = azurerm_linux_web_app.main.app_settings
}

output "app_url" {
  value = "https://${azurerm_linux_web_app.main.default_hostname}"
}

output "app_name" {
  value = azurerm_linux_web_app.main.name
}

output "staging_url" {
  value = var.environment == "prod" ? "https://${azurerm_linux_web_app_slot.staging[0].default_hostname}" : null
}
