"""
${{ values.name }} — Microserviço Python/FastAPI
Gerado pelo Platform Portal (Backstage)
Owner: ${{ values.owner }} | Sistema: ${{ values.system }}
"""

from contextlib import asynccontextmanager
from typing import Generator

import structlog
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from .config import Settings, get_settings
from .routers import health, items
{% if values.database != 'none' %}
from .database import engine, Base, get_db
{% endif %}
{% if values.enableRedis %}
from .cache import get_redis
{% endif %}

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> Generator:
    """Startup e shutdown do serviço."""
    settings = get_settings()
    logger.info("starting_service", name="${{ values.name }}", env=settings.environment)
    {% if values.database != 'none' %}
    # Criar tabelas (em produção usar Alembic migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("database_connected")
    {% endif %}
    yield
    logger.info("shutting_down_service")


app = FastAPI(
    title="${{ values.name }}",
    description="${{ values.description }}",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ─── Middlewares ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # configurar em produção
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Prometheus Metrics ───────────────────────────────────────────────────────
Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    excluded_handlers=["/health", "/metrics"],
).instrument(app).expose(app)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(items.router, prefix="/api/v1", tags=["items"])


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    logger.warning("http_error", status=exc.status_code, detail=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status": exc.status_code},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    logger.error("unhandled_error", error=str(exc), exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "status": 500},
    )
