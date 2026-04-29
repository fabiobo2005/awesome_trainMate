resource "azurerm_key_vault" "main" {
  provider                      = azurerm.data_ai
  name                          = local.key_vault_name
  location                      = var.location
  resource_group_name           = module.rg_data_ai.name
  tenant_id                     = var.tenant_id
  sku_name                      = "standard"
  rbac_authorization_enabled    = true
  purge_protection_enabled      = true
  soft_delete_retention_days    = var.key_vault_soft_delete_retention_days
  public_network_access_enabled = true

  network_acls {
    bypass                     = "AzureServices"
    default_action             = "Deny"
    virtual_network_subnet_ids = [azurerm_subnet.backend_aci.id, azurerm_subnet.data_ai_aci.id]
  }

  tags = merge(local.common_tags, {
    Tier = "data-ai"
  })
}

resource "azurerm_role_assignment" "key_vault_admin" {
  provider             = azurerm.data_ai
  count                = var.platform_admin_object_id != "" ? 1 : 0
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = var.platform_admin_object_id
}

resource "azurerm_container_registry" "shared" {
  provider                      = azurerm.backend
  name                          = local.acr_name
  resource_group_name           = module.rg_backend.name
  location                      = var.location
  sku                           = var.acr_sku
  admin_enabled                 = false
  public_network_access_enabled = true
  tags = merge(local.common_tags, {
    Tier = "backend"
  })
}

resource "azurerm_user_assigned_identity" "api" {
  provider            = azurerm.backend
  name                = "id-${local.sanitized_prefix}-${var.environment}-api"
  location            = var.location
  resource_group_name = module.rg_backend.name
  tags = merge(local.common_tags, {
    Tier = "backend"
  })
}

resource "azurerm_user_assigned_identity" "ai" {
  provider            = azurerm.data_ai
  name                = "id-${local.sanitized_prefix}-${var.environment}-ai"
  location            = var.location
  resource_group_name = module.rg_data_ai.name
  tags = merge(local.common_tags, {
    Tier = "data-ai"
  })
}

resource "azurerm_role_assignment" "acr_pull_api" {
  provider                         = azurerm.backend
  scope                            = azurerm_container_registry.shared.id
  role_definition_name             = "AcrPull"
  principal_id                     = azurerm_user_assigned_identity.api.principal_id
  skip_service_principal_aad_check = true
}

resource "azurerm_role_assignment" "acr_pull_ai" {
  provider                         = azurerm.backend
  scope                            = azurerm_container_registry.shared.id
  role_definition_name             = "AcrPull"
  principal_id                     = azurerm_user_assigned_identity.ai.principal_id
  skip_service_principal_aad_check = true
}

resource "azurerm_role_assignment" "kv_secrets_user_api" {
  provider                         = azurerm.data_ai
  scope                            = azurerm_key_vault.main.id
  role_definition_name             = "Key Vault Secrets User"
  principal_id                     = azurerm_user_assigned_identity.api.principal_id
  skip_service_principal_aad_check = true
}

resource "azurerm_role_assignment" "kv_secrets_user_ai" {
  provider                         = azurerm.data_ai
  scope                            = azurerm_key_vault.main.id
  role_definition_name             = "Key Vault Secrets User"
  principal_id                     = azurerm_user_assigned_identity.ai.principal_id
  skip_service_principal_aad_check = true
}

resource "random_password" "api_jwt_secret" {
  length           = 64
  special          = true
  override_special = "!@#$%*-_=+?"
}

resource "azurerm_key_vault_secret" "api_database_url" {
  provider     = azurerm.data_ai
  name         = "trainmate-database-url"
  value        = "mysql://${urlencode(var.mysql_admin_username)}:${urlencode(var.mysql_admin_password)}@${azurerm_mysql_flexible_server.main.fqdn}:3306/${azurerm_mysql_flexible_database.main.name}"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "api_jwt_secret" {
  provider     = azurerm.data_ai
  name         = "trainmate-jwt-secret"
  value        = random_password.api_jwt_secret.result
  key_vault_id = azurerm_key_vault.main.id
}

