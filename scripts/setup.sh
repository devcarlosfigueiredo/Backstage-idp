#!/usr/bin/env bash
###############################################################################
# setup.sh — Bootstrap completo do Platform Portal (Backstage)
# Uso: ./scripts/setup.sh [dev|staging|production]
###############################################################################

set -euo pipefail

# ─── Cores ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
BOLD='\033[1m'

log()     { echo -e "${GREEN}[✔]${NC} $*"; }
warn()    { echo -e "${YELLOW}[⚠]${NC} $*"; }
error()   { echo -e "${RED}[✘]${NC} $*" >&2; }
header()  { echo -e "\n${BLUE}${BOLD}══════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $*${NC}"; echo -e "${BLUE}${BOLD}══════════════════════════════════════${NC}\n"; }
step()    { echo -e "${BOLD}→ $*${NC}"; }

ENVIRONMENT="${1:-dev}"

header "🚀 Platform Portal — Setup ($ENVIRONMENT)"

# ─── Verificar pré-requisitos ─────────────────────────────────────────────────
header "1. Verificar pré-requisitos"

check_cmd() {
    if command -v "$1" &>/dev/null; then
        log "$1 encontrado: $(command -v "$1")"
    else
        error "$1 não encontrado — instalar antes de continuar"
        exit 1
    fi
}

check_version() {
    local cmd="$1" min_version="$2" current
    current=$($cmd --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
    log "$cmd v$current (mínimo: v$min_version)"
}

check_cmd node
check_cmd yarn
check_cmd docker
check_cmd git

check_version node "18"
check_version yarn "3"

if [[ "$ENVIRONMENT" != "dev" ]]; then
    check_cmd kubectl
    check_cmd helm
    check_cmd aws
    check_cmd terraform
fi

# ─── Criar .env se não existir ────────────────────────────────────────────────
header "2. Configurar variáveis de ambiente"

if [[ ! -f "backstage/.env" ]]; then
    step "A criar backstage/.env a partir do template..."
    cp backstage/.env.example backstage/.env
    warn "Edita backstage/.env com os teus valores antes de continuar!"
    warn "Mínimo obrigatório: GITHUB_TOKEN, AUTH_GITHUB_CLIENT_ID, AUTH_GITHUB_CLIENT_SECRET"

    if [[ "$ENVIRONMENT" == "dev" ]]; then
        warn "Para desenvolvimento, podes usar um token GitHub pessoal com scopes: read:org, repo"
        read -rp "$(echo -e "${YELLOW}Pressiona ENTER para abrir o .env no editor...${NC}")" 
        "${EDITOR:-nano}" backstage/.env
    fi
else
    log ".env já existe — a usar configuração existente"
fi

# ─── Instalar dependências Node.js ────────────────────────────────────────────
header "3. Instalar dependências Node.js"

step "A instalar dependências do Backstage..."
cd backstage
yarn install --frozen-lockfile
cd ..
log "Dependências instaladas com sucesso"

# ─── Modo desenvolvimento ─────────────────────────────────────────────────────
if [[ "$ENVIRONMENT" == "dev" ]]; then
    header "4. Iniciar Backstage em modo desenvolvimento"

    step "A iniciar PostgreSQL com Docker Compose..."
    docker compose -f docker-compose.dev.yaml up -d postgres redis
    
    # Aguardar PostgreSQL ficar pronto
    step "A aguardar PostgreSQL..."
    for i in {1..30}; do
        if docker compose -f docker-compose.dev.yaml exec -T postgres pg_isready -U backstage &>/dev/null; then
            log "PostgreSQL pronto!"
            break
        fi
        echo -n "."
        sleep 2
    done

    log "A iniciar Backstage..."
    echo ""
    echo -e "${GREEN}${BOLD}╔═══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}${BOLD}║  🚀 Platform Portal a iniciar...              ║${NC}"
    echo -e "${GREEN}${BOLD}║                                               ║${NC}"
    echo -e "${GREEN}${BOLD}║  Portal:   http://localhost:3000              ║${NC}"
    echo -e "${GREEN}${BOLD}║  Backend:  http://localhost:7007              ║${NC}"
    echo -e "${GREEN}${BOLD}║  API Docs: http://localhost:7007/api          ║${NC}"
    echo -e "${GREEN}${BOLD}╚═══════════════════════════════════════════════╝${NC}"
    echo ""

    cd backstage && yarn dev

# ─── Modo produção / staging ──────────────────────────────────────────────────
else
    header "4. Deploy em Kubernetes ($ENVIRONMENT)"

    step "A configurar AWS credentials..."
    aws sts get-caller-identity

    step "A configurar kubectl..."
    aws eks update-kubeconfig \
        --region eu-west-1 \
        --name platform-portal-cluster

    step "A verificar conectividade ao cluster..."
    kubectl cluster-info

    step "A criar namespace se não existir..."
    kubectl create namespace backstage --dry-run=client -o yaml | kubectl apply -f -

    step "A aplicar secrets (External Secrets Operator)..."
    kubectl apply -f helm/kubernetes-secrets.yaml

    step "A instalar/actualizar Backstage via Helm..."
    helm upgrade --install backstage \
        oci://ghcr.io/backstage/charts/backstage \
        --namespace backstage \
        --values helm/backstage-values.yaml \
        --wait \
        --timeout 15m \
        --atomic

    step "A verificar estado dos pods..."
    kubectl get pods -n backstage
    kubectl get ingress -n backstage

    log "✅ Deploy concluído!"
    echo ""
    echo -e "${GREEN}${BOLD}╔═══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}${BOLD}║  Platform Portal deployed!                    ║${NC}"
    echo -e "${GREEN}${BOLD}║                                               ║${NC}"
    echo -e "${GREEN}${BOLD}║  URL: https://platform.empresa.com            ║${NC}"
    echo -e "${GREEN}${BOLD}╚═══════════════════════════════════════════════╝${NC}"
fi
