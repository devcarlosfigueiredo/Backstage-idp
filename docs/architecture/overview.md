# Arquitectura do Platform Portal

## Visão Geral

O **Platform Portal** é uma Internal Developer Platform (IDP) construída sobre o [Backstage](https://backstage.io) da Spotify. Centraliza todos os serviços, APIs, templates e documentação técnica da empresa num único ponto de acesso para developers.

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                    Platform Portal (Backstage)                   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Software    │  │  Software    │  │      TechDocs        │  │
│  │  Catalog     │  │  Templates   │  │  (MkDocs + S3)       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘  │
│         │                 │                                      │
│  ┌──────┴───────────────┐ │  ┌──────────────────────────────┐  │
│  │   Plugin Ecosystem   │ │  │    Search (Lunr / Elastic)   │  │
│  │  • Kubernetes        │ │  └──────────────────────────────┘  │
│  │  • DORA Metrics      │ │                                     │
│  │  • Cost Insights     │ │                                     │
│  │  • GitHub            │ │                                     │
│  └──────────────────────┘ │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
          ┌─────────────────┴──────────────────┐
          ▼                                    ▼
┌──────────────────┐                ┌──────────────────┐
│   GitHub API     │                │  Kubernetes API  │
│  • Catalog auto  │                │  • Deployments   │
│  • PRs / Issues  │                │  • Pod status    │
│  • Actions       │                │  • Logs          │
└──────────────────┘                └──────────────────┘
          │
          ▼
┌──────────────────┐    ┌──────────────────┐
│   Prometheus     │    │  AWS Services    │
│  • DORA metrics  │    │  • RDS Postgres  │
│  • SLO / SLI     │    │  • ElastiCache   │
│  • Alerting      │    │  • S3 (TechDocs) │
└──────────────────┘    └──────────────────┘
```

## Fluxo: Criação de Novo Serviço (Golden Path)

```
Developer → Portal (Software Template)
                │
                ▼
         Preenche formulário
         (nome, owner, BD, etc.)
                │
                ▼
    Backstage Scaffolder executa:
    ┌─────────────────────────────┐
    │ 1. fetch:template           │ ← Gera código a partir do skeleton
    │ 2. publish:github           │ ← Cria repositório no GitHub
    │ 3. catalog:register         │ ← Regista no Software Catalog
    └─────────────────────────────┘
                │
                ▼
    GitHub Actions (CI/CD) dispara:
    ┌─────────────────────────────┐
    │ lint → test → build → push  │ ← Image para GHCR
    │ deploy staging → production │ ← Helm upgrade no EKS
    └─────────────────────────────┘
                │
                ▼
    Serviço visível no Portal com:
    • Status dos deployments (K8s plugin)
    • Métricas DORA (custom-metrics plugin)
    • Documentação (TechDocs)
    • Custo (cost-insights plugin)
```

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| Portal | Backstage (Spotify) | 1.x |
| Frontend | React + TypeScript | 18 / 5 |
| Backend | Node.js + Express | 20 LTS |
| Base de dados | PostgreSQL (RDS) | 15 |
| Cache | Redis (ElastiCache) | 7 |
| Docs storage | AWS S3 | — |
| Container | Docker multi-stage | — |
| Orquestração | Kubernetes (EKS) | 1.29 |
| Deploy | Helm Chart oficial | 1.8.x |
| IaC | Terraform | ≥ 1.6 |
| CI/CD | GitHub Actions | — |
| Métricas | Prometheus + Grafana | 2.48 / 10 |
| Secrets | AWS Secrets Manager | — |
| Auth | GitHub OAuth | — |

## Plugins Activos

| Plugin | Função | Fonte |
|--------|---------|-------|
| `@backstage/plugin-catalog` | Software Catalog | Core |
| `@backstage/plugin-scaffolder` | Software Templates | Core |
| `@backstage/plugin-techdocs` | Documentação | Core |
| `@backstage/plugin-search` | Pesquisa global | Core |
| `@backstage/plugin-kubernetes` | Status K8s por serviço | Oficial |
| `@backstage/plugin-github-actions` | CI/CD no portal | Oficial |
| `@backstage/plugin-github-pull-requests-board` | PRs no portal | Oficial |
| `@backstage-community/plugin-cost-insights` | Custo por serviço | Community |
| `./plugins/custom-metrics` | Métricas DORA | Custom |

## Segurança

- **Autenticação**: GitHub OAuth (SSO)
- **Autorização**: Backstage RBAC (rbac-backend plugin)
- **Secrets**: External Secrets Operator → AWS Secrets Manager
- **Rede**: VPC privada, acesso via ALB com TLS terminado
- **IRSA**: Backstage usa IAM role via OIDC (sem credenciais estáticas)
- **Imagens**: scan de vulnerabilidades com Trivy em cada build

## Decisões de Arquitectura (ADRs)

### ADR-001: PostgreSQL como backend do Backstage
**Decisão**: Usar RDS PostgreSQL em vez de SQLite.  
**Razão**: SQLite não suporta múltiplas réplicas (HA). PostgreSQL permite escalabilidade horizontal.

### ADR-002: S3 para armazenamento de TechDocs
**Decisão**: TechDocs publicadas em S3 em vez de geração local.  
**Razão**: Geração local sobrecarrega o Backstage em produção com muitos serviços.

### ADR-003: External Secrets Operator para secrets
**Decisão**: ESO em vez de secrets Kubernetes manuais.  
**Razão**: Rotação automática, auditoria e single source of truth (AWS Secrets Manager).
