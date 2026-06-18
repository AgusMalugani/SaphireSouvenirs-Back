# Research: 001-db-config-hardening

**Date**: 2026-06-13

## R1: Parseo seguro de booleanos en variables de entorno

**Decision**: Usar `z.enum(['true', 'false'])` con `.transform((value) => value === 'true')`
o función helper `parseEnvBoolean(value: string | undefined, defaultValue: boolean)`.

**Rationale**: `z.coerce.boolean()` y `Boolean('false')` en JavaScript evalúan la string
no vacía `"false"` como `true`, lo que rompería `DB_SYNCHRONIZE=false` y `SEED_ON_STARTUP`.

**Alternatives considered**:

- `z.coerce.boolean()` — rechazado por bug con string `"false"`
- Solo presencia/ausencia de variable — rechazado; menos explícito en `.env.example`

## R2: Ubicación de la lógica de overrides de producción

**Decision**: Función pura `resolveRuntimeConfig` en `src/config/resolveRuntimeConfig.ts`.

**Rationale**: Testeable sin bootstrap Nest ni DB; un solo lugar para FR-003 y FR-006;
`typeOrm.config.ts` y `main.ts` consumen el mismo resultado.

**Alternatives considered**:

- Lógica inline en `typeOrm.config.ts` y `main.ts` — rechazado; duplicación y tests difíciles
- Guard/Interceptor Nest — rechazado; over-engineering para flags de arranque

## R3: Defaults de `DB_SYNCHRONIZE` según `NODE_ENV`

**Decision**: Tras parsear `NODE_ENV`, aplicar default de `DB_SYNCHRONIZE`:
`true` si `development`, `false` si `production`, si la variable no está en `process.env`.
Si está presente, respetar el valor parseado y luego aplicar override de producción en
`resolveRuntimeConfig`.

**Rationale**: Alineado con clarificaciones Q2 y spec FR-002.

**Alternatives considered**:

- Default `false` siempre — rechazado; peor DX en desarrollo local
- Variable obligatoria sin default — rechazado; rompe SC-005 (onboarding rápido)

## R4: Advertencia cuando seed ignorado en producción

**Decision**: `Logger.warn` en `bootstrap()` cuando `envs.SEED_ON_STARTUP === true` y
`envs.NODE_ENV === 'production'`, antes de resolver config efectiva.

**Rationale**: Cumple Q4 (opcional log) sin fallar arranque en misconfiguración de Render.

**Alternatives considered**:

- Fail-fast en producción con seed true — rechazado en clarify (opción C descartada)
- Silencioso — rechazado; operador no sabría por qué no hay seed

## R5: Export de config efectiva desde `envs.ts`

**Decision**: Exportar `effectiveRuntimeConfig` como constante derivada al final de
`envs.ts` llamando a `resolveRuntimeConfig` con valores parseados.

**Rationale**: `typeOrm.config.ts` ya importa `envs`; un solo import mantiene el patrón
existente y evita `process.env` disperso.

**Alternatives considered**:

- Inyectar via Nest `ConfigService` — rechazado; `typeOrm.config.ts` es módulo estático hoy
