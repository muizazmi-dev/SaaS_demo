variable "resource_group_name" {}
variable "location"            {}
variable "app_name"            {}
variable "environment"         {}
variable "tags"                { type = map(string) }

# Log Analytics workspace — backing store for Application Insights
resource "azurerm_log_analytics_workspace" "main" {
  name                = "law-${var.app_name}-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "PerGB2018"
  retention_in_days   = var.environment == "prod" ? 90 : 30
  tags                = var.tags
}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = "appi-${var.app_name}-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "Node.JS"
  tags                = var.tags
}

# Alert — HTTP 5xx error rate > 5% over 5 minutes
resource "azurerm_monitor_metric_alert" "http5xx" {
  name                = "alert-5xx-${var.app_name}-${var.environment}"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_application_insights.main.id]
  description         = "HTTP 5xx rate exceeded threshold"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "microsoft.insights/components"
    metric_name      = "requests/failed"
    aggregation      = "Count"
    operator         = "GreaterThan"
    threshold        = 10
  }

  tags = var.tags
}

# Alert — response time P95 > 3s
resource "azurerm_monitor_metric_alert" "slow_requests" {
  name                = "alert-latency-${var.app_name}-${var.environment}"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_application_insights.main.id]
  description         = "P95 response time exceeded 3 seconds"
  severity            = 3
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "microsoft.insights/components"
    metric_name      = "requests/duration"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 3000
  }

  tags = var.tags
}

output "instrumentation_key" {
  value     = azurerm_application_insights.main.instrumentation_key
  sensitive = true
}

output "connection_string" {
  value     = azurerm_application_insights.main.connection_string
  sensitive = true
}

output "portal_url" {
  value = "https://portal.azure.com/#resource${azurerm_application_insights.main.id}/overview"
}

output "app_id" {
  value = azurerm_application_insights.main.app_id
}
