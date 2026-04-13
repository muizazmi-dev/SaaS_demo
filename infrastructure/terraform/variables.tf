variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "southeastasia"
}

variable "app_name" {
  description = "Short application name used in resource naming"
  type        = string
  default     = "saasdemo"
}

variable "environment" {
  description = "Deployment environment: dev | staging | prod"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "sql_admin_user" {
  description = "Azure SQL administrator username"
  type        = string
  default     = "sqladmin"
}

variable "sql_admin_password" {
  description = "Azure SQL administrator password"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret (at least 32 chars)"
  type        = string
  sensitive   = true
}

variable "frontend_url" {
  description = "Frontend URL for CORS allow-list (e.g. https://app.yourdomain.com)"
  type        = string
  default     = "https://localhost:5173"
}
