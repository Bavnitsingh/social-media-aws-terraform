# Phase 1 smoke test: no infrastructure yet. It only proves the remote backend works
# and shows which identity Terraform is running as.
data "aws_caller_identity" "current" {}

output "caller_arn" {
  description = "Identity Terraform runs as. It must NOT end in :root."
  value       = data.aws_caller_identity.current.arn
}
