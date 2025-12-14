variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ca-central-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "bucket_name" {
  description = "S3 bucket name for static website"
  type        = string
  default     = "cteach-website"
}

variable "domain_name" {
  description = "Domain name for the website"
  type        = string
  default     = "cteach.cirak.ca"
}

variable "root_domain" {
  description = "Root domain name"
  type        = string
  default     = "cirak.ca"
}

