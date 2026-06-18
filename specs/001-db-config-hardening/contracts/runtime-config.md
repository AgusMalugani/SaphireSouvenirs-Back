# Contract: Runtime Bootstrap Configuration

**Feature**: 001-db-config-hardening  
**Type**: Internal startup contract (no HTTP API)

## Purpose

Define el comportamiento garantizado del backend al arrancar según variables de entorno.
Consumidores: `typeOrm.config.ts`, `main.ts`, operadores (Render/Neon).

## Input Contract

| Variable | Allowed values | Required |
|----------|----------------|----------|
| `NODE_ENV` | `development`, `production` | No (default `development`) |
| `DB_SYNCHRONIZE` | `true`, `false` | No (default por `NODE_ENV`) |
| `SEED_ON_STARTUP` | `true`, `false` | No (default `false`) |

## Output Contract (Effective Config)

| Field | Type | Guarantee |
|-------|------|-----------|
| `dropSchema` | `false` | Siempre `false` en todos los entornos |
| `synchronize` | `boolean` | `false` when `NODE_ENV=production`; else mirrors `DB_SYNCHRONIZE` default/override |
| `seedOnStartup` | `boolean` | `false` when `NODE_ENV=production`; else mirrors `SEED_ON_STARTUP` |

## Truth Table

| NODE_ENV | DB_SYNCHRONIZE (raw) | SEED_ON_STARTUP (raw) | synchronize (effective) | seedOnStartup (effective) |
|----------|----------------------|------------------------|-------------------------|---------------------------|
| development | true | false | true | false |
| development | false | true | false | true |
| development | true | true | true | true |
| production | true | false | **false** | false |
| production | true | true | **false** | **false** |
| production | false | true | false | **false** |

## Side Effects When `seedOnStartup` effective is `true`

Ejecutar en orden (comportamiento legacy):

1. `CategoriesSeed.seed()`
2. `ProductsSeed.seed()`
3. `UsersSeed.seed()`

Seeders mantienen idempotencia actual (no duplicar categorías/admin existentes).

## Production Misconfiguration

Si `NODE_ENV=production` y `SEED_ON_STARTUP=true` (raw):

- **MUST NOT** ejecutar seeders
- **SHOULD** emitir log de advertencia
- **MUST NOT** abortar arranque por esta condición sola

## Versioning

Cambios a esta matriz requieren nueva feature SDD y bump de contrato.
