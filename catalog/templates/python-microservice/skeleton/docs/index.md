# ${{ values.name | title }}

> ${{ values.description }}

## Visão Geral

Este serviço foi gerado pelo **Platform Portal** e segue os golden paths definidos pela equipa de Platform Engineering.

| Campo        | Valor                        |
|-------------|------------------------------|
| **Owner**    | ${{ values.owner }}         |
| **Sistema**  | ${{ values.system }}        |
| **Lifecycle**| ${{ values.lifecycle }}     |
| **Python**   | ${{ values.pythonVersion }} |

## Endpoints

| Método | Path          | Descrição           |
|--------|---------------|---------------------|
| GET    | `/health/live`  | Liveness probe      |
| GET    | `/health/ready` | Readiness probe     |
| GET    | `/metrics`      | Prometheus metrics  |
| GET    | `/docs`         | Swagger UI          |
| GET    | `/redoc`        | ReDoc               |

## Tecnologias

- **Framework**: FastAPI + Uvicorn
- **Python**: ${{ values.pythonVersion }}
- **Metrics**: Prometheus + Grafana
- **Containerização**: Docker multi-stage
- **Orquestração**: Kubernetes (EKS)
- **CI/CD**: GitHub Actions

## Quick Start

```bash
# Clonar repositório
git clone git@github.com:minha-org/${{ values.name }}.git
cd ${{ values.name }}

# Instalar dependências
uv sync

# Executar localmente
uv run uvicorn src.main:app --reload

# Aceder à API
open http://localhost:8000/docs
```

## Links Úteis

- [Repositório GitHub](https://github.com/minha-org/${{ values.name }})
- [Dashboard Grafana](https://grafana.empresa.com/d/${{ values.name }})
- [Alertas PagerDuty](https://empresa.pagerduty.com)
