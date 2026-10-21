# Who may assume this role: the EC2 service, on behalf of an instance.
data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "app" {
  name               = "${var.name}-app-ec2-role"
  description        = "Role for the app instances"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

# Session Manager: shell access and command execution with no SSH.
resource "aws_iam_role_policy_attachment" "app_ssm" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# EC2 attaches a role through an instance profile (a thin wrapper around the role).
resource "aws_iam_instance_profile" "app" {
  name = "${var.name}-app-profile"
  role = aws_iam_role.app.name
}

# Later phases add policies here, each scoped to ONE resource:
#   Phase 4: secretsmanager:GetSecretValue on the DB secret ARN
#   Phase 5: ecr:GetAuthorizationToken + pull actions on the one repository
#   Phase 8: CloudWatch Logs write