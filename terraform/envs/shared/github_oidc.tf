# GitHub Actions -> AWS without stored keys (OIDC).
# Permanent and free, so it lives in envs/shared next to ECR and the DNS zone.
# Apply this layer from your laptop only. CI must never be able to edit its own permissions.

variable "github_sub_prefix" {
  description = "Subject prefix GitHub puts in OIDC tokens for this repo. Owner and repo IDs make it rename-proof."
  type        = string
  default     = "repo:Bavnitsingh@150686501/social-media-aws-terraform@1425625673"
}

locals {
  # role name => the exact "sub" claim GitHub must present to assume it
  gha_roles = {
    "gha-ci"       = "${var.github_sub_prefix}:pull_request"
    "gha-ecr-push" = "${var.github_sub_prefix}:ref:refs/heads/main"
    "gha-tf-apply" = "${var.github_sub_prefix}:environment:dev"
  }
}

# One per AWS account. Tells AWS to trust tokens signed by GitHub.
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_policy_document" "gha_trust" {
  for_each = local.gha_roles

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    # The token must be meant for AWS STS ...
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # ... and must come from exactly this repo, in exactly this context.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [each.value]
    }
  }
}

resource "aws_iam_role" "gha" {
  for_each = local.gha_roles

  name                 = each.key
  assume_role_policy   = data.aws_iam_policy_document.gha_trust[each.key].json
  max_session_duration = 3600
}

# gha-ci: can look at everything, change nothing.
resource "aws_iam_role_policy_attachment" "gha_ci_readonly" {
  role       = aws_iam_role.gha["gha-ci"].name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

# gha-ecr-push: can push images to the two repositories and nothing else.
data "aws_iam_policy_document" "gha_ecr_push" {
  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"] # this one action cannot be scoped to a repository
  }

  statement {
    sid = "PushToOurRepos"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = [for r in aws_ecr_repository.this : r.arn]
  }
}

resource "aws_iam_role_policy" "gha_ecr_push" {
  name   = "ecr-push"
  role   = aws_iam_role.gha["gha-ecr-push"].id
  policy = data.aws_iam_policy_document.gha_ecr_push.json
}

# gha-tf-apply: Terraform creates VPC, RDS, IAM roles and more, so it needs broad rights.
# Acceptable in a personal learning account ONLY because the trust policy above limits it to the
# GitHub environment "dev" (approval gate, main branch only). Tighten before using this at work.
resource "aws_iam_role_policy_attachment" "gha_tf_apply_admin" {
  role       = aws_iam_role.gha["gha-tf-apply"].name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

output "github_role_arns" {
  value = { for k, r in aws_iam_role.gha : k => r.arn }
}