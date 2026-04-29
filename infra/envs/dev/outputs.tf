output "resource_group_frontend" {
  value = module.rg_frontend.name
}

output "resource_group_backend" {
  value = module.rg_backend.name
}

output "resource_group_data_ai" {
  value = module.rg_data_ai.name
}

output "frontend_static_web_app_hostname" {
  value = azurerm_static_web_app.frontend.default_host_name
}

output "acr_login_server" {
  value = azurerm_container_registry.shared.login_server
}

output "key_vault_name" {
  value = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  value = azurerm_key_vault.main.vault_uri
}

output "mysql_fqdn" {
  value = azurerm_mysql_flexible_server.main.fqdn
}

output "mysql_database" {
  value = azurerm_mysql_flexible_database.main.name
}

output "api_container_private_ip" {
  value = azurerm_container_group.api.ip_address
}

output "ai_container_private_ip" {
  value = azurerm_container_group.ai.ip_address
}

output "backend_vnet_id" {
  value = azurerm_virtual_network.backend.id
}

output "data_ai_vnet_id" {
  value = azurerm_virtual_network.data_ai.id
}

output "policy_assignments_frontend_resources" {
  value = module.tag_policy_frontend.resource_assignments_count
}

output "policy_assignments_backend_resources" {
  value = module.tag_policy_backend.resource_assignments_count
}

output "policy_assignments_data_ai_resources" {
  value = module.tag_policy_data_ai.resource_assignments_count
}

