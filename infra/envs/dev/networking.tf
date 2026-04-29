resource "azurerm_virtual_network" "backend" {
  provider            = azurerm.backend
  name                = local.backend_vnet_name
  location            = var.location
  resource_group_name = module.rg_backend.name
  address_space       = var.backend_vnet_address_space
  tags = merge(local.common_tags, {
    Tier = "backend"
  })
}

resource "azurerm_network_security_group" "backend_aci" {
  provider            = azurerm.backend
  name                = "nsg-${local.sanitized_prefix}-${var.environment}-backend-aci"
  location            = var.location
  resource_group_name = module.rg_backend.name
  tags = merge(local.common_tags, {
    Tier = "backend"
  })
}

resource "azurerm_subnet" "backend_aci" {
  provider             = azurerm.backend
  name                 = "snet-${local.sanitized_prefix}-${var.environment}-backend-aci"
  resource_group_name  = module.rg_backend.name
  virtual_network_name = azurerm_virtual_network.backend.name
  address_prefixes     = [var.backend_aci_subnet_prefix]
  service_endpoints    = ["Microsoft.KeyVault"]

  delegation {
    name = "aciDelegation"

    service_delegation {
      name    = "Microsoft.ContainerInstance/containerGroups"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

resource "azurerm_subnet_network_security_group_association" "backend_aci" {
  provider                  = azurerm.backend
  subnet_id                 = azurerm_subnet.backend_aci.id
  network_security_group_id = azurerm_network_security_group.backend_aci.id
}

resource "azurerm_public_ip" "backend_nat" {
  provider            = azurerm.backend
  name                = "pip-${local.sanitized_prefix}-${var.environment}-backend-nat"
  location            = var.location
  resource_group_name = module.rg_backend.name
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = [var.availability_zone]
  tags = merge(local.common_tags, {
    Tier = "backend"
  })
}

resource "azurerm_nat_gateway" "backend" {
  provider            = azurerm.backend
  name                = "nat-${local.sanitized_prefix}-${var.environment}-backend"
  location            = var.location
  resource_group_name = module.rg_backend.name
  sku_name            = "Standard"
  zones               = [var.availability_zone]
  tags = merge(local.common_tags, {
    Tier = "backend"
  })
}

resource "azurerm_nat_gateway_public_ip_association" "backend" {
  provider             = azurerm.backend
  nat_gateway_id       = azurerm_nat_gateway.backend.id
  public_ip_address_id = azurerm_public_ip.backend_nat.id
}

resource "azurerm_subnet_nat_gateway_association" "backend_aci" {
  provider       = azurerm.backend
  subnet_id      = azurerm_subnet.backend_aci.id
  nat_gateway_id = azurerm_nat_gateway.backend.id
}

resource "azurerm_virtual_network" "data_ai" {
  provider            = azurerm.data_ai
  name                = local.data_ai_vnet_name
  location            = var.location
  resource_group_name = module.rg_data_ai.name
  address_space       = var.data_ai_vnet_address_space
  tags = merge(local.common_tags, {
    Tier = "data-ai"
  })
}

resource "azurerm_network_security_group" "data_ai_aci" {
  provider            = azurerm.data_ai
  name                = "nsg-${local.sanitized_prefix}-${var.environment}-data-ai-aci"
  location            = var.location
  resource_group_name = module.rg_data_ai.name
  tags = merge(local.common_tags, {
    Tier = "data-ai"
  })
}

resource "azurerm_subnet" "data_ai_aci" {
  provider             = azurerm.data_ai
  name                 = "snet-${local.sanitized_prefix}-${var.environment}-data-ai-aci"
  resource_group_name  = module.rg_data_ai.name
  virtual_network_name = azurerm_virtual_network.data_ai.name
  address_prefixes     = [var.data_ai_aci_subnet_prefix]
  service_endpoints    = ["Microsoft.KeyVault"]

  delegation {
    name = "aciDelegation"

    service_delegation {
      name    = "Microsoft.ContainerInstance/containerGroups"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

resource "azurerm_subnet_network_security_group_association" "data_ai_aci" {
  provider                  = azurerm.data_ai
  subnet_id                 = azurerm_subnet.data_ai_aci.id
  network_security_group_id = azurerm_network_security_group.data_ai_aci.id
}

resource "azurerm_subnet" "data_ai_mysql" {
  provider             = azurerm.data_ai
  name                 = "snet-${local.sanitized_prefix}-${var.environment}-mysql"
  resource_group_name  = module.rg_data_ai.name
  virtual_network_name = azurerm_virtual_network.data_ai.name
  address_prefixes     = [var.data_ai_mysql_subnet_prefix]

  delegation {
    name = "mysqlDelegation"

    service_delegation {
      name    = "Microsoft.DBforMySQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_public_ip" "data_ai_nat" {
  provider            = azurerm.data_ai
  name                = "pip-${local.sanitized_prefix}-${var.environment}-data-ai-nat"
  location            = var.location
  resource_group_name = module.rg_data_ai.name
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = [var.availability_zone]
  tags = merge(local.common_tags, {
    Tier = "data-ai"
  })
}

resource "azurerm_nat_gateway" "data_ai" {
  provider            = azurerm.data_ai
  name                = "nat-${local.sanitized_prefix}-${var.environment}-data-ai"
  location            = var.location
  resource_group_name = module.rg_data_ai.name
  sku_name            = "Standard"
  zones               = [var.availability_zone]
  tags = merge(local.common_tags, {
    Tier = "data-ai"
  })
}

resource "azurerm_nat_gateway_public_ip_association" "data_ai" {
  provider             = azurerm.data_ai
  nat_gateway_id       = azurerm_nat_gateway.data_ai.id
  public_ip_address_id = azurerm_public_ip.data_ai_nat.id
}

resource "azurerm_subnet_nat_gateway_association" "data_ai_aci" {
  provider       = azurerm.data_ai
  subnet_id      = azurerm_subnet.data_ai_aci.id
  nat_gateway_id = azurerm_nat_gateway.data_ai.id
}

resource "azurerm_virtual_network_peering" "backend_to_data_ai" {
  provider                     = azurerm.backend
  name                         = "peer-${local.sanitized_prefix}-backend-to-data-ai"
  resource_group_name          = module.rg_backend.name
  virtual_network_name         = azurerm_virtual_network.backend.name
  remote_virtual_network_id    = azurerm_virtual_network.data_ai.id
  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
}

resource "azurerm_virtual_network_peering" "data_ai_to_backend" {
  provider                     = azurerm.data_ai
  name                         = "peer-${local.sanitized_prefix}-data-ai-to-backend"
  resource_group_name          = module.rg_data_ai.name
  virtual_network_name         = azurerm_virtual_network.data_ai.name
  remote_virtual_network_id    = azurerm_virtual_network.backend.id
  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
}

resource "azurerm_private_dns_zone" "mysql" {
  provider            = azurerm.data_ai
  name                = local.mysql_private_dns
  resource_group_name = module.rg_data_ai.name
  tags = merge(local.common_tags, {
    Tier = "data-ai"
  })
}

resource "azurerm_private_dns_zone_virtual_network_link" "mysql_data_ai" {
  provider              = azurerm.data_ai
  name                  = "link-${local.sanitized_prefix}-mysql-data-ai"
  resource_group_name   = module.rg_data_ai.name
  private_dns_zone_name = azurerm_private_dns_zone.mysql.name
  virtual_network_id    = azurerm_virtual_network.data_ai.id
}

resource "azurerm_private_dns_zone_virtual_network_link" "mysql_backend" {
  provider              = azurerm.data_ai
  name                  = "link-${local.sanitized_prefix}-mysql-backend"
  resource_group_name   = module.rg_data_ai.name
  private_dns_zone_name = azurerm_private_dns_zone.mysql.name
  virtual_network_id    = azurerm_virtual_network.backend.id
}

