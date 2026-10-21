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
variable "vpc_cidr" {
  description = "CIDR block for the dev VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "name" {
  description = "Name prefix for every resource."
  type        = string
  default     = "twitter-bsc"
}
