resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-db-subnets"
  subnet_ids = module.vpc.db_subnet_ids # must cover 2+ AZs

  tags = { Name = "${var.name}-db-subnets" }
}

resource "aws_db_instance" "this" {
  identifier        = "${var.name}-mysql"
  engine            = "mysql"
  engine_version    = "8.4"
  instance_class    = var.db_instance_class
  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true
  db_name           = var.db_name
  username          = var.db_username

  # RDS generates the password and keeps it in Secrets Manager. Do NOT set `password`.
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period    = 1
  auto_minor_version_upgrade = true
  apply_immediately          = true

  # Dev only. In prod: skip_final_snapshot = false and deletion_protection = true.
  skip_final_snapshot = true
  deletion_protection = false

  tags = { Name = "${var.name}-mysql" }

}