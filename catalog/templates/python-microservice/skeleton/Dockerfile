# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM python:${{ values.pythonVersion }}-slim AS builder

WORKDIR /app

# Instalar dependências de sistema necessárias para compilar
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar uv (gestor de pacotes ultra-rápido)
RUN pip install uv

# Copiar ficheiros de dependências
COPY pyproject.toml uv.lock* ./

# Instalar dependências em /app/.venv (sem dev deps)
RUN uv sync --frozen --no-dev --no-editable

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM python:${{ values.pythonVersion }}-slim AS runtime

# Variáveis de ambiente para Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PATH="/app/.venv/bin:$PATH"

# Utilizador não-root (security best practice)
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copiar venv do builder
COPY --from=builder /app/.venv /app/.venv

# Copiar código da aplicação
COPY src/ ./src/

# Ajustar permissões
RUN chown -R appuser:appuser /app

USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/live || exit 1

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
