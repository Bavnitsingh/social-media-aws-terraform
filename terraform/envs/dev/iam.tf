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

data "aws_iam_policy_document" "app_secrets" {
  statement {
    sid     = "ReadOwnSecrets"
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      aws_db_instance.this.master_user_secret[0].secret_arn,
      aws_secretsmanager_secret.app.arn,
    ]
  }
}

resource "aws_iam_role_policy" "app_secrets" {
  name   = "read-own-secrets"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.app_secrets.json
}
#   Phase 5: ecr:GetAuthorizationToken + pull actions on the 2 repository and s3 bucket for uploads

data "aws_ecr_repository" "this" {
  for_each = toset(["app", "nginx"])
  name     = "${var.project}/${each.key}" # created in envs/shared: apply that first
}

data "aws_iam_policy_document" "app_ecr_pull" {
  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"] # this action cannot be scoped to a repository
  }

  statement {
    sid = "PullFromOurRepositories"
    actions = [
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchCheckLayerAvailability",
    ]
    resources = [for r in data.aws_ecr_repository.this : r.arn]
  }
}

resource "aws_iam_role_policy" "app_ecr_pull" {
  name   = "pull-app-images"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.app_ecr_pull.json
}

data "aws_iam_policy_document" "app_uploads" {
  statement {
    sid       = "ListUploadsBucket"
    actions   = ["s3:ListBucket"] # without it, a missing key returns 403 instead of 404
    resources = [aws_s3_bucket.uploads.arn]
  }

  statement {
    sid       = "ReadWriteUploadObjects"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.uploads.arn}/*"]
  }
}

resource "aws_iam_role_policy" "app_uploads" {
  name   = "uploads-bucket-access"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.app_uploads.json
}


#   Phase 8: CloudWatch Logs write
data "aws_iam_policy_document" "app_logs" {
  statement {
    sid     = "WriteContainerLogs"
    actions = ["logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogStreams"]
    resources = [
      "${aws_cloudwatch_log_group.app.arn}:*",
      "${aws_cloudwatch_log_group.nginx.arn}:*",
    ]
  }
}

resource "aws_iam_role_policy" "app_logs" {
  name   = "write-container-logs"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.app_logs.json
}