<div align="center">

# 🏗️ Platform Portal

### Internal Developer Platform powered by Backstage

[![Deploy](https://github.com/devcarlosfigueiredo/platform-portal/actions/workflows/deploy-backstage.yml/badge.svg)](https://github.com/devcarlosfigueiredo/platform-portal/actions/workflows/deploy-backstage.yml)
[![Catalog](https://github.com/devcarlosfigueiredo/platform-portal/actions/workflows/validate-catalog.yml/badge.svg)](https://github.com/devcarlosfigueiredo/platform-portal/actions/workflows/validate-catalog.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Backstage](https://img.shields.io/badge/Backstage-1.x-9bf)](https://backstage.io)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-1.29-326CE5?logo=kubernetes)](https://kubernetes.io)
[![Terraform](https://img.shields.io/badge/Terraform-1.6+-7B42BC?logo=terraform)](https://terraform.io)

**Centraliza catálogo de serviços · Templates de scaffolding · Documentação · Métricas DORA · Custos**

[Portal →](https://platform.empresa.com) · [Docs →](https://platform.empresa.com/docs) · [Catalog →](https://platform.empresa.com/catalog)

</div>

---

## 📋 Índice

- [O que é?](#o-que-é)
- [Funcionalidades](#-funcionalidades)
- [Arquitectura](#️-arquitectura)
- [Estrutura do Projecto](#-estrutura-do-projecto)
- [Quick Start](#-quick-start)
- [Deploy em Produção](#-deploy-em-produção)
- [Adicionar Serviços ao Catálogo](#-adicionar-serviços-ao-catálogo)
- [Criar um Novo Serviço](#-criar-um-novo-serviço-via-template)
- [Plugins](#-plugins)
- [Métricas DORA](#-métricas-dora)
- [Contribuir](#-contribuir)

---

## O que é?

O **Platform Portal** é a **Internal Developer Platform (IDP)** da empresa — um ponto único de acesso para todos os developers gerirem serviços, criarem novos projectos, consultarem documentação técnica e monitorizarem métricas de engenharia.

Construído sobre o [Backstage](https://backstage.io) (Spotify / CNCF), segue os princípios de **Platform Engineering**: tratar a infraestrutura como produto, com os developers como clientes.

### Por que Backstage?

| Problema | Solução |
|---------|---------|
| "Onde está o código do serviço X?" | Software Catalog centralizado |
| "Como crio um novo microserviço?" | Software Templates (1 clique) |
| "Onde está a documentação?" | TechDocs integrado |
| "Qual o estado dos deploys?" | Kubernetes plugin por serviço |
| "Quantos deploys fizemos esta semana?" | DORA Metrics plugin |
| "Qual o custo deste serviço?" | Cost Insights plugin |

---

## ✨ Funcionalidades

### 📦 Software Catalog
Registo centralizado de todos os serviços, APIs, bibliotecas e recursos da empresa. Auto-discovery via GitHub — qualquer repositório com `catalog-info.yaml` é automaticamente registado.

### 🛠️ Software Templates (Scaffolding)
Cria novos serviços em 1 clique com tudo pré-configurado:
- **Python Microservice** (FastAPI + Docker + CI/CD completo)
- **Terraform Module** (estrutura padrão + terraform-docs + Terratest)

### 📖 TechDocs
Documentação técnica renderizada directamente no portal, gerada a partir de ficheiros Markdown no repositório (MkDocs). Zero overhead para os developers.

### 🔗 GitHub Integration
- Pull Requests e Issues visíveis por serviço
- GitHub Actions workflows visíveis no portal
- Auto-discovery do catálogo via GitHub

### ☸️ Kubernetes Plugin
Status em tempo real dos deployments, pods e serviços — por componente do catálogo.

### 📊 DORA Metrics (Custom Plugin)
As 4 métricas DevOps Research & Assessment por serviço:
- **Deployment Frequency** — frequência de deploys
- **Lead Time for Changes** — commit → produção
- **MTTR** — tempo de recuperação após incidente
- **Change Failure Rate** — % de deploys com incidente

### 💰 Cost Insights
Custo estimado por serviço e por equipa, integrado com AWS Cost Explorer.

### 🔍 Search Global
Encontra qualquer serviço, API, documentação ou template em segundos.

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────┐
│          Platform Portal (Backstage)            │
│   Catalog · Templates · TechDocs · Search      │
│   K8s Plugin · DORA Metrics · Cost Insights    │
└───────────┬─────────────────────┬───────────────┘
            │                     │
    ┌───────▼────────┐   ┌────────▼────────┐
    │   GitHub API   │   │  Kubernetes API │
    │ Catalog · PRs  │   │ Deployments·Pods│
    │ Actions · Code │   │ Services·Logs   │
    └────────────────┘   └─────────────────┘
            │
    ┌───────▼────────┐   ┌─────────────────┐
    │   Prometheus   │   │   AWS Services  │
    │ DORA · SLO/SLI │   │ RDS·S3·Redis    │
    └────────────────┘   │ Secrets Manager │
                         └─────────────────┘
```

**Infra**: EKS (Kubernetes) + RDS PostgreSQL + ElastiCache Redis + S3 (TechDocs)  
**IaC**: Terraform (módulos reutilizáveis)  
**Deploy**: GitHub Actions → Helm Chart oficial  
**Secrets**: External Secrets Operator → AWS Secrets Manager  
**Auth**: GitHub OAuth (SSO)

---

## 📁 Estrutura do Projecto

```
backstage-idp/
│
├── backstage/                      # Aplicação Backstage
│   ├── app-config.yaml             # Config principal (dev)
│   ├── app-config.production.yaml  # Config de produção
│   ├── Dockerfile                  # Imagem multi-stage
│   ├── packages/
│   │   ├── app/                    # Frontend React
│   │   └── backend/                # API Node.js
│   └── plugins/
│       ├── custom-metrics/         # Plugin DORA Metrics (custom)
│       └── cost-insights/          # Plugin Cost Insights
│
├── catalog/                        # Entidades do Software Catalog
│   ├── services/
│   │   ├── taskflow-api.yaml       # TaskFlow API + OpenAPI spec
│   │   └── flask-api.yaml          # Auth Service + Resources
│   ├── templates/
│   │   ├── python-microservice/    # Template: FastAPI completo
│   │   │   ├── template.yaml       # Definição do template
│   │   │   └── skeleton/           # Código gerado
│   │   │       ├── src/main.py
│   │   │       ├── Dockerfile
│   │   │       ├── catalog-info.yaml
│   │   │       ├── mkdocs.yml
│   │   │       ├── docs/index.md
│   │   │       └── .github/workflows/ci-cd.yml
│   │   └── terraform-module/       # Template: módulo Terraform
│   ├── groups/
│   │   └── team-platform.yaml      # Grupos, Users, Domain
│   └── systems/
│       └── ecommerce.yaml          # Sistemas e Domínios
│
├── terraform/                      # IaC — Backstage em EKS
│   ├── main.tf                     # VPC, EKS, RDS, Redis, S3, IAM
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars.example
│
├── helm/
│   ├── backstage-values.yaml       # Helm values (produção)
│   └── kubernetes-secrets.yaml     # ESO + RBAC + ServiceAccount
│
├── docs/
│   ├── architecture/overview.md    # Arquitectura detalhada + ADRs
│   └── runbooks/operations.md      # Runbook de operações
│
├── scripts/
│   ├── setup.sh                    # Bootstrap dev/produção
│   └── validate-catalog.py         # Validação de entidades CI
│
├── .github/workflows/
│   ├── deploy-backstage.yml        # CI/CD do próprio Backstage
│   └── validate-catalog.yml        # Validação do catálogo em PRs
│
└── docker-compose.dev.yaml         # Dev: Postgres + Redis + Grafana
```

---

## ⚡ Quick Start

### Pré-requisitos

- Node.js 20+ e Yarn 3+
- Docker + Docker Compose
- Conta GitHub com token pessoal
- (Opcional) GitHub OAuth App para autenticação

### 1. Clonar e configurar

```bash
git clone git@github.com:minha-org/platform-portal.git
cd platform-portal

# Copiar template de env
cp backstage/.env.example backstage/.env
# Editar com o teu GITHUB_TOKEN e credenciais OAuth
```

### 2. Iniciar tudo com 1 comando

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh dev
```

O script irá:
1. ✅ Verificar pré-requisitos
2. ✅ Iniciar PostgreSQL + Redis via Docker Compose
3. ✅ Instalar dependências Node.js
4. ✅ Iniciar Backstage em modo desenvolvimento

### 3. Aceder ao portal

| URL | Descrição |
|-----|-----------|
| http://localhost:3000 | Platform Portal |
| http://localhost:3000/catalog | Software Catalog |
| http://localhost:3000/create | Software Templates |
| http://localhost:3000/docs | TechDocs |
| http://localhost:9090 | Prometheus |
| http://localhost:3001 | Grafana |

---

## 🚀 Deploy em Produção

### Requisitos

- Cluster EKS configurado
- Terraform ≥ 1.6
- Helm ≥ 3.13
- AWS CLI com permissões adequadas

### 1. Provisionar infraestrutura com Terraform

```bash
cd terraform

# Copiar e editar variáveis
cp terraform.tfvars.example terraform.tfvars
# Editar: environment, aws_region, platform_admin_role_arn, etc.

# Inicializar e aplicar
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### 2. Deploy do Backstage

```bash
# Configurar kubectl
aws eks update-kubeconfig --region eu-west-1 --name platform-portal-cluster

# Criar secrets (External Secrets Operator necessário)
kubectl apply -f helm/kubernetes-secrets.yaml

# Deploy via Helm
helm upgrade --install backstage \
  oci://ghcr.io/backstage/charts/backstage \
  --namespace backstage \
  --create-namespace \
  --values helm/backstage-values.yaml \
  --wait --timeout 15m

# Verificar
kubectl get pods -n backstage
kubectl get ingress -n backstage
```

Ou simplesmente:

```bash
./scripts/setup.sh production
```

---

## 📋 Adicionar Serviços ao Catálogo

### Opção A: Ficheiro por ficheiro

Cria `catalog-info.yaml` no repositório do serviço:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: meu-servico
  description: "Descrição do serviço"
  annotations:
    github.com/project-slug: minha-org/meu-servico
    backstage.io/techdocs-ref: dir:.
spec:
  type: service
  lifecycle: production
  owner: team-backend
  system: ecommerce
```

E regista-o em `catalog/services/meu-servico.yaml`.

### Opção B: Auto-discovery (produção)

Em `app-config.production.yaml`, o GitHub Discovery analisa todos os repositórios da organização automaticamente:

```yaml
catalog:
  locations:
    - type: github-discovery
      target: https://github.com/minha-org/*/blob/main/catalog-info.yaml
```

---

## 🛠️ Criar um Novo Serviço via Template

1. Acede a http://localhost:3000/create
2. Escolhe **"🐍 Python Microservice (FastAPI)"**
3. Preenche o formulário (nome, owner, BD, etc.)
4. Clica **"Create"**

Em menos de 2 minutos tens:
- ✅ Repositório GitHub criado com estrutura completa
- ✅ `Dockerfile` multi-stage optimizado
- ✅ GitHub Actions CI/CD configurado (lint → test → build → deploy)
- ✅ `catalog-info.yaml` com todas as anotações
- ✅ `mkdocs.yml` + documentação base (TechDocs)
- ✅ Registado automaticamente no Software Catalog

---

## 🔌 Plugins

| Plugin | Configuração |
|--------|-------------|
| Kubernetes | `app-config.yaml` → `kubernetes:` |
| GitHub Actions | Anotação `github.com/project-slug` |
| TechDocs | Anotação `backstage.io/techdocs-ref` |
| DORA Metrics | `app-config.yaml` → `customMetrics:` |
| Cost Insights | `app-config.yaml` → `costInsights:` |
| Search | Activo por omissão |

---

## 📊 Métricas DORA

O plugin custom `custom-metrics` expõe as 4 métricas DORA por serviço:

| Métrica | Elite | High | Medium | Low |
|---------|-------|------|--------|-----|
| **Deployment Frequency** | > 1/dia | 1/semana | 1/mês | < 1/mês |
| **Lead Time for Changes** | < 1h | < 1 dia | < 1 semana | > 1 semana |
| **MTTR** | < 1h | < 1 dia | < 1 semana | > 1 semana |
| **Change Failure Rate** | < 5% | < 10% | < 15% | > 15% |

Os dados são recolhidos via:
- **Deployment Frequency & Lead Time**: GitHub Actions + GitHub API
- **MTTR**: PagerDuty API
- **Change Failure Rate**: GitHub deployments + PagerDuty incidents

---

## 🤝 Contribuir

### Adicionar um novo template

1. Cria directório em `catalog/templates/<nome>/`
2. Define `template.yaml` com parâmetros e steps
3. Cria `skeleton/` com os ficheiros gerados
4. Adiciona ao `app-config.yaml`
5. Abre PR — a pipeline valida automaticamente

### Adicionar um novo plugin

```bash
cd backstage
yarn add --cwd packages/app @backstage/plugin-<nome>
yarn add --cwd packages/backend @backstage/plugin-<nome>-backend
```

### Reportar problemas

- 🐛 Bug: [Abrir issue](https://github.com/minha-org/platform-portal/issues/new?template=bug.md)
- 💡 Feature request: [#platform-eng](https://slack.empresa.com/channels/platform-eng) no Slack
- 📖 Docs: PR directo neste repositório

---

## 📄 Licença

MIT — ver [LICENSE](LICENSE)

---

<div align="center">

Mantido com ❤️ pela equipa de **Platform Engineering**  
[platform@empresa.com](mailto:platform@empresa.com) · [#platform-eng](https://slack.empresa.com/channels/platform-eng)

**"We build the platform so developers build the product"**

</div>
