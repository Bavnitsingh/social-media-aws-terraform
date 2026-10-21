output "vpc_id" {
  value = aws_vpc.this.id
}

output "vpc_cidr" {
  value = aws_vpc.this.cidr_block
}

output "azs" {
  value = local.azs
}

output "public_subnet_ids" {
  description = "For the ALB (Phase 6)."
  value       = [for az in local.azs : aws_subnet.public[az].id]
}

output "app_subnet_ids" {
  description = "For the Auto Scaling Group (Phase 6)."
  value       = [for az in local.azs : aws_subnet.app[az].id]
}

output "db_subnet_ids" {
  description = "For the RDS subnet group (Phase 4)."
  value       = [for az in local.azs : aws_subnet.db[az].id]
}

output "nat_public_ips" {
  description = "Egress IPs of the app tier (useful for allow-lists)."
  value       = [for eip in aws_eip.nat : eip.public_ip]
}