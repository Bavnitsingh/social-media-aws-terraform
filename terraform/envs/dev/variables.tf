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

variable "app_port" {
  description = "Port the app listens on inside the instance. Check EXPOSE / listen port in your Dockerfile."
  type        = number
  default     = 1234
}

variable "db_port" {
  description = "MySQL port."
  type        = number
  default     = 3306
}

variable "db_name" {
  description = "Initial database name. Must match DB_NAME your app expects."
  type        = string
  default     = "twitter_clone"
}

variable "db_username" {
  description = "RDS master username."
  type        = string
  default     = "dbadmin"
}

variable "db_instance_class" {
  description = "RDS instance size."
  type        = string
  default     = "db.t4g.micro"
}