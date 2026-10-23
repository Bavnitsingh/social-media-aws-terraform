output "repository_urls" {
  description = "Image names for tagging and pushing, keyed by app / nginx."
  value       = { for k, r in aws_ecr_repository.this : k => r.repository_url }
}