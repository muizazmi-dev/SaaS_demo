output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "app_service_url" {
  description = "Backend API URL"
  value       = module.app_service.app_url
}

output "sql_server_fqdn" {
  description = "Azure SQL server FQDN"
  value       = module.sql.server_fqdn
}

output "appinsights_instrumentation_key" {
  description = "Application Insights key — add to backend .env"
  value       = module.monitoring.instrumentation_key
  sensitive   = true
}

output "appinsights_portal_url" {
  description = "Deep link to Application Insights in Azure Portal"
  value       = module.monitoring.portal_url
}
