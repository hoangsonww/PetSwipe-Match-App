# ═══════════════════════════════════════════════════════════════════════════
# Datadog Integration Variables
# Gate with: enable_datadog = true
# Operator must supply datadog_api_key and datadog_app_key via tfvars or env
# ═══════════════════════════════════════════════════════════════════════════

variable "enable_datadog" {
  description = "Enable Datadog monitoring integration"
  type        = bool
  default     = false
}

variable "datadog_api_key" {
  description = "Datadog API key (required when enable_datadog = true)"
  type        = string
  default     = ""
  sensitive   = true

  validation {
    condition     = var.datadog_api_key == "" || length(var.datadog_api_key) == 32
    error_message = "Datadog API key must be exactly 32 characters when provided."
  }
}

variable "datadog_app_key" {
  description = "Datadog application key (required for dashboards, SLOs, and synthetics)"
  type        = string
  default     = ""
  sensitive   = true

  validation {
    condition     = var.datadog_app_key == "" || length(var.datadog_app_key) == 40
    error_message = "Datadog application key must be exactly 40 characters when provided."
  }
}

variable "datadog_site" {
  description = "Datadog site (datadoghq.com, datadoghq.eu, us3.datadoghq.com, us5.datadoghq.com, ap1.datadoghq.com)"
  type        = string
  default     = "datadoghq.com"

  validation {
    condition = contains([
      "datadoghq.com",
      "datadoghq.eu",
      "us3.datadoghq.com",
      "us5.datadoghq.com",
      "ap1.datadoghq.com",
      "ddog-gov.com"
    ], var.datadog_site)
    error_message = "Invalid Datadog site. Must be one of: datadoghq.com, datadoghq.eu, us3.datadoghq.com, us5.datadoghq.com, ap1.datadoghq.com, ddog-gov.com."
  }
}

variable "datadog_aws_account_id" {
  description = "AWS account ID for Datadog integration (defaults to current account)"
  type        = string
  default     = ""
}

variable "datadog_aws_role_name" {
  description = "IAM role name for Datadog AWS integration"
  type        = string
  default     = "DatadogIntegrationRole"
}
