variable "region" {
  description = "AWS region for this environment."
  type        = string
  default     = "ap-south-1"
}

variable "project" {
  description = "Project name, used in tags and resource names."
  type        = string
  default     = "twitter-clone"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "dev"
}
