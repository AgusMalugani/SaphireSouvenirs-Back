# Feature Specification: Hardening de configuración de base de datos y seeders

**Feature Branch**: `001-db-config-hardening`

**Created**: 2026-06-13

**Status**: Ready

**Input**: User description: "Hardening de configuración de base de datos y seeders:
dropSchema: false en typeOrm.config.ts; synchronize condicional vía nueva variable en
envs.ts (nunca true en producción); flag SEED_ON_STARTUP para ejecutar seeders solo
cuando corresponda; actualizar .env.example; tests mínimos del cambio de configuración"

## Clarifications

### Session 2026-06-13

- Q: ¿Cómo identificar producción para forzar sync off? → A: `NODE_ENV` en `envs.ts` con valores `development` | `production`; sincronización desactivada cuando `NODE_ENV=production`.
- Q: ¿Default de `DB_SYNCHRONIZE` en desarrollo? → A: `true` en `development` (opt-out con `DB_SYNCHRONIZE=false` en `.env`).
- Q: ¿Default de `SEED_ON_STARTUP`? → A: `false` en todos los entornos; activar solo con `SEED_ON_STARTUP=true` explícito.
- Q: ¿`SEED_ON_STARTUP=true` en producción? → A: Forzar seed desactivado en `production` aunque el flag sea `true` (opcional log de advertencia).
- Q: ¿Alcance de tests mínimos? → A: Tests unitarios de resolución de configuración efectiva (matriz `NODE_ENV` × flags), sin conectar a PostgreSQL.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Arranque seguro sin pérdida de datos (Priority: P1)

Como desarrollador u operador del backend, necesito que la aplicación arranque sin
destruir el esquema ni los datos existentes en la base de datos, para poder iterar en
local y desplegar en Render sin riesgo de borrado accidental.

**Why this priority**: Hoy el arranque puede eliminar el esquema completo; es el riesgo
más grave para desarrollo y operaciones.

**Independent Test**: Reiniciar la aplicación varias veces contra la misma base de datos
y verificar que tablas y registros previos permanecen intactos.

**Acceptance Scenarios**:

1. **Given** una base de datos con tablas y datos existentes, **When** la aplicación
   arranca, **Then** el esquema y los datos no se eliminan.
2. **Given** un despliegue en producción (Render, `NODE_ENV=production`), **When** la
   aplicación arranca, **Then** nunca se ejecuta borrado de esquema independientemente
   de otras variables de configuración.

---

### User Story 2 - Sincronización de esquema controlada por entorno (Priority: P2)

Como desarrollador, necesito activar o desactivar la sincronización automática del
esquema mediante configuración de entorno, para tener comodidad en desarrollo local sin
exponer ese comportamiento en producción.

**Why this priority**: Alinea el comportamiento con la constitución del proyecto y
reduce el riesgo de cambios de esquema no gobernados en Render.

**Independent Test**: Arrancar la aplicación con distintas combinaciones de variables de
entorno y verificar que la sincronización solo ocurre cuando la política del entorno lo
permite.

**Acceptance Scenarios**:

1. **Given** `NODE_ENV=development` y `DB_SYNCHRONIZE` en su default, **When** se
   modifica una entidad y se reinicia la app, **Then** el esquema refleja el cambio sin
   intervención manual de migraciones.
2. **Given** `NODE_ENV=production`, **When** la aplicación arranca con
   `DB_SYNCHRONIZE=true` en `.env`, **Then** la sincronización automática permanece
   desactivada.
3. **Given** `NODE_ENV=development` y `DB_SYNCHRONIZE=false`, **When** la aplicación
   arranca, **Then** no altera el esquema existente.

---

### User Story 3 - Seeders bajo demanda (Priority: P3)

Como desarrollador, necesito ejecutar los seeders iniciales (categorías, productos,
admin) solo cuando lo habilite explícitamente, para evitar duplicados o sobrescrituras
en cada reinicio del servidor.

**Why this priority**: Los seeders en cada bootstrap dificultan pruebas con datos reales
y pueden generar efectos colaterales en despliegues.

**Independent Test**: Arrancar la aplicación con el flag de seed desactivado y verificar
que no se insertan datos de seed; activarlo en desarrollo y verificar que el seed corre
según la lógica existente.

**Acceptance Scenarios**:

1. **Given** `SEED_ON_STARTUP=false` (default), **When** la aplicación inicia,
   **Then** no se ejecutan seeders de categorías, productos ni admin.
2. **Given** `NODE_ENV=development` y `SEED_ON_STARTUP=true`, **When** la aplicación
   inicia, **Then** se ejecutan los seeders existentes (categorías, productos, admin)
   con comportamiento idempotente actual.
3. **Given** `NODE_ENV=production` y `SEED_ON_STARTUP=true`, **When** la aplicación
   arranca, **Then** no se ejecutan seeders (flag ignorado; puede registrarse advertencia).

---

### Edge Cases

- ¿Qué ocurre si `DATABASE_URL` es inválida o la base no está disponible? La aplicación
  debe fallar en arranque con mensaje claro (comportamiento actual de fail-fast).
- ¿Qué ocurre si `SEED_ON_STARTUP=true` en desarrollo pero los datos ya existen? Los
  seeders se comportan como hoy (idempotentes: categorías y admin verifican antes de
  insertar).
