---
description: "Task list for feature 001-db-config-hardening"
---

# Tasks: Hardening de configuración de base de datos y seeders

**Input**: Design documents from `specs/001-db-config-hardening/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/runtime-config.md

**Tests**: Incluidos (FR-008 / spec clarificación Q5) — unit tests en `resolveRuntimeConfig.spec.ts`

**Organization**: Tareas agrupadas por user story para entregas incrementales verificables.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Paralelizable (archivos distintos, sin dependencias pendientes)
- **[USn]**: User story del spec.md

## Path Conventions

- Backend monolito: `src/` en raíz del repositorio `SaphireSouvenirs-Back`

---

## Phase 1: Setup

**Purpose**: Alinear implementación con artefactos de diseño

- [x] T001 Revisar matriz de comportamiento en `specs/001-db-config-hardening/contracts/runtime-config.md` y variables en `specs/001-db-config-hardening/data-model.md` antes de codificar

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Lógica de resolución de config y variables de entorno — **bloquea todas las user stories**

**⚠️ CRITICAL**: No comenzar US1/US2/US3 hasta completar esta fase

- [x] T002 Crear `src/config/resolveRuntimeConfig.ts` con tipos `NodeEnvironment`, `RuntimeConfigInput`, `EffectiveRuntimeConfig` y función `resolveRuntimeConfig` según `specs/001-db-config-hardening/plan.md`
- [x] T003 [P] Crear `src/config/resolveRuntimeConfig.spec.ts` con casos de la matriz en `specs/001-db-config-hardening/contracts/runtime-config.md` (development/production × flags; `dropSchema` siempre false)
- [x] T004 Actualizar `src/config/envs.ts`: agregar `NODE_ENV`, `DB_SYNCHRONIZE`, `SEED_ON_STARTUP` con parseo seguro de booleanos (`parseEnvBoolean` o `z.enum(['true','false'])`); defaults según spec; exportar `effectiveRuntimeConfig` vía `resolveRuntimeConfig`
- [x] T005 [P] Actualizar `.env.example` con `NODE_ENV=development`, `DB_SYNCHRONIZE=true`, `SEED_ON_STARTUP=false` y comentarios breves

**Checkpoint**: `npm test -- resolveRuntimeConfig` pasa; `envs` valida nuevas variables al importar

---

## Phase 3: User Story 1 - Arranque seguro sin pérdida de datos (Priority: P1) 🎯 MVP

**Goal**: `dropSchema` efectivo siempre `false`; datos y esquema preservados en reinicios

**Independent Test**: Reiniciar la app 2+ veces contra la misma DB; tablas y registros intactos (ver `specs/001-db-config-hardening/quickstart.md` §2)

### Implementation for User Story 1

- [x] T006 [US1] Actualizar `src/config/typeOrm.config.ts`: fijar `dropSchema: false` e importar `synchronize` desde `effectiveRuntimeConfig` de `src/config/envs.ts`

**Checkpoint**: US1 verificable — arranque sin borrado de esquema en local y con `NODE_ENV=production`

---

## Phase 4: User Story 2 - Sincronización controlada por entorno (Priority: P2)

**Goal**: `synchronize` condicional en development; forzado `false` en production

**Independent Test**: Con `NODE_ENV=production` y `DB_SYNCHRONIZE=true`, arranque sin sync automático; tests unitarios confirman override

### Implementation for User Story 2

- [x] T007 [US2] Verificar que `src/config/typeOrm.config.ts` usa `effectiveRuntimeConfig.synchronize` (completado en T006; confirmar que no queda `synchronize: true` hardcodeado)
- [x] T008 [US2] Ejecutar `npm test -- resolveRuntimeConfig` y confirmar casos production + `DB_SYNCHRONIZE=true` → `synchronize` efectivo `false`

**Checkpoint**: US2 verificable — matriz de tests y quickstart §4 (simular production)

---

## Phase 5: User Story 3 - Seeders bajo demanda (Priority: P3)

**Goal**: Seeders solo con `SEED_ON_STARTUP` efectivo; nunca en production

**Independent Test**: Default sin logs de seed; con `SEED_ON_STARTUP=true` en dev sí ejecuta; en production nunca (ver `specs/001-db-config-hardening/quickstart.md` §2-4)

### Implementation for User Story 3

- [x] T009 [US3] Actualizar `src/main.ts`: envolver `CategoriesSeed`, `ProductsSeed` y `UsersSeed` en condicional `if (effectiveRuntimeConfig.seedOnStartup)`
- [x] T010 [US3] Agregar `Logger.warn` en `src/main.ts` cuando `envs.SEED_ON_STARTUP === true` y `envs.NODE_ENV === 'production'` antes de omitir seeders

**Checkpoint**: US3 verificable — sin seed en default; con flag en dev sí; production ignora flag

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validación final y documentación operativa

- [x] T011 Ejecutar `npm test` (suite completa) y corregir regresiones si las hay
- [x] T012 [P] Ejecutar validación manual de `specs/001-db-config-hardening/quickstart.md` (§1-4) y anotar resultados
- [x] T013 [P] Agregar manualmente al `.env` local (no commitear): `NODE_ENV`, `DB_SYNCHRONIZE`, `SEED_ON_STARTUP` siguiendo `.env.example`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias
- **Foundational (Phase 2)**: Depende de Setup — **bloquea US1, US2, US3**
- **US1 (Phase 3)**: Depende de Foundational (T002-T004)
- **US2 (Phase 4)**: Depende de T006; validación en T007-T008
- **US3 (Phase 5)**: Depende de Foundational (T004 `effectiveRuntimeConfig`)
- **Polish (Phase 6)**: Depende de US1 + US2 + US3

### User Story Dependencies

- **US1 (P1)**: Tras Phase 2 — MVP mínimo con solo T006
- **US2 (P2)**: Tras US1 (mismo archivo `typeOrm.config.ts`)
- **US3 (P3)**: Tras Phase 2; independiente de US1/US2 en archivos distintos (`main.ts` vs `typeOrm.config.ts`)

### Within Each Phase

- `resolveRuntimeConfig.ts` antes que `resolveRuntimeConfig.spec.ts` (o en paralelo si TDD estricto con stubs)
- `envs.ts` antes que `typeOrm.config.ts` y `main.ts`
- Tests unitarios antes de cerrar Phase 2 checkpoint

### Parallel Opportunities

- T003 y T005 en paralelo tras T002
- T011 y T012-T013 en paralelo al final
- US3 (T009-T010) puede iniciarse en paralelo con US1 (T006) **después** de T004, si dos desarrolladores

---

## Parallel Example: Foundational

```bash
# Tras T002, en paralelo:
Task T003: "Crear src/config/resolveRuntimeConfig.spec.ts"
Task T005: "Actualizar .env.example"
```

---

## Parallel Example: Post-Foundational

```bash
# Tras T004, en paralelo:
Task T006 [US1]: "Actualizar src/config/typeOrm.config.ts"
Task T009 [US3]: "Condicional seeders en src/main.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1 + Phase 2 (T001-T005)
2. Completar T006 [US1]
3. **STOP y VALIDAR**: quickstart §2 — reinicios sin pérdida de datos
4. Demo/deploy si listo

### Incremental Delivery

1. Foundational → base de config lista
2. US1 → `dropSchema` seguro (MVP)
3. US2 → confirmar sync condicional
4. US3 → seeders bajo demanda
5. Polish → tests + quickstart completo

---

## Notes

- No modificar archivos `@Entity` en esta feature
- No commitear `.env` con secretos
- Render debe tener `NODE_ENV=production` configurado en dashboard
- Total tasks: **13** (T001-T013)
