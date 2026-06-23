# Research: 004-orders-api-v2

Decisiones técnicas para Orders API v2. Sin NEEDS CLARIFICATION pendientes (resueltas en clarify 2026-06-23).

## R1 — Persistencia timeline: JSONB

**Decision**: Columna `payload` tipo `jsonb` en `OrderTimelineEvent`.

**Rationale**: Cuatro tipos de evento con formas distintas; validación en `OrdersService`; evita tablas por tipo en v1.

**Alternatives rejected**: Columnas tipadas por evento — más schema churn; tabla EAV — overkill.

## R2 — Paginación y filtros

**Decision**: TypeORM `QueryBuilder` con `skip`/`take`, `ILIKE` para `q` en PostgreSQL.

**Rationale**: Ya usan PostgreSQL/Neon; `ILIKE` case-insensitive nativo.

**Defaults**: `page=1`, `limit=20`, cap `limit=100`, `sort=createAt`, `order=desc`.

## R3 — Sort whitelist v1

**Decision**: Solo `createAt`; otro valor → 400.

**Rationale**: Front 005 solo envía `createAt` en `DEFAULT_ORDERS_FILTERS`.

## R4 — Auth admin

**Decision**: `@UseGuards(AuthGuard, RolesGuard)` + `@Roles('admin')` + `@ApiBearerAuth()` en rutas admin; patrón idéntico a `products.controller.ts`.

**Rationale**: Convención existente; JWT payload `{ id, email, roles }` desde `auth.service.signin`.

**Nota**: `roles` en JWT es string `"admin"`; `RolesGuard` usa `.includes()` — compatible hoy.

## R5 — PUT parcial: rechazar campos extra

**Decision**: `UpdateOrderPartialDto` con solo `state?`, `transactionType?`, `address?`; `@UsePipes(ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))` en handler `PUT`.

**Rationale**: `ValidationPipe` global tiene `whitelist: true` pero **sin** `forbidNonWhitelisted` — strip silencioso no cumple FR-007; pipe local en PUT fuerza 400.

## R6 — Orden de rutas NestJS

**Decision**: Registrar **antes** de `@Get(':id')`:
- `@Get(':id/admin')`
- `@Post(':id/notes')`

**Rationale**: Evitar que `:id` capture `"admin"` o `"notes"` como UUID.

## R7 — Envelope listado vs detalle admin

**Decision**:
- `GET /orders` → `{ data, meta }` en raíz (constitución VII para listado nuevo).
- `GET /orders/:id/admin` → orden plana en raíz + `timeline` + `notes` (excepción documentada para front 005).

**Rationale**: `ViewBuyOrder` lee `adminOrder.timeline` directamente; cambiar a `{ data }` rompería front sin cambio.

## R8 — Timeline en transacciones

**Decision**:
- `created` → insert en misma transacción DB que `OrdersService.create`.
- `state_changed` / `transaction_changed` → misma transacción que `updatePartial`.
- `admin_note_added` → misma transacción que insert nota.

**Rationale**: Consistencia orden + auditoría; rollback atómico.

## R9 — `createdBy` en eventos

**Decision**:
- Checkout público (`created`): `createdByUserId` null; omitir `createdBy` en serialización API.
- PUT / POST notes (admin): `createdByUserId` desde `request.user.id`; API `{ id, email }`.

## R10 — Pedidos históricos

**Decision**: Sin backfill de evento `created`; timeline vacío hasta primera mutación/nota post-deploy.

## R11 — Transiciones state

**Decision**: Libres entre enums en v1; sin validación de máquina de estados.

## R12 — Query enum inválido

**Decision**: `ListOrdersQueryDto` valida `state`/`transactionType` con `@IsEnum` cuando presentes; fallo → 400.

## R13 — Sin cambios envs

**Decision**: No nuevas variables de entorno; feature acotada a módulo orders + entidades.

## R14 — Tests

**Decision**: Extender `orders.service.spec.ts` con mocks de repositorios timeline/notes; no e2e en v1.