- ¿Qué ocurre si en desarrollo `DB_SYNCHRONIZE=true` y `dropSchema=false`? Solo se
  aplican alteraciones incrementales de esquema, nunca borrado total.
- ¿Qué ocurre si `NODE_ENV` es inválido o falta? Validación en arranque con mensaje
  explícito (fail-fast vía Zod en `envs.ts`).
- ¿Qué ocurre si `DB_SYNCHRONIZE` o `SEED_ON_STARTUP` faltan en `.env`? Se aplican
  los defaults documentados (`true`/`false` respectivamente en `development`; seed
  siempre default `false`).
- ¿Qué ocurre si `SEED_ON_STARTUP=true` en producción? El sistema fuerza seed off y
  puede emitir log de advertencia; nunca ejecuta seeders en arranque.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST impedir el borrado completo del esquema de base de datos
  en todos los entornos (`dropSchema` efectivo siempre `false`).
- **FR-002**: El sistema MUST exponer `DB_SYNCHRONIZE` en `envs.ts` para controlar la
  sincronización automática de esquema, con default `true` cuando `NODE_ENV=development`
  y default `false` cuando `NODE_ENV=production`.
- **FR-003**: El sistema MUST forzar sincronización automática desactivada cuando
  `NODE_ENV=production`, independientemente del valor de `DB_SYNCHRONIZE` configurado.
- **FR-004**: El sistema MUST exponer `SEED_ON_STARTUP` en `envs.ts` con default
  `false` en todos los entornos; solo ejecutar seeders en arranque cuando el valor
  efectivo sea `true`.
- **FR-005**: El sistema MUST incorporar `NODE_ENV` en `envs.ts` restringido a
  `development` | `production`, validado con Zod al iniciar (fail-fast).
- **FR-006**: El sistema MUST forzar `SEED_ON_STARTUP` efectivo en `false` cuando
  `NODE_ENV=production`, aunque la variable esté en `true` (advertencia en log opcional).
- **FR-007**: La plantilla `.env.example` MUST documentar `NODE_ENV`, `DB_SYNCHRONIZE` y
  `SEED_ON_STARTUP` con valores de ejemplo seguros para desarrollo local.
- **FR-008**: El cambio MUST incluir tests unitarios mínimos de una función pura de
  resolución de configuración efectiva (sincronización y seed permitido según
  `NODE_ENV` y flags), sin requerir base de datos real.
- **FR-009**: El sistema MUST mantener el comportamiento funcional actual de la API
  (rutas, auth, órdenes) sin cambios de contrato en esta feature.

### Key Entities

- **Configuración de persistencia**: Política de arranque con `dropSchema` fijo en
  `false` y sincronización efectiva derivada de `NODE_ENV` + `DB_SYNCHRONIZE`.
- **Configuración de seeders**: Política de arranque con ejecución efectiva derivada de
  `NODE_ENV` + `SEED_ON_STARTUP` (nunca activa en producción).
- **Variables de entorno validadas**: `NODE_ENV`, `DB_SYNCHRONIZE`, `SEED_ON_STARTUP`
  más el conjunto existente en `envs.ts`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En 100% de reinicios de prueba contra una base con datos existentes, no
  se pierden tablas ni registros por política de borrado de esquema.
- **SC-002**: Con `NODE_ENV=production`, 0% de arranques habilitan sincronización
  automática de esquema, incluso si `DB_SYNCHRONIZE=true`.
- **SC-003**: Con `SEED_ON_STARTUP=false` (default), 0 ejecuciones de seeders en 10
  reinicios consecutivos de prueba.
- **SC-004**: Con `NODE_ENV=production` y `SEED_ON_STARTUP=true`, 0 ejecuciones de
  seeders en arranque en 10 reinicios de prueba.
- **SC-005**: Un desarrollador nuevo puede configurar el entorno local siguiendo solo
  `.env.example` en menos de 10 minutos sin consultar código fuente.
- **SC-006**: Los tests unitarios de resolución de configuración pasan con `npm test`
  sin intervención manual ni conexión a PostgreSQL.

## Assumptions

- **Entornos**: Solo dos valores de `NODE_ENV`: `development` (local) y `production`
  (Render/Neon). No existe entorno `staging` formal en esta feature.
- **Desarrollo local**: Default `DB_SYNCHRONIZE=true` y `SEED_ON_STARTUP=false`; el
  desarrollador activa seed explícitamente cuando bootstrappea datos iniciales.
- **Producción**: Render establece `NODE_ENV=production`; sync y seed quedan forzados
  off independientemente de flags mal configurados.
- **Alcance**: Esta feature no introduce migraciones TypeORM ni cambia entidades
  existentes.
- **Seeders**: Se reutiliza la lógica actual de `CategoriesSeed`, `ProductsSeed` y
  `UsersSeed` sin rediseño de dominio.
- **Constitución**: Cumple principios V (persistencia), II (envs centralizado) y VI
  (tests unitarios mínimos en feature nueva).

## Out of Scope

- Implementación de migraciones TypeORM.
- Modificación de entidades `@Entity` o DTOs de negocio.
- Cambios en contratos HTTP o respuestas `{ data: T }`.
- Pipeline CI/CD en GitHub Actions.
- Tests e2e o de integración con base de datos real.
