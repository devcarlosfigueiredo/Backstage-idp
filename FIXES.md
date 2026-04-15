# 🔧 Guia de Correcções — 3 Problemas Identificados

## Problema 1: Badges com `?` no README

**Causa**: As URLs dos badges apontavam para `minha-org/platform-portal`
mas o teu repositório é `devcarlosfigueiredo/Backstage-idp`.

**✅ Já corrigido** no `README.md`:
```markdown
# ANTES (errado):
[![Deploy](https://github.com/minha-org/platform-portal/actions/...

# DEPOIS (correcto):
[![Deploy](https://github.com/devcarlosfigueiredo/Backstage-idp/actions/...
```

**Nota**: Os badges só ficam verdes depois dos workflows correrem pelo menos 1 vez.

---

## Problema 2: Terraform errors no `main.tf`

**Causa**: O bloco `kubernetes {}` dentro do `provider "helm" {}` foi
removido do Helm provider ≥ 2.0 e substituído por kubeconfig externo.

**✅ Já corrigido** — criado `terraform/providers.tf` separado:

```hcl
# ANTES (errado — causava os 3 erros):
provider "helm" {
  kubernetes {                    # ← ERRO: bloco não esperado aqui
    host = module.eks.cluster_endpoint
    ...
  }
}
resource "helm_release" "backstage" {
  set { ... }                     # ← ERRO: set não esperado (era sintaxe antiga)
}

# DEPOIS (correcto — em providers.tf):
provider "helm" {
  kubernetes {
    config_path    = "~/.kube/config"
    config_context = "arn:aws:eks:eu-west-1:ACCOUNT_ID:cluster/platform-portal-cluster"
  }
}
```

**Como usar**: antes do `terraform apply`, correr:
```bash
aws eks update-kubeconfig \
  --region eu-west-1 \
  --name platform-portal-cluster
```

---

## Problema 3: Workflows não aparecem no GitHub

**Causa**: A estrutura do repositório foi enviada com os ficheiros dentro
de uma pasta `backstage-idp/` em vez de na raiz do repo.

**O GitHub Actions SÓ reconhece workflows em `.github/workflows/` na RAIZ do repo.**

### Opção A: Mover ficheiros para a raiz (recomendado)

No teu repositório local, executar:

```bash
# Entrar na pasta do projecto
cd backstage-idp/

# Mover TUDO para o nível acima (raiz do repo)
mv * ../ 2>/dev/null; mv .github ../ 2>/dev/null; mv .gitignore ../ 2>/dev/null; mv .yamllint.yaml ../ 2>/dev/null; mv .env.example ../ 2>/dev/null

# Subir para a raiz
cd ..

# Verificar que a estrutura está correcta
ls -la
# Deve mostrar: README.md, backstage/, catalog/, terraform/, helm/, .github/, etc.
ls -la .github/workflows/
# Deve mostrar: deploy-backstage.yml, validate-catalog.yml

# Commit e push
git add -A
git commit -m "fix: mover ficheiros para raiz do repositório"
git push origin main
```

### Opção B: Editar os workflows para apontar para a subpasta

Se preferires manter a subpasta `backstage-idp/`, editar
`.github/workflows/deploy-backstage.yml`:

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'backstage-idp/backstage/**'   # ← adicionar prefixo
      - 'backstage-idp/helm/**'
```

### Verificar no GitHub

Após o push, ir a:
`https://github.com/devcarlosfigueiredo/Backstage-idp/actions`

Deves ver os 2 workflows listados:
- `🚀 Deploy Platform Portal (Backstage)`
- `📋 Validate Catalog Entities`

---

## Resumo das correcções aplicadas

| Ficheiro | O que mudou |
|---------|-------------|
| `README.md` | URLs dos badges corrigidas para `devcarlosfigueiredo/Backstage-idp` |
| `terraform/main.tf` | Removido `provider "helm" { kubernetes {} }` e `set_list {}` |
| `terraform/providers.tf` | **Novo** — provider Helm e Kubernetes via kubeconfig |
| `FIXES.md` | **Novo** — este guia |

---

## Estrutura correcta do repositório no GitHub

```
Backstage-idp/                  ← raiz do repo
├── .github/
│   └── workflows/
│       ├── deploy-backstage.yml    ← GitHub Actions encontra aqui
│       └── validate-catalog.yml   ← GitHub Actions encontra aqui
├── backstage/
├── catalog/
├── terraform/
├── helm/
├── docs/
├── scripts/
├── docker-compose.dev.yaml
├── README.md
└── .gitignore
```
