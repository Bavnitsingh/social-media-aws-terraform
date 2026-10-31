locals {
  ecr_registry = split("/", data.aws_ecr_repository.this["app"].repository_url)[0]
  app_image    = "${data.aws_ecr_repository.this["app"].repository_url}:${var.image_tag}"
  nginx_image  = "${data.aws_ecr_repository.this["nginx"].repository_url}:${var.image_tag}"

  # Tags on instances launched by an ASG do not come from the provider's default_tags,
  # so the launch template sets them itself.
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_launch_template" "app" {
  name_prefix   = "${var.name}-app-"
  image_id      = data.aws_ami.al2023.id
  instance_type = var.instance_type

  update_default_version = true

  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  vpc_security_group_ids = [aws_security_group.app.id]

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required" # IMDSv2 only
    http_put_response_hop_limit = 2          # containers are one hop further than the host
  }

  # T3 default is "unlimited" (extra charges under sustained load). "standard" throttles instead.
  credit_specification {
    cpu_credits = "standard"
  }

  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size           = 20
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  # Only non-secret values go in here: user data is readable by anyone who can describe the instance.
  user_data = base64encode(templatefile("${path.module}/user_data.sh.tftpl", {
    region          = var.region
    ecr_registry    = local.ecr_registry
    app_image       = local.app_image
    nginx_image     = local.nginx_image
    app_port        = var.app_port
    db_host         = aws_db_instance.this.address
    db_port         = var.db_port
    db_name         = var.db_name
    db_secret_arn   = aws_db_instance.this.master_user_secret[0].secret_arn
    app_secret_arn  = aws_secretsmanager_secret.app.arn
    uploads_bucket  = aws_s3_bucket.uploads.id
    site_url        = "http://${aws_lb.app.dns_name}"
    app_log_group   = aws_cloudwatch_log_group.app.name
    nginx_log_group = aws_cloudwatch_log_group.nginx.name
  }))

  tag_specifications {
    resource_type = "instance"
    tags          = merge(local.common_tags, { Name = "${var.name}-app" })
  }

  tag_specifications {
    resource_type = "volume"
    tags          = merge(local.common_tags, { Name = "${var.name}-app" })
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "app" {
  name                = "${var.name}-app-asg"
  min_size            = var.asg_min_size
  max_size            = var.asg_max_size
  desired_capacity    = var.asg_desired_capacity
  vpc_zone_identifier = module.vpc.app_subnet_ids # private-app subnets, one per AZ

  target_group_arns         = [aws_lb_target_group.app.arn]
  health_check_type         = "ELB"
  health_check_grace_period = 900

  launch_template {
    id      = aws_launch_template.app.id
    version = aws_launch_template.app.latest_version # a new version triggers the refresh
  }

  instance_refresh {
    strategy = "Rolling"

    preferences {
      min_healthy_percentage = 50
      instance_warmup        = "120"
    }
  }

  # The NAT gateway and its routes must exist before instances boot,
  # because the boot script needs the internet (ECR, Secrets Manager).

  #In aws_autoscaling_group.app, change depends_on so the permission exists before new instances boot:
  depends_on = [module.vpc, aws_iam_role_policy.app_logs]

  lifecycle {
    # The scaling policy changes the desired size. Do not fight it on every apply.
    ignore_changes = [desired_capacity]
  }
}

resource "aws_autoscaling_policy" "cpu" {
  name                      = "${var.name}-cpu-target"
  autoscaling_group_name    = aws_autoscaling_group.app.name
  policy_type               = "TargetTrackingScaling"
  estimated_instance_warmup = 180

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }

    target_value = 50
  }
}