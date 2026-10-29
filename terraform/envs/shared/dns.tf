variable "app_zone_name" {
  type = string
  default = "bsc-twitter.devops-learn.online"
}

resource "aws_route53_zone" "app" {
  name = var.app_zone_name
  tags = {Name = var.app_zone_name}

}

output "app_zone_name_servers" {
  value = aws_route53_zone.app.name_servers
}