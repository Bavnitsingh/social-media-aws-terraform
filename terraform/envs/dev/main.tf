# Phase 1 smoke test: no infrastructure yet. It only proves the remote backend works
# and shows which identity Terraform is running as.
data "aws_caller_identity" "current" {}

output "caller_arn" {
  description = "Identity Terraform runs as. It must NOT end in :root."
  value       = data.aws_caller_identity.current.arn
}

data "aws_caller_identity" "current" {}

output "caller_arn" {
  description = "Identity Terraform runs as. It must NOT end in :root."
  value       = data.aws_caller_identity.current.arn
}

module "vpc" {
  source = "../../modules/vpc"

  name               = "${var.project}-${var.environment}"
  vpc_cidr           = var.vpc_cidr
  az_count           = 2
  enable_nat_gateway = true
  single_nat_gateway = true # dev: one NAT is enough. Prod: false.
}