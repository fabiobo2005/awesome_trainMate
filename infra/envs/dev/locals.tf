resource "random_string" "suffix" {
  length  = 5
  upper   = false
  special = false
  numeric = true
}

locals {
  sanitized_prefix        = lower(replace(var.name_prefix, "/[^a-z0-9-]/", ""))
  sanitized_prefix_nodash = lower(replace(local.sanitized_prefix, "-", ""))
  unique_suffix           = random_string.suffix.result

  acr_name              = substr("${local.sanitized_prefix_nodash}${var.environment}${local.unique_suffix}", 0, 50)
  key_vault_name        = substr("${local.sanitized_prefix_nodash}${var.environment}kv${local.unique_suffix}", 0, 24)
  mysql_server_name     = substr("${local.sanitized_prefix}-${var.environment}-mysql-${local.unique_suffix}", 0, 63)
  static_web_app_name   = substr("${local.sanitized_prefix}-${var.environment}-swa-${local.unique_suffix}", 0, 40)
  api_container_name    = substr("${local.sanitized_prefix}-${var.environment}-api-cg", 0, 63)
  ai_container_name     = substr("${local.sanitized_prefix}-${var.environment}-ai-cg", 0, 63)
  backend_vnet_name     = "vnet-${local.sanitized_prefix}-${var.environment}-backend"
  data_ai_vnet_name     = "vnet-${local.sanitized_prefix}-${var.environment}-data-ai"
  mysql_private_dns     = "privatelink.mysql.database.azure.com"
  backend_workspace     = "law-${local.sanitized_prefix}-${var.environment}-backend"
  data_ai_workspace     = "law-${local.sanitized_prefix}-${var.environment}-data-ai"
  frontend_workspace    = "law-${local.sanitized_prefix}-${var.environment}-frontend"
  backend_app_insights  = "appi-${local.sanitized_prefix}-${var.environment}-api"
  ai_app_insights       = "appi-${local.sanitized_prefix}-${var.environment}-ai"
  frontend_app_insights = "appi-${local.sanitized_prefix}-${var.environment}-frontend"

  api_image = "${azurerm_container_registry.shared.login_server}/trainmate-api:${var.container_image_tag}"
  ai_image  = "${azurerm_container_registry.shared.login_server}/trainmate-ai:${var.container_image_tag}"
}

