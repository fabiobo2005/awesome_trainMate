output "resource_assignments_count" {
  value = length(azurerm_subscription_policy_assignment.required_tag_resources)
}

output "resource_group_assignments_count" {
  value = length(azurerm_subscription_policy_assignment.required_tag_resource_groups)
}

