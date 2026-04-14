# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS build

# Instalar dependências de sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    g++ \
    build-essential \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Activar Corepack (Yarn Berry)
RUN corepack enable

WORKDIR /app

# Copiar manifests de dependências
COPY .yarn ./.yarn
COPY .yarnrc.yml package.json yarn.lock ./
COPY packages/app/package.json ./packages/app/
COPY packages/backend/package.json ./packages/backend/

# Instalar TODAS as deps (incluindo dev para build)
RUN yarn workspaces focus --all

# Copiar código fonte completo
COPY . .

# Build do frontend (app) e backend
RUN yarn tsc
RUN yarn build:backend --config ../../app-config.yaml

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    # Para TechDocs local (geração de MkDocs)
    python3 \
    python3-pip \
    # mkdocs e plugins
    && pip3 install mkdocs mkdocs-techdocs-core --break-system-packages \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# Utilizador não-root
RUN groupadd --gid 1000 node && \
    useradd --uid 1000 --gid node --shell /bin/bash --create-home node

WORKDIR /app

# Copiar apenas o que é necessário em runtime
COPY --from=build --chown=node:node /app/yarn.lock /app/package.json /app/.yarnrc.yml ./
COPY --from=build --chown=node:node /app/.yarn ./.yarn
COPY --from=build --chown=node:node /app/packages/backend/dist ./packages/backend/dist
COPY --from=build --chown=node:node /app/packages/backend/package.json ./packages/backend/
# Static files do frontend (servidos pelo backend)
COPY --from=build --chown=node:node /app/packages/app/dist ./packages/app/dist

# Instalar apenas dependências de produção
RUN yarn workspaces focus --all --production && \
    yarn cache clean

USER node

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:7007/healthcheck', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

EXPOSE 7007

CMD ["node", "packages/backend/dist/index.js", "--config", "app-config.yaml", "--config", "app-config.production.yaml"]
