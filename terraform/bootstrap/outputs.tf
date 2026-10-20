output "state_bucket_name" {
  description = "Put this in backend.hcl for every environment."
  value       = aws_s3_bucket.state.id
}

output "region" {
  description = "Region of the state bucket."
  value       = var.region
}
