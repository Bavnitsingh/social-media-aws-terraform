terraform {
  backend "s3" {
    key          = "envs/dev/terraform.tfstate"
    use_lockfile = true # S3-native locking, no DynamoDB table needed
    encrypt      = true
  }
}
