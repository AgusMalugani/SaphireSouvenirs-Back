# Data Model: 001-db-config-hardening

Esta feature no modifica entidades TypeORM ni tablas PostgreSQL. El modelo documenta
**variables de entorno** y **configuración efectiva de arranque**.

## Environment Variables (input)

| Variable | Tipo | Default | Validación |
|----------|------|---------|------------|
| `NODE_ENV` | enum | `development` | `development` \| `production` |
| `DB_SYNCHRONIZE` | boolean | `true` en dev, `false` en prod | string `true`/`false` |
| `SEED_ON_STARTUP` | boolean | `false` | string `true`/`false` |

Variables existentes sin cambio: `DATABASE_URL`, `PORT`, credenciales JWT/Cloudinary/etc.

## RuntimeConfigInput (parsed)

| Campo | Fuente |
|-------|--------|
| `nodeEnvironment` | `envs.NODE_ENV` |
| `dbSynchronize` | `envs.DB_SYNCHRONIZE` (post-default) |
| `seedOnStartup` | `envs.SEED_ON_STARTUP` |

## EffectiveRuntimeConfig (output)

| Campo | Regla | Siempre |
|-------|-------|---------|
| `dropSchema` | Constante | `false` |
| `synchronize` | `dbSynchronize` si `development`; `false` si `production` | — |
| `seedOnStartup` | `seedOnStartup` si `development`; `false` si `production` | — |

## State Transitions

No aplica ciclo de vida de entidades de negocio. El único “estado” es la configuración
de arranque evaluada una vez al importar `envs.ts` / iniciar `bootstrap()`.

## Relationships

```text
process.env
    → envs.ts (Zod parse)
        → RuntimeConfigInput
            → resolveRuntimeConfig()
                → EffectiveRuntimeConfig
                    ├── typeOrm.config.ts (dropSchema, synchronize)
                    └── main.ts (seedOnStartup)
```
