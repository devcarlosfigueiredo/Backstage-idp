# Runbook — Platform Portal Operations

## 1. Verificar estado do Backstage

```bash
# Pods em execução
kubectl get pods -n backstage

# Logs em tempo real
kubectl logs -n backstage -l app.kubernetes.io/name=backstage -f

# Descrever pod com problemas
kubectl describe pod -n backstage <POD_NAME>

# Verificar eventos do namespace
kubectl get events -n backstage --sort-by='.lastTimestamp'
```

## 2. Rollback de deployment

```bash
# Ver histórico de releases Helm
helm history backstage -n backstage

# Rollback para a revisão anterior
helm rollback backstage -n backstage

# Rollback para uma revisão específica
helm rollback backstage 3 -n backstage

# Verificar estado após rollback
kubectl rollout status deployment/backstage -n backstage
```

## 3. Forçar refresh do catálogo

```bash
# Via API (requer token)
curl -X POST https://platform.empresa.com/api/catalog/refresh \
  -H "Authorization: Bearer $BACKSTAGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entityRef": "component:default/taskflow-api"}'

# Verificar estado de processamento
curl https://platform.empresa.com/api/catalog/entities \
  -H "Authorization: Bearer $BACKSTAGE_TOKEN" | jq '.[] | {name: .metadata.name, status: .status}'
```

## 4. Rotação de secrets

```bash
# Forçar sync do External Secrets Operator
kubectl annotate externalsecret backstage-secrets \
  -n backstage \
  force-sync=$(date +%s) \
  --overwrite

# Verificar sync
kubectl get externalsecret -n backstage
kubectl describe externalsecret backstage-secrets -n backstage
```

## 5. Debugging de Software Templates

```bash
# Ver logs do scaffolder
kubectl logs -n backstage \
  -l app.kubernetes.io/name=backstage \
  --since=1h \
  | grep -i "scaffolder\|template\|error"

# Listar tasks em execução/falha
curl https://platform.empresa.com/api/scaffolder/v2/tasks \
  -H "Authorization: Bearer $BACKSTAGE_TOKEN" \
  | jq '.[] | select(.status == "failed") | {id, status, spec: .spec.templateInfo.entityRef}'
```

## 6. Escalar manualmente

```bash
# Scale up (ex: durante pico de uso)
kubectl scale deployment backstage \
  --replicas=4 \
  -n backstage

# Verificar HPA
kubectl get hpa -n backstage
kubectl describe hpa backstage -n backstage
```

## 7. Verificar métricas e health

```bash
# Healthcheck
curl https://platform.empresa.com/healthcheck

# Métricas Prometheus expostas pelo Backstage
curl https://platform.empresa.com/metrics

# Ver alerts activos
curl -s http://prometheus:9090/api/v1/alerts \
  | jq '.data.alerts[] | select(.labels.alertname | contains("Backstage"))'
```

## 8. Backup da base de dados

```bash
# Dump manual do RDS via AWS CLI
aws rds create-db-snapshot \
  --db-instance-identifier platform-portal-postgres \
  --db-snapshot-identifier manual-backup-$(date +%Y%m%d-%H%M%S)

# Listar snapshots disponíveis
aws rds describe-db-snapshots \
  --db-instance-identifier platform-portal-postgres \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime,Status]' \
  --output table
```

## 9. Contacts & Escalation

| Situação | Contacto |
|---------|---------|
| Portal em baixo | #platform-eng (Slack) → PagerDuty |
| Bug em template | #platform-eng (Slack) |
| Pedido de novo serviço | Abrir issue no GitHub: minha-org/platform-requests |
| Acesso / permissões | platform@empresa.com |

**On-call**: Ver PagerDuty schedule → "Platform Engineering"
