###############################################################################
# providers.tf — Configuração dos providers Helm e Kubernetes
#
# PORQUÊ ficheiro separado?
# O provider "helm" precisa dos outputs do módulo EKS (endpoint, token, CA).
# Terraform processa providers antes dos resources, por isso o bloco
# "kubernetes {}" dentro do provider "helm" deve referenciar apenas
# data sources ou locals — nunca outputs de módulos directamente.
# A solução correcta é usar o provider com configuração dinâmica via
# environment variables ou um ficheiro kubeconfig gerado pelo aws-cli.
#
# Em CI/CD (GitHub Actions), configuramos o kubectl antes do terraform apply:
#   aws eks update-kubeconfig --region eu-west-1 --name platform-portal-cluster
# e o provider Helm/Kubernetes usa o kubeconfig automaticamente.
###############################################################################

# ─── Provider Helm (usa kubeconfig gerado pelo aws-cli) ───────────────────────
# A configuração do cluster é feita via KUBECONFIG (env var ou ficheiro ~/.kube/config)
# gerado pelo comando: aws eks update-kubeconfig ...
# Isto evita dependências circulares entre provider e módulo EKS.
provider "helm" {
  kubernetes {
    config_path    = "~/.kube/config"
    config_context = "arn:aws:eks:${var.aws_region}:${data.aws_caller_identity.current.account_id}:cluster/platform-portal-cluster"
  }
}

# ─── Provider Kubernetes (mesmo padrão) ───────────────────────────────────────
provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = "arn:aws:eks:${var.aws_region}:${data.aws_caller_identity.current.account_id}:cluster/platform-portal-cluster"
}

# ─── Data Source: AWS caller identity (para construir o ARN do contexto) ──────
data "aws_caller_identity" "current" {}
