variable "tenant_id" {
  type        = string
  description = "Azure tenant ID"
}

variable "subscription_frontend" {
  type        = string
  description = "Subscription ID for frontend tier"
}

variable "subscription_backend" {
  type        = string
  description = "Subscription ID for backend tier"
}

variable "subscription_data_ai" {
  type        = string
  description = "Subscription ID for data+ai tier"
}

variable "location" {
  type        = string
  description = "Azure region"
  default     = "canadacentral"
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "dev"
}

variable "name_prefix" {
  type        = string
  description = "Short prefix for resource naming"
  default     = "trainmate"
}

variable "cost_center" {
  type        = string
  description = "Tag: CostCenter"
}

variable "owner" {
  type        = string
  description = "Tag: Owner"
}

variable "availability_zone" {
  type        = string
  description = "Preferred availability zone where supported."
  default     = "1"
}

variable "required_tags" {
  type        = list(string)
  description = "Tags that must be present across resource groups and resources."
  default = [
    "CostCenter",
    "Environment",
    "Owner",
    "Workload",
    "Application",
    "Tier"
  ]
}

variable "backend_vnet_address_space" {
  type        = list(string)
  description = "Address space for backend VNet."
  default     = ["10.10.0.0/16"]
}

variable "backend_aci_subnet_prefix" {
  type        = string
  description = "Subnet prefix for backend ACI."
  default     = "10.10.1.0/24"
}

variable "data_ai_vnet_address_space" {
  type        = list(string)
  description = "Address space for data-ai VNet."
  default     = ["10.20.0.0/16"]
}

variable "data_ai_aci_subnet_prefix" {
  type        = string
  description = "Subnet prefix for data-ai ACI."
  default     = "10.20.1.0/24"
}

variable "data_ai_mysql_subnet_prefix" {
  type        = string
  description = "Delegated subnet prefix for MySQL Flexible Server."
  default     = "10.20.2.0/24"
}

variable "platform_admin_object_id" {
  type        = string
  description = "Optional Entra object ID for initial Key Vault administrator RBAC assignment."
  default     = ""
}

variable "key_vault_soft_delete_retention_days" {
  type        = number
  description = "Soft-delete retention days for Key Vault."
  default     = 90
}

variable "mysql_admin_username" {
  type        = string
  description = "MySQL admin username."
}

variable "mysql_admin_password" {
  type        = string
  description = "MySQL admin password."
  sensitive   = true
}

variable "mysql_version" {
  type        = string
  description = "MySQL engine version."
  default     = "8.0.21"
}

variable "mysql_sku_name" {
  type        = string
  description = "MySQL Flexible Server SKU."
  default     = "GP_Standard_D2ds_v4"
}

variable "mysql_backup_retention_days" {
  type        = number
  description = "Backup retention in days for MySQL Flexible Server."
  default     = 7
}

variable "mysql_database_name" {
  type        = string
  description = "Default database name for TrainMate."
  default     = "trainmate"
}

variable "container_image_tag" {
  type        = string
  description = "Tag to use for API and AI container images."
  default     = "latest"
}

variable "api_cpu" {
  type        = number
  description = "CPU requested for the API container."
  default     = 1
}

variable "api_memory" {
  type        = number
  description = "Memory (GB) requested for the API container."
  default     = 2
}

variable "api_rate_limit_window_ms" {
  type        = number
  description = "Window size for API global rate limiting in milliseconds."
  default     = 60000
}

variable "api_rate_limit_max_requests" {
  type        = number
  description = "Maximum requests allowed per IP during one API rate limit window."
  default     = 120
}

variable "ai_cpu" {
  type        = number
  description = "CPU requested for the AI container."
  default     = 1
}

variable "ai_memory" {
  type        = number
  description = "Memory (GB) requested for the AI container."
  default     = 2
}

variable "acr_sku" {
  type        = string
  description = "SKU for Azure Container Registry."
  default     = "Standard"
}

variable "frontend_sku_tier" {
  type        = string
  description = "Azure Static Web App SKU tier."
  default     = "Standard"
}

variable "frontend_sku_size" {
  type        = string
  description = "Azure Static Web App SKU size."
  default     = "Standard"
}

variable "frontend_api_base_url" {
  type        = string
  description = "API base URL exposed to the frontend."
  default     = "https://api.trainmate.local"
}

variable "api_cors_origins" {
  type        = string
  description = "Comma-separated list of allowed origins for API CORS policy."
  default     = "http://localhost:5173"
}

variable "ai_service_base_url" {
  type        = string
  description = "Base URL used by API to reach the AI service."
  default     = "http://localhost:8090"
}
