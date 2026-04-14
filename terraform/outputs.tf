###############################################################################
# Outputs — Platform Portal
###############################################################################

output "eks_cluster_name" {
  description = "Nome do cluster EKS"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "Endpoint do cluster EKS"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "backstage_url" {
  description = "URL pública do Backstage"
  value       = "https://platform.empresa.com"
}

output "techdocs_bucket" {
  description = "Nome do bucket S3 para TechDocs"
  value       = aws_s3_bucket.techdocs.id
}

output "postgres_secret_arn" {
  description = "ARN do secret com credenciais do PostgreSQL"
  value       = aws_secretsmanager_secret.postgres.arn
  sensitive   = true
}

output "backstage_irsa_role_arn" {
  description = "ARN do IAM role para o Backstage (IRSA)"
  value       = module.backstage_irsa.iam_role_arn
}

output "redis_endpoint" {
  description = "Endpoint do Redis ElastiCache"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}

output "vpc_id" {
  description = "ID da VPC criada"
  value       = module.vpc.vpc_id
}

output "configure_kubectl" {
  description = "Comando para configurar o kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}
