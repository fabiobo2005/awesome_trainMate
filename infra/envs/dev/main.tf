provider "azurerm" {
  subscription_id = var.subscription_frontend
  tenant_id       = var.tenant_id
  features {}
}

provider "azurerm" {
  alias           = "backend"
  subscription_id = var.subscription_backend
  tenant_id       = var.tenant_id
  features {}
}

provider "azurerm" {
  alias           = "data_ai"
  subscription_id = var.subscription_data_ai
  tenant_id       = var.tenant_id
  features {}
}

locals {
  common_tags = {
    CostCenter  = var.cost_center
    Environment = var.environment
    Owner       = var.owner
    Workload    = "TrainMate"
    Application = "TrainMate"
  }
}

module "rg_frontend" {
  source = "../../modules/resource_group"

  name     = "rg-${var.name_prefix}-${var.environment}-frontend"
  location = var.location
  tags = merge(local.common_tags, {
    Tier = "frontend"
  })
}

module "rg_backend" {
  source = "../../modules/resource_group"
  providers = {
    azurerm = azurerm.backend
  }

  name     = "rg-${var.name_prefix}-${var.environment}-backend"
  location = var.location
  tags = merge(local.common_tags, {
    Tier = "backend"
  })
}

module "rg_data_ai" {
  source = "../../modules/resource_group"
  providers = {
    azurerm = azurerm.data_ai
  }

  name     = "rg-${var.name_prefix}-${var.environment}-data-ai"
  location = var.location
  tags = merge(local.common_tags, {
    Tier = "data-ai"
  })
}

