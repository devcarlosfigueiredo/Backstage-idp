###############################################################################
# Variables — Platform Portal (Backstage)
###############################################################################

variable "aws_region" {
  description = "AWS region para o deploy"
  type        = string
  default     = "eu-west-1"
}

variable "environment" {
  description = "Ambiente de deploy (development, staging, production)"
  type        = string
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment deve ser: development, staging ou production."
  }
}

variable "project_name" {
  description = "Nome do projecto (usado como prefixo em todos os recursos)"
  type        = string
  default     = "platform-portal"
}

variable "node_instance_type" {
  description = "Tipo de instância EC2 para os nodes EKS"
  type        = string
  default     = "t3.medium"
}

variable "db_instance_class" {
  description = "Classe da instância RDS"
  type        = string
  default     = "db.t4g.small"
}

variable "allowed_cidr_blocks" {
  description = "CIDRs com acesso ao cluster EKS"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "platform_admin_role_arn" {
  description = "ARN do IAM role com acesso admin ao cluster"
  type        = string
}

variable "backstage_image_tag" {
  description = "Tag da imagem Docker do Backstage"
  type        = string
  default     = "latest"
}
