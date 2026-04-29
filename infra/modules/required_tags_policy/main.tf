locals {
  tags_map = {
    for tag in var.required_tags : lower(replace(tag, "/[^a-zA-Z0-9]/", "")) => tag
  }
}

resource "azurerm_policy_definition" "required_tag_resources" {
  name         = substr("tm-req-tag-res-${var.environment}", 0, 64)
  policy_type  = "Custom"
  mode         = "Indexed"
  display_name = "Require tag on resources (${var.environment})"
  description  = "Denies resources without the required tag."

  parameters = jsonencode({
    tagName = {
      type = "String"
      metadata = {
        displayName = "Required Tag Name"
      }
    }
  })

  policy_rule = jsonencode({
    if = {
      allOf = [
        {
          field     = "type"
          notEquals = "Microsoft.Resources/subscriptions/resourceGroups"
        },
        {
          field  = "[concat('tags[', parameters('tagName'), ']')]"
          exists = "false"
        }
      ]
    }
    then = {
      effect = "deny"
    }
  })
}

resource "azurerm_policy_definition" "required_tag_resource_groups" {
  name         = substr("tm-req-tag-rg-${var.environment}", 0, 64)
  policy_type  = "Custom"
  mode         = "All"
  display_name = "Require tag on resource groups (${var.environment})"
  description  = "Denies resource groups without the required tag."

  parameters = jsonencode({
    tagName = {
      type = "String"
      metadata = {
        displayName = "Required Tag Name"
      }
    }
  })

  policy_rule = jsonencode({
    if = {
      allOf = [
        {
          field  = "type"
          equals = "Microsoft.Resources/subscriptions/resourceGroups"
        },
        {
          field  = "[concat('tags[', parameters('tagName'), ']')]"
          exists = "false"
        }
      ]
    }
    then = {
      effect = "deny"
    }
  })
}

resource "azurerm_subscription_policy_assignment" "required_tag_resources" {
  for_each             = local.tags_map
  name                 = substr("tm-res-tag-${each.key}-${var.environment}", 0, 64)
  display_name         = "Require ${each.value} on resources"
  subscription_id      = var.subscription_id
  policy_definition_id = azurerm_policy_definition.required_tag_resources.id
  enforce              = true

  parameters = jsonencode({
    tagName = {
      value = each.value
    }
  })
}

resource "azurerm_subscription_policy_assignment" "required_tag_resource_groups" {
  for_each             = local.tags_map
  name                 = substr("tm-rg-tag-${each.key}-${var.environment}", 0, 64)
  display_name         = "Require ${each.value} on resource groups"
  subscription_id      = var.subscription_id
  policy_definition_id = azurerm_policy_definition.required_tag_resource_groups.id
  enforce              = true

  parameters = jsonencode({
    tagName = {
      value = each.value
    }
  })
}

