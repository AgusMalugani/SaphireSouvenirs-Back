# Implementation Plan: Hardening de configuración de base de datos y seeders

**Branch**: `001-db-config-hardening` | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-db-config-hardening/spec.md`

## Summary

Alinear la configuración de arranque del backend con la constitución v1.0.0: eliminar
`dropSchema: true`, hacer `synchronize` condicional vía `envs.ts`, y ejecutar seeders
solo cuando `SEED_ON_STARTUP` lo permita (nunca en producción). Se introduce una
función pura `resolveRuntimeConfig` para centralizar la matriz de decisiones y
cubrirla con tests unitarios sin PostgreSQL.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js LTS

**Primary Dependencies**: NestJS 10, TypeORM 0.3, Zod 4, Jest 29

**Storage**: PostgreSQL (Neon) — sin cambios de esquema ni entidades en esta feature

**Testing**: Jest unit tests en `src/config/resolveRuntimeConfig.spec.ts`

**Target Platform**: Desarrollo local (Windows/macOS/Linux) + Render (production)

**Project Type**: Monolito NestJS REST API (`SaphireSouvenirs-Back`)

**Performance Goals**: Sin impacto medible en arranque (solo evaluación de flags)

**Constraints**: Sin `process.env` en `src/` salvo parseo inicial en `envs.ts`; sin
modificar `@Entity`; sin endpoints nuevos; sin migrations

**Scale/Scope**: 5 archivos fuente modificados/creados, 1 test file, 1 `.env.example`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Reference: `.specify/memory/constitution.md` (v1.0.0)

- [x] Lógica de negocio en `Services` — N/A (feature solo config/bootstrap)
- [x] Variables de entorno solo vía `src/config/envs.ts` + `.env.example` actualizado
- [x] Endpoints nuevos — N/A (sin rutas HTTP)
- [x] Rutas admin — N/A
- [x] Swagger — N/A (sin controllers/DTOs nuevos)
- [x] Persistencia: `dropSchema: false`; `synchronize` condicional vía `envs` (off en production)
- [x] Cambios en `@Entity` — N/A (ninguna modificación de entidades)
- [x] Tests unitarios de resolución de config definidos en este plan
- [x] Envelope `{ data: T }` — N/A
- [x] Workflow SDD: specify ✅ → clarify ✅ → plan (este doc) → tasks → analyze

**Post-design re-check**: Sin violaciones. No se requiere Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-db-config-hardening/
├── spec.md
├── plan.md              # Este archivo
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── runtime-config.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── config/
│   ├── envs.ts                    # MODIFY: NODE_ENV, DB_SYNCHRONIZE, SEED_ON_STARTUP
│   ├── resolveRuntimeConfig.ts    # CREATE: función pura de config efectiva
│   ├── resolveRuntimeConfig.spec.ts # CREATE: tests unitarios
│   └── typeOrm.config.ts          # MODIFY: dropSchema false, synchronize resuelto
└── main.ts                        # MODIFY: seeders condicionales

.env.example                       # MODIFY: documentar nuevas variables
```

**Structure Decision**: Configuración centralizada en `src/config/` siguiendo el patrón
existente (`envs.ts` + `typeOrm.config.ts`). La lógica de overrides de producción vive
en `resolveRuntimeConfig.ts` (testeable sin Nest).

## Phase 0: Research

Ver [research.md](./research.md) — todas las decisiones resueltas, sin NEEDS CLARIFICATION.

## Phase 1: Design

| Artefacto | Propósito |
|-----------|-----------|
| [data-model.md](./data-model.md) | Variables de entorno y config efectiva |
| [contracts/runtime-config.md](./contracts/runtime-config.md) | Matriz de comportamiento en arranque |
| [quickstart.md](./quickstart.md) | Validación manual post-implementación |

## Implementation Approach

### 1. `src/config/resolveRuntimeConfig.ts` (nuevo)

Función pura exportada:

```typescript
export type NodeEnvironment = 'development' | 'production';

export interface RuntimeConfigInput {
  nodeEnvironment: NodeEnvironment;
  dbSynchronize: boolean;
  seedOnStartup: boolean;
}

export interface EffectiveRuntimeConfig {
  dropSchema: false;
  synchronize: boolean;
  seedOnStartup: boolean;
}

export function resolveRuntimeConfig(input: RuntimeConfigInput): EffectiveRuntimeConfig
```

**Reglas**:

| Condición | `synchronize` efectivo | `seedOnStartup` efectivo |
|-----------|------------------------|--------------------------|
| `production` | siempre `false` | siempre `false` |
| `development` + `DB_SYNCHRONIZE` | valor del flag | — |
| `development` + `SEED_ON_STARTUP` | — | valor del flag |
| `dropSchema` | siempre `false` | — |

En producción, si `seedOnStartup` raw es `true`, `main.ts` puede loguear advertencia
antes de resolver (o dentro de bootstrap).

### 2. `src/config/envs.ts`

Agregar al schema Zod:

- `NODE_ENV`: `z.enum(['development', 'production']).default('development')`
- `DB_SYNCHRONIZE`: boolean con default según `NODE_ENV` (usar `.superRefine` o
  `transform` post-parse, o defaults en schema con `z.preprocess`)
- `SEED_ON_STARTUP`: `default(false)` siempre

**Importante**: No usar `z.coerce.boolean()` directo sobre strings `"false"` (en JS
`Boolean("false") === true`). Usar helper `parseEnvBoolean` o `z.enum(['true','false'])`.

Exportar también `effectiveRuntimeConfig` derivado de `resolveRuntimeConfig(envs)` para
consumo en `typeOrm.config.ts` y `main.ts`.

### 3. `src/config/typeOrm.config.ts`

```typescript
dropSchema: false,  // fijo
synchronize: effectiveRuntimeConfig.synchronize,
```

### 4. `src/main.ts`

Envolver bloque de seeders:

```typescript
if (effectiveRuntimeConfig.seedOnStartup) {
  // categories, products, users seed
}
```

Opcional: `Logger.warn` si `envs.SEED_ON_STARTUP && envs.NODE_ENV === 'production'`.

### 5. Tests (`resolveRuntimeConfig.spec.ts`)

Matriz mínima (6+ casos):

- development + sync true/false
- development + seed true/false
- production + sync true (raw) → sync false
- production + seed true (raw) → seed false
- dropSchema siempre false en todos los casos

### 6. `.env.example`

```env
NODE_ENV=development
DB_SYNCHRONIZE=true
SEED_ON_STARTUP=false
```

## Complexity Tracking

> Sin violaciones de constitución que requieran justificación.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Risks & Mitigations

| Riesgo | Mitigación |
|--------|------------|
| Render sin `NODE_ENV` | Documentar en quickstart; default `development` solo local; Render debe setear `production` |
| Dev sin seed la primera vez | Documentar `SEED_ON_STARTUP=true` en quickstart para bootstrap inicial |
| Zod boolean parsing | Helper explícito documentado en research.md |

## Next Step

Ejecutar `/speckit-tasks` para generar `tasks.md` atómico, luego `/speckit-analyze`.
