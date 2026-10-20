# Rename to backend.tf after the first apply, then run:
#   terraform init -migrate-state \
#     -backend-config="bucket=<state_bucket_name output>" \
#     -backend-config="region=<region>"
terraform {
  backend "s3" {
    key          = "bootstrap/terraform.tfstate"
    use_lockfile = true
    encrypt      = true
  }
}
