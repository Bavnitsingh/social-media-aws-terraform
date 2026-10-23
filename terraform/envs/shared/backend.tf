terraform {
  backend "s3" {
    key          = "envs/shared/terraform.tfstate"
    use_lockfile = true
    encrypt      = true
  }
}