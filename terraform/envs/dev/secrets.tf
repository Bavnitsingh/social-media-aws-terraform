# The CONTAINER only. Values are added with the CLI so they never enter Terraform state.
resource "aws_secretsmanager_secret" "app" {
  name        = "${var.name}/app"
  description = "App secrets: some important secrets"

  recovery_window_in_days = 0
}