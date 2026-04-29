variable "subscription_id" {
  type        = string
  description = "Subscription ID where the policy is assigned."
}

variable "required_tags" {
  type        = list(string)
  description = "List of required tags."
}

variable "environment" {
  type        = string
  description = "Environment suffix for policy resource names."
}

