resource "azurerm_log_analytics_workspace" "frontend" {
  name                = local.frontend_workspace
  location            = var.location
  resource_group_name = module.rg_frontend.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags = merge(local.common_tags, {
    Tier = "frontend"
  })
}

resource "azurerm_application_insights" "frontend" {
  name                = local.frontend_app_insights
  location            = var.location
  resource_group_name = module.rg_frontend.name
  workspace_id        = azurerm_log_analytics_workspace.frontend.id
  application_type    = "web"
  tags = merge(local.common_tags, {
    Tier = "frontend"
  })
}

resource "azurerm_log_analytics_workspace" "backend" {
  provider            = azurerm.backend
  name                = local.backend_workspace
  location            = var.location
  resource_group_name = module.rg_backend.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags = merge(local.common_tags, {
    Tier = "backend"
  })
}

resource "azurerm_application_insights" "backend" {
  provider            = azurerm.backend
  name                = local.backend_app_insights
  location            = var.location
  resource_group_name = module.rg_backend.name
  workspace_id        = azurerm_log_analytics_workspace.backend.id
  application_type    = "web"
  tags = merge(local.common_tags, {
    Tier = "backend"
  })
}

resource "azurerm_log_analytics_workspace" "data_ai" {
  provider            = azurerm.data_ai
  name                = local.data_ai_workspace
  location            = var.location
  resource_group_name = module.rg_data_ai.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags = merge(local.common_tags, {
    Tier = "data-ai"
  })
}

resource "azurerm_application_insights" "ai" {
  provider            = azurerm.data_ai
  name                = local.ai_app_insights
  location            = var.location
  resource_group_name = module.rg_data_ai.name
  workspace_id        = azurerm_log_analytics_workspace.data_ai.id
  application_type    = "web"
  tags = merge(local.common_tags, {
    Tier = "data-ai"
  })
}

