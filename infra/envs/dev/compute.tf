resource "azurerm_static_web_app" "frontend" {
  name                               = local.static_web_app_name
  resource_group_name                = module.rg_frontend.name
  location                           = var.frontend_location
  sku_tier                           = var.frontend_sku_tier
  sku_size                           = var.frontend_sku_size
  preview_environments_enabled       = true
  public_network_access_enabled      = true
  configuration_file_changes_enabled = true
  app_settings = {
    VITE_API_BASE_URL = var.frontend_api_base_url
  }

  identity {
    type = "SystemAssigned"
  }

  tags = merge(local.common_tags, {
    Tier = "frontend"
  })
}

resource "azurerm_mysql_flexible_server" "main" {
  provider               = azurerm.data_ai
  name                   = local.mysql_server_name
  resource_group_name    = module.rg_data_ai.name
  location               = var.location
  administrator_login    = var.mysql_admin_username
  administrator_password = var.mysql_admin_password
  sku_name               = var.mysql_sku_name
  version                = var.mysql_version
  zone                   = var.availability_zone
  backup_retention_days  = var.mysql_backup_retention_days
  delegated_subnet_id    = azurerm_subnet.data_ai_mysql.id
  private_dns_zone_id    = azurerm_private_dns_zone.mysql.id
  public_network_access  = "Disabled"

  tags = merge(local.common_tags, {
    Tier = "data-ai"
  })

  depends_on = [
    azurerm_private_dns_zone_virtual_network_link.mysql_data_ai,
    azurerm_private_dns_zone_virtual_network_link.mysql_backend
  ]
}

resource "azurerm_mysql_flexible_database" "main" {
  provider            = azurerm.data_ai
  name                = var.mysql_database_name
  resource_group_name = module.rg_data_ai.name
  server_name         = azurerm_mysql_flexible_server.main.name
  charset             = "utf8mb4"
  collation           = "utf8mb4_unicode_ci"
}

resource "azurerm_container_group" "api" {
  provider            = azurerm.backend
  name                = local.api_container_name
  location            = var.location
  resource_group_name = module.rg_backend.name
  os_type             = "Linux"
  ip_address_type     = "Private"
  subnet_ids          = [azurerm_subnet.backend_aci.id]
  restart_policy      = "Always"
  zones               = [var.availability_zone]

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.api.id]
  }

  image_registry_credential {
    server                    = azurerm_container_registry.shared.login_server
    user_assigned_identity_id = azurerm_user_assigned_identity.api.id
  }

  container {
    name   = "api"
    image  = local.api_image
    cpu    = var.api_cpu
    memory = var.api_memory

    ports {
      port     = 8080
      protocol = "TCP"
    }

    environment_variables = {
      NODE_ENV                           = var.environment
      PORT                               = "8080"
      CORS_ORIGINS                       = var.api_cors_origins
      RATE_LIMIT_WINDOW_MS               = tostring(var.api_rate_limit_window_ms)
      RATE_LIMIT_MAX_REQUESTS            = tostring(var.api_rate_limit_max_requests)
      APPINSIGHTS_CONNECTION_STRING      = azurerm_application_insights.backend.connection_string
      AI_SERVICE_BASE_URL                = var.ai_service_base_url
      MYSQL_HOST                         = azurerm_mysql_flexible_server.main.fqdn
      MYSQL_DATABASE                     = azurerm_mysql_flexible_database.main.name
      KEY_VAULT_URI                      = azurerm_key_vault.main.vault_uri
      KEY_VAULT_DATABASE_URL_SECRET_NAME = azurerm_key_vault_secret.api_database_url.name
      KEY_VAULT_JWT_SECRET_SECRET_NAME   = azurerm_key_vault_secret.api_jwt_secret.name
    }
  }

  tags = merge(local.common_tags, {
    Tier = "backend"
  })

  depends_on = [
    azurerm_role_assignment.acr_pull_api,
    azurerm_role_assignment.kv_secrets_user_api,
    azurerm_key_vault_secret.api_database_url,
    azurerm_key_vault_secret.api_jwt_secret
  ]
}

resource "azurerm_container_group" "ai" {
  provider            = azurerm.data_ai
  name                = local.ai_container_name
  location            = var.location
  resource_group_name = module.rg_data_ai.name
  os_type             = "Linux"
  ip_address_type     = "Private"
  subnet_ids          = [azurerm_subnet.data_ai_aci.id]
  restart_policy      = "Always"
  zones               = [var.availability_zone]

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.ai.id]
  }

  image_registry_credential {
    server                    = azurerm_container_registry.shared.login_server
    user_assigned_identity_id = azurerm_user_assigned_identity.ai.id
  }

  container {
    name   = "ai"
    image  = local.ai_image
    cpu    = var.ai_cpu
    memory = var.ai_memory

    ports {
      port     = 8090
      protocol = "TCP"
    }

    environment_variables = {
      APPINSIGHTS_CONNECTION_STRING = azurerm_application_insights.ai.connection_string
      MYSQL_HOST                    = azurerm_mysql_flexible_server.main.fqdn
      MYSQL_DATABASE                = azurerm_mysql_flexible_database.main.name
      KEY_VAULT_URI                 = azurerm_key_vault.main.vault_uri
      LOG_LEVEL                     = "INFO"
    }
  }

  tags = merge(local.common_tags, {
    Tier = "data-ai"
  })

  depends_on = [
    azurerm_role_assignment.acr_pull_ai,
    azurerm_role_assignment.kv_secrets_user_ai
  ]
}

resource "azurerm_key_vault_secret" "mysql_admin_username" {
  provider     = azurerm.data_ai
  name         = "mysql-admin-username"
  value        = var.mysql_admin_username
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "mysql_admin_password" {
  provider     = azurerm.data_ai
  name         = "mysql-admin-password"
  value        = var.mysql_admin_password
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "mysql_fqdn" {
  provider     = azurerm.data_ai
  name         = "mysql-fqdn"
  value        = azurerm_mysql_flexible_server.main.fqdn
  key_vault_id = azurerm_key_vault.main.id
}

