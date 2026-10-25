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
  default     = 8080
}

variable "db_port" {
  description = "MySQL port."
  type        = number
  default     = 3306
}

variable "db_name" {
  description = "Initial database name. Must match DB_NAME your app expects."
  type        = string
  default     = "twitterClone"
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

variable "image_tag" {
  description = "Image tag (git short SHA) to deploy. Must exist in BOTH ECR repositories. Changing it rolls the instances."
  type        = string
  default     = "1c71814"
}

variable "instance_type" {
  description = "EC2 instance type for the app servers."
  type        = string
  default     = "t3.micro"
}

variable "asg_min_size" {
  type    = number
  default = 2
}

variable "asg_max_size" {
  type    = number
  default = 4
}

variable "asg_desired_capacity" {
  description = "Starting size. After creation the scaling policy owns the number (see ignore_changes)."
  type        = number
  default     = 2
}