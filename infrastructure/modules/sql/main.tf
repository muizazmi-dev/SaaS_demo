variable "resource_group_name" {}
variable "location"            {}
variable "app_name"            {}
variable "environment"         {}
variable "suffix"              {}
variable "sql_admin_user"      {}
variable "sql_admin_password"  { sensitive = true }
variable "tags"                { type = map(string) }

# SQL Server
resource "azurerm_mssql_server" "main" {
  name                         = "sql-${var.app_name}-${var.environment}-${var.suffix}"
  resource_group_name          = var.resource_group_name
  location                     = var.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_user
  administrator_login_password = var.sql_admin_password
  minimum_tls_version          = "1.2"
  tags                         = var.tags

  azuread_administrator {
    # Placeholder — replace with your actual Azure AD admin object ID in tfvars
    login_username = "sqlaadadmin"
    object_id      = "00000000-0000-0000-0000-000000000000"
  }
}

# Allow Azure services to connect (App Service → SQL)
resource "azurerm_mssql_firewall_rule" "azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Database — General Purpose serverless for dev/staging, standard for prod
resource "azurerm_mssql_database" "main" {
  name         = "saas-demo"
  server_id    = azurerm_mssql_server.main.id
  collation    = "SQL_Latin1_General_CP1_CI_AS"
  license_type = "LicenseIncluded"
  tags         = var.tags

  # Serverless tier — auto-pauses when idle (great for dev/demo cost savings)
  sku_name                    = var.environment == "prod" ? "S2" : "GP_S_Gen5_1"
  min_capacity                = var.environment == "prod" ? null : 0.5
  auto_pause_delay_in_minutes = var.environment == "prod" ? null : 60

  # Backup
  short_term_retention_policy {
    retention_days           = var.environment == "prod" ? 35 : 7
    backup_interval_in_hours = 24
  }
}

# Transparent Data Encryption (on by default for Azure SQL — explicit for clarity)
resource "azurerm_mssql_database_transparent_data_encryption" "main" {
  database_id = azurerm_mssql_database.main.id
}

output "server_fqdn" {
  value = azurerm_mssql_server.main.fully_qualified_domain_name
}

output "database_name" {
  value = azurerm_mssql_database.main.name
}

output "server_id" {
  value = azurerm_mssql_server.main.id
}
