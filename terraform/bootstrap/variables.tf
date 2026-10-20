variable "region" {
  description = "AWS region for the state bucket. Must match the region in every backend config."
  type        = string
  default     = "ap-south-1"
}

variable "project" {
  description = "Project name, used as a prefix in resource names."
  type        = string
  default     = "twitter-clone"
}
