---
description: "Task list for feature 004-orders-api-v2"
---

# Tasks: Operaciones de pedidos — backend v2 (Orders API)

**Input**: Design documents from `specs/004-orders-api-v2/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/orders-api.md

**Tests**: Incluidos (FR-023) — extender `orders.service.spec.ts` (list, update, timeline, notes, email URL)

**Organization**: Tareas agrupadas por user story para entregas incrementales verificables.

**⚠️ Entity gate**: Confirmar OK explícito de Agustin Malugani para `@Entity` nuevas antes de T002–T005.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Paralelizable (archivos distintos, sin dependencias pendientes)
- **[USn]**: User story del spec.md

## Path Conventions

- Backend monolito: `src/` en raíz del repositorio `SaphireSouvenirs-Back`

---

## Phase 1: Setup

**Purpose**: Alinear implementación con artefactos de diseño

- [x] T001 Revisar `specs/004-orders-api-v2/contracts/orders-api.md`, `data-model.md`, `research.md` y contrato front `SaphireSouvernis-Front/specs/005-orders-operations-overhaul/contracts/orders-api-client.md` antes de codificar

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Entidades timeline/notas, DTOs y registro TypeORM — **bloquea todas las user stories**

**⚠️ CRITICAL**: No comenzar US1–US7 hasta completar esta fase

- [x] T002 Crear `src/modules/orders/entities/order-timeline-event.entity.ts`: `type`, `payload` JSONB, `createdAt`, relación `Order` (CASCADE), `createdByUser` nullable
- [x] T003 [P] Crear `src/modules/orders/entities/order-admin-note.entity.ts`: `text`, `createdAt`, relación `Order` (CASCADE), `createdByUser` requerido
- [x] T004 [P] Crear `src/modules/orders/enums/order-timeline-event-type.enum.ts`: `created`, `state_changed`, `transaction_changed`, `admin_note_added`
- [x] T005 Actualizar `src/modules/orders/orders.module.ts`: registrar `OrderTimelineEvent`, `OrderAdminNote`, `User` en `TypeOrmModule.forFeature`
- [x] T006 Crear DTOs: `list-orders-query.dto.ts`, `update-order-partial.dto.ts`, `create-order-note.dto.ts` (validación enum, page/limit coerce, note trim)
- [x] T007 Implementar en `OrdersService` helpers privados: `recordTimelineEvent(...)`, mapper `createdBy` → `{ id, email }`

**Checkpoint**: App arranca con tablas nuevas (synchronize dev); DTOs validan según clarify

---

## Phase 3: User Story 1 - Listado admin paginado (Priority: P1) 🎯 MVP

**Goal**: `GET /orders` → `{ data, meta }` con filtros, paginación y `orderDetails.product`

**Independent Test**: `GET /orders?state=inProcess&page=1&limit=20` con token admin → `{ data, meta }` (ver `quickstart.md` §1)

### Implementation for User Story 1

- [x] T008 [US1] Implementar `OrdersService.findAllPaginated(query)`: QueryBuilder, filtros `state`/`transactionType`, `q` ILIKE, sort `createAt`, meta `totalPages`
- [x] T009 [US1] Actualizar `GET /orders` en `orders.controller.ts`: `@Query() ListOrdersQueryDto`, respuesta `{ data, meta }`, relaciones `orderDetails.product`

### Tests for User Story 1

- [x] T010 [US1] Tests en `orders.service.spec.ts`: filtro `state`, búsqueda `q`, meta paginación correcta

**Checkpoint**: US1 verificable — listado admin con productos en tarjetas

---

## Phase 4: User Story 3 - Rutas admin protegidas (Priority: P1)

**Goal**: Rutas sensibles solo admin; checkout y post-shop públicos

**Independent Test**: Sin token → `GET /orders` falla; `POST /orders` y `GET /orders/:id` OK (ver `quickstart.md` §1–2, §6)

### Implementation for User Story 3

- [x] T011 [US3] Aplicar `@UseGuards(AuthGuard, RolesGuard)`, `@Roles('admin')`, `@ApiBearerAuth()` en `GET /orders` (T009)
- [x] T012 [P] [US3] Verificar `POST /orders` y `GET /orders/:id` permanecen **sin** guards

**Checkpoint**: US3 verificable — auth admin en listado; públicos intactos

---

## Phase 5: User Story 2 - PUT parcial seguro (Priority: P1)

**Goal**: Solo `state` | `transactionType` | `address`; campos extra → 400

**Independent Test**: `PUT { state: "paid" }` OK; `PUT { orderDetails: [] }` → 400 (ver `quickstart.md` §3)

### Implementation for User Story 2

- [x] T013 [US2] Implementar `OrdersService.updatePartial(id, dto, adminUser)`: comparar before/after, sin evento si sin cambios
- [x] T014 [US2] Actualizar `PUT /orders/:id`: `UpdateOrderPartialDto`, guards admin, `@UsePipes(ValidationPipe({ forbidNonWhitelisted: true }))`, `@Req() user`
- [x] T015 [P] [US2] Dejar de usar `UpdateOrderDto` / `PartialType(CreateOrderDto)` en controller (deprecar archivo si sin otros usos)

### Tests for User Story 2

- [x] T016 [US2] Tests `updatePartial`: cambio `state` persiste; sin cambio no duplica timeline

**Checkpoint**: US2 verificable — PUT mínimo seguro

---

## Phase 6: User Story 4 - Timeline server-side (Priority: P2)

**Goal**: Eventos automáticos en create y update

**Independent Test**: Nuevo pedido → `created`; PUT state → `state_changed` (ver spec US4)

### Implementation for User Story 4

- [x] T017 [US4] En `OrdersService.create()`: insertar evento `created` en misma transacción; `createdBy` null
- [x] T018 [US4] En `updatePartial()`: evento `state_changed` `{ from, to }` y/o `transaction_changed` con payload JSONB acotado

### Tests for User Story 4

- [x] T019 [US4] Tests: `create` registra `created`; `updatePartial` registra `state_changed` / `transaction_changed`

**Checkpoint**: US4 verificable — timeline persistido en DB

---

## Phase 7: User Story 5 - Notas internas append-only (Priority: P2)

**Goal**: `POST /orders/:id/notes` persiste nota + evento

**Independent Test**: POST nota válida → aparece en DB (ver `quickstart.md` §5)

### Implementation for User Story 5

- [x] T020 [US5] Implementar `OrdersService.addAdminNote(id, note, adminUser)`: persistir nota + `admin_note_added`
- [x] T021 [US5] Agregar `POST /orders/:id/notes` en controller **antes** de `GET :id`: guards admin, `CreateOrderNoteDto`

### Tests for User Story 5

- [x] T022 [US5] Tests `addAdminNote`: nota persistida + evento timeline; nota vacía → 400 vía DTO

**Checkpoint**: US5 verificable — notas append-only

---

## Phase 8: User Story 6 - Detalle admin (Priority: P2)

**Goal**: `GET /orders/:id/admin` → orden + timeline + notes en raíz

**Independent Test**: GET admin con token → `timeline[]`, `notes[]` (ver `quickstart.md` §4)

### Implementation for User Story 6

- [x] T023 [US6] Implementar `OrdersService.findAdminById(id)`: order + details + product + timeline + notes serializados
- [x] T024 [US6] Agregar `GET /orders/:id/admin` **antes** de `GET :id`: guards admin; respuesta plana sin envelope `{ data }`

### Tests for User Story 6

- [x] T025 [US6] Tests `findAdminById`: incluye timeline y notes; orden inexistente → excepción 404

**Checkpoint**: US6 verificable — modal "Ver" del front deja de recibir 404

---

## Phase 9: User Story 7 - Email URL post-shop (Priority: P2)

**Goal**: CTA email usa `/post-shop/:id`

**Independent Test**: HTML confirmación contiene `/post-shop/` (ver `quickstart.md` §2)

### Implementation for User Story 7

- [x] T026 [US7] En `OrdersService.buildOrderConfirmationHtml`: reemplazar `/postShop/` → `/post-shop/`

### Tests for User Story 7

- [x] T027 [US7] Test unitario: HTML generado incluye `{URL_CLIENT}/post-shop/{orderId}`

**Checkpoint**: US7 verificable — email alineado con front 005

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Swagger, regresión checkout, validación final

- [x] T028 [P] Completar decoradores `@nestjs/swagger` en rutas/DTOs nuevos o modificados (`@ApiQuery`, `@ApiBearerAuth`)
- [x] T029 Verificar orden rutas en controller: `:id/admin` y `:id/notes` **antes** de `:id`
- [x] T030 Ejecutar `npm test` (suite completa) y corregir fallos
- [x] T031 Ejecutar `npm run build`
- [x] T032 [P] Validación manual `specs/004-orders-api-v2/quickstart.md` §1–8 + smoke front 005
- [x] T033 Verificar `GET /orders/:id` público no expone `timeline`/`notes`; regresión checkout/email 002/003

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias
- **Foundational (Phase 2)**: Bloquea US1–US7 — requiere OK `@Entity`
- **US1 (Phase 3)**: Tras T006–T007
- **US3 (Phase 4)**: Tras T009 (guards en listado); T012 en paralelo tras T011
- **US2 (Phase 5)**: Tras T007; T018 depende de T013
- **US4 (Phase 6)**: Tras T007 + T013 + T017
- **US5 (Phase 7)**: Tras T007; ruta T021 antes de `GET :id`
- **US6 (Phase 8)**: Tras T007, T017–T022 (timeline/notes existen)
- **US7 (Phase 9)**: Puede paralelizarse con US5/US6 tras foundational
- **Polish (Phase 10)**: Tras US1–US7

### User Story Dependencies

- **US1 (P1)**: MVP listado — deploy parcial útil con auth (US3)
- **US3 (P1)**: Acoplar a wire de rutas admin (US1, US2, US5, US6)
- **US2 (P1)**: Tras foundational; alimenta US4 timeline en update
- **US4–US7 (P2)**: Tras P1 o en paralelo según tabla

### Within Each Phase

- Entidades (T002–T004) antes de `orders.module` (T005)
- DTOs (T006) antes de controller handlers
- `recordTimelineEvent` (T007) antes de create/update/note (T017, T018, T020)
- Rutas `:id/admin` y `:id/notes` (T021, T024) antes de registrar `GET :id` si se reordenan en un solo PR

### Parallel Opportunities

- T003 + T004 en paralelo tras T002
- T012 + T010 tras T009
- T015 + T016 tras T014
- T028 + T032 + T033 al final

---

## Parallel Example: Foundational

```bash
# Tras OK @Entity y T002:
Task T003: "order-admin-note.entity.ts"
Task T004: "order-timeline-event-type.enum.ts"
```

---

## Parallel Example: Admin routes

```bash
# Tras T007, en paralelo si distintos métodos:
Task T020–T021: "POST notes"
Task T023–T024: "GET admin"
Task T026: "email URL"
```

---

## Implementation Strategy

### MVP First (US1 + US3)

1. Phase 1 + Phase 2 (con OK `@Entity`)
2. T008–T012 [US1 + US3]
3. **STOP y VALIDAR**: quickstart §1 — listado `{ data, meta }` con token admin

### Incremental Delivery

1. Foundational → entidades + DTOs + helpers
2. US1 + US3 → listado paginado protegido
3. US2 + US4 → PUT seguro + timeline
4. US5 + US6 → notas + detalle admin
5. US7 → email URL
6. Polish → tests + smoke front 005

---

## Notes

- No modificar `Order` columnas existentes ni enums `state`/`transactionType`
- No cambiar `POST /orders` ni envelope `GET /orders/:id` público
- `DELETE /orders/:id` sin cambios (legacy)
- Sin nuevas variables en `envs.ts`
- Total tasks: **33** (T001–T033)
