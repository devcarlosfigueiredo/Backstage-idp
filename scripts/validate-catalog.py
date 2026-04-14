#!/usr/bin/env python3
"""
validate-catalog.py
Valida que todas as entidades do catálogo têm as annotations obrigatórias
e seguem os padrões definidos pela equipa de Platform Engineering.
"""

import os
import sys
import glob
import yaml
from pathlib import Path
from dataclasses import dataclass
from typing import List, Optional

# ─── Regras de validação ──────────────────────────────────────────────────────

REQUIRED_ANNOTATIONS_BY_KIND = {
    "Component": [
        "github.com/project-slug",
        "backstage.io/techdocs-ref",
    ],
    "Template": [],
    "API": [],
    "Resource": [],
    "System": [],
    "Group": [],
    "User": [],
}

VALID_LIFECYCLES = {"experimental", "production", "deprecated"}
VALID_COMPONENT_TYPES = {"service", "library", "website", "documentation"}
VALID_API_TYPES = {"openapi", "asyncapi", "graphql", "grpc"}

NAME_PATTERN = r"^[a-z][a-z0-9-]*[a-z0-9]$"

import re

@dataclass
class ValidationError:
    file: str
    entity_name: str
    message: str
    severity: str = "ERROR"  # ERROR | WARNING

def validate_entity(entity: dict, filepath: str) -> List[ValidationError]:
    errors = []
    name = entity.get("metadata", {}).get("name", "UNKNOWN")

    kind = entity.get("kind", "")
    metadata = entity.get("metadata", {})
    spec = entity.get("spec", {})
    annotations = metadata.get("annotations", {})

    # ── Validar nome (kebab-case) ──────────────────────────────────────────────
    if name != "UNKNOWN" and not re.match(NAME_PATTERN, name):
        errors.append(ValidationError(
            file=filepath,
            entity_name=name,
            message=f"Nome '{name}' deve ser kebab-case (ex: minha-api)",
        ))

    # ── Validar annotations obrigatórias ──────────────────────────────────────
    required = REQUIRED_ANNOTATIONS_BY_KIND.get(kind, [])
    for annotation in required:
        if annotation not in annotations:
            errors.append(ValidationError(
                file=filepath,
                entity_name=name,
                message=f"Annotation obrigatória em falta: '{annotation}'",
            ))

    # ── Validar lifecycle ──────────────────────────────────────────────────────
    lifecycle = spec.get("lifecycle")
    if lifecycle and lifecycle not in VALID_LIFECYCLES:
        errors.append(ValidationError(
            file=filepath,
            entity_name=name,
            message=f"Lifecycle inválido: '{lifecycle}'. Permitidos: {VALID_LIFECYCLES}",
        ))

    # ── Validar Component type ─────────────────────────────────────────────────
    if kind == "Component":
        comp_type = spec.get("type")
        if comp_type and comp_type not in VALID_COMPONENT_TYPES:
            errors.append(ValidationError(
                file=filepath,
                entity_name=name,
                message=f"Component type inválido: '{comp_type}'. Permitidos: {VALID_COMPONENT_TYPES}",
                severity="WARNING",
            ))

        # Owner obrigatório em Components de produção
        if lifecycle == "production" and not spec.get("owner"):
            errors.append(ValidationError(
                file=filepath,
                entity_name=name,
                message="Components em produção devem ter 'owner' definido",
            ))

    # ── Validar API type ───────────────────────────────────────────────────────
    if kind == "API":
        api_type = spec.get("type")
        if api_type and api_type not in VALID_API_TYPES:
            errors.append(ValidationError(
                file=filepath,
                entity_name=name,
                message=f"API type inválido: '{api_type}'. Permitidos: {VALID_API_TYPES}",
            ))

    # ── Verificar description ──────────────────────────────────────────────────
    if not metadata.get("description"):
        errors.append(ValidationError(
            file=filepath,
            entity_name=name,
            message="Entidade sem 'description' — adiciona uma descrição clara",
            severity="WARNING",
        ))

    return errors

def main() -> int:
    catalog_dir = Path("catalog")
    if not catalog_dir.exists():
        print("❌ Directório 'catalog/' não encontrado")
        return 1

    yaml_files = list(catalog_dir.rglob("*.yaml")) + list(catalog_dir.rglob("*.yml"))
    
    all_errors: List[ValidationError] = []
    entities_validated = 0

    for yaml_file in yaml_files:
        filepath = str(yaml_file)
        try:
            with open(yaml_file) as f:
                # Suporta múltiplos documentos YAML no mesmo ficheiro
                documents = list(yaml.safe_load_all(f))

            for doc in documents:
                if not isinstance(doc, dict):
                    continue
                if "kind" not in doc:
                    continue

                # Só validar entidades Backstage
                api_version = doc.get("apiVersion", "")
                if not api_version.startswith("backstage.io"):
                    continue

                errors = validate_entity(doc, filepath)
                all_errors.extend(errors)
                entities_validated += 1

        except yaml.YAMLError as e:
            all_errors.append(ValidationError(
                file=filepath,
                entity_name="N/A",
                message=f"Erro de sintaxe YAML: {e}",
            ))
        except Exception as e:
            all_errors.append(ValidationError(
                file=filepath,
                entity_name="N/A",
                message=f"Erro ao processar ficheiro: {e}",
            ))

    # ── Relatório ──────────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"📋 VALIDAÇÃO DO CATÁLOGO BACKSTAGE")
    print(f"{'='*60}")
    print(f"📁 Ficheiros YAML: {len(yaml_files)}")
    print(f"✅ Entidades validadas: {entities_validated}")

    errors = [e for e in all_errors if e.severity == "ERROR"]
    warnings = [e for e in all_errors if e.severity == "WARNING"]

    if warnings:
        print(f"\n⚠️  WARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"  [{w.file}] {w.entity_name}: {w.message}")

    if errors:
        print(f"\n❌ ERRORS ({len(errors)}):")
        for e in errors:
            print(f"  [{e.file}] {e.entity_name}: {e.message}")
        print(f"\n💥 Validação falhou com {len(errors)} erro(s)")
        return 1

    print(f"\n🎉 Todas as entidades são válidas!")
    if warnings:
        print(f"⚠️  {len(warnings)} warning(s) para rever")
    return 0


if __name__ == "__main__":
    sys.exit(main())
