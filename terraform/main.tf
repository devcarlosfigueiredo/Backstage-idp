###############################################################################
# Platform Portal — Backstage em EKS
# Terraform para provisionar infraestrutura completa do Backstage na AWS
###############################################################################

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Estado remoto — S3 + DynamoDB para locking
  backend "s3" {
    bucket         = "minha-empresa-terraform-state"
    key            = "platform/backstage/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "platform-portal"
      ManagedBy   = "terraform"
      Environment = var.environment
      Team        = "platform-engineering"
    }
  }
}

# ─── Data Sources ─────────────────────────────────────────────────────────────

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

# ─── Rede (VPC) ───────────────────────────────────────────────────────────────

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.project_name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = var.environment != "production"
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Tags necessárias para o EKS
  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }
}

# ─── EKS Cluster ──────────────────────────────────────────────────────────────

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "${var.project_name}-cluster"
  cluster_version = "1.29"

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true
  cluster_endpoint_public_access_cidrs = var.allowed_cidr_blocks

  # Add-ons geridos pela AWS
  cluster_addons = {
    coredns                = { most_recent = true }
    kube-proxy             = { most_recent = true }
    vpc-cni                = { most_recent = true }
    aws-ebs-csi-driver     = { most_recent = true }
    aws-load-balancer-controller = { most_recent = true }
  }

  # Node Groups
  eks_managed_node_groups = {
    # Node group para o Backstage
    platform = {
      name           = "platform-nodes"
      instance_types = [var.node_instance_type]
      min_size       = 2
      max_size       = 5
      desired_size   = 2

      labels = {
        role = "platform"
      }

      taints = []

      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 50
            volume_type           = "gp3"
            encrypted             = true
            delete_on_termination = true
          }
        }
      }
    }
  }

  # RBAC: acesso ao cluster
  access_entries = {
    platform_admin = {
      kubernetes_groups = []
      principal_arn     = var.platform_admin_role_arn

      policy_associations = {
        admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = {
            type = "cluster"
          }
        }
      }
    }
  }
}

# ─── RDS PostgreSQL (backend do Backstage) ─────────────────────────────────────

resource "random_password" "postgres" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "postgres" {
  name                    = "${var.project_name}/postgres"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "postgres" {
  secret_id = aws_secretsmanager_secret.postgres.id
  secret_string = jsonencode({
    username = "backstage"
    password = random_password.postgres.result
    host     = module.rds.db_instance_address
    port     = 5432
    dbname   = "backstage"
  })
}

module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "${var.project_name}-postgres"

  engine               = "postgres"
  engine_version       = "15.5"
  family               = "postgres15"
  major_engine_version = "15"
  instance_class       = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true

  db_name  = "backstage"
  username = "backstage"
  password = random_password.postgres.result
  port     = 5432

  multi_az               = var.environment == "production"
  db_subnet_group_name   = module.vpc.database_subnet_group
  vpc_security_group_ids = [aws_security_group.rds.id]

  maintenance_window      = "Mon:00:00-Mon:03:00"
  backup_window           = "03:00-06:00"
  backup_retention_period = var.environment == "production" ? 7 : 1
  deletion_protection     = var.environment == "production"
  skip_final_snapshot     = var.environment != "production"

  performance_insights_enabled = true
  monitoring_interval          = 60
}

resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-rds-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }
}

# ─── S3 para TechDocs ─────────────────────────────────────────────────────────

resource "aws_s3_bucket" "techdocs" {
  bucket = "${var.project_name}-techdocs-${var.environment}"
}

resource "aws_s3_bucket_versioning" "techdocs" {
  bucket = aws_s3_bucket.techdocs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "techdocs" {
  bucket = aws_s3_bucket.techdocs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "techdocs" {
  bucket                  = aws_s3_bucket.techdocs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─── Redis (cache do Backstage) ───────────────────────────────────────────────

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.project_name}-redis"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${var.project_name}-redis"
  description          = "Redis cache para o Backstage"

  node_type            = "cache.t4g.small"
  num_cache_clusters   = var.environment == "production" ? 2 : 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.1"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}

resource "aws_security_group" "redis" {
  name_prefix = "${var.project_name}-redis-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }
}

# ─── IAM para o Backstage (IRSA) ──────────────────────────────────────────────

module "backstage_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.0"

  role_name = "${var.project_name}-backstage-irsa"

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["backstage:backstage"]
    }
  }

  role_policy_arns = {
    techdocs_s3 = aws_iam_policy.techdocs_s3.arn
    secrets     = aws_iam_policy.secrets.arn
  }
}

resource "aws_iam_policy" "techdocs_s3" {
  name = "${var.project_name}-techdocs-s3"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.techdocs.arn,
          "${aws_s3_bucket.techdocs.arn}/*",
        ]
      }
    ]
  })
}

resource "aws_iam_policy" "secrets" {
  name = "${var.project_name}-secrets"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [aws_secretsmanager_secret.postgres.arn]
      }
    ]
  })
}

# ─── Helm: Deploy do Backstage ────────────────────────────────────────────────
# NOTA: O provider "helm" é configurado no ficheiro providers.tf separado
# para evitar dependências circulares com o módulo EKS.
# Ver: helm/providers.tf

resource "helm_release" "backstage" {
  name             = "backstage"
  repository       = "https://backstage.github.io/charts"
  chart            = "backstage"
  version          = "1.8.2"
  namespace        = "backstage"
  create_namespace = true
  wait             = true
  timeout          = 600

  values = [file("${path.module}/../helm/backstage-values.yaml")]

  # Em Helm provider ~> 2.12, usar set_list ou set_sensitive em vez de set {}
  # para valores dinâmicos do Terraform
  set {
    name  = "backstage.image.tag"
    value = var.backstage_image_tag
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = module.backstage_irsa.iam_role_arn
  }

  depends_on = [module.eks]
}
