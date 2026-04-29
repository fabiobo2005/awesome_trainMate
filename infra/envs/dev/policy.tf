module "tag_policy_frontend" {
  source          = "../../modules/required_tags_policy"
  subscription_id = var.subscription_frontend
  required_tags   = var.required_tags
  environment     = "${var.environment}-frontend"
}

module "tag_policy_backend" {
  source = "../../modules/required_tags_policy"
  providers = {
    azurerm = azurerm.backend
  }

  subscription_id = var.subscription_backend
  required_tags   = var.required_tags
  environment     = "${var.environment}-backend"
}

module "tag_policy_data_ai" {
  source = "../../modules/required_tags_policy"
  providers = {
    azurerm = azurerm.data_ai
  }

  subscription_id = var.subscription_data_ai
  required_tags   = var.required_tags
  environment     = "${var.environment}-data-ai"
}

