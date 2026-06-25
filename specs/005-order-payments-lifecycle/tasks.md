---
description: "Task list for feature 005-order-payments-lifecycle"
---

# Tasks: Seña, edición integral y cancelación de pedidos (Backend)

**Input**: Design documents from `specs/005-order-payments-lifecycle/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/orders-api-payments.md

**Tests**: Incluidos (FR-019) — extender `orders.service.spec.ts`

**Organization**: Tareas agrupadas por user story para entregas incrementales verificables.

**⚠️ Entity gate**: Confirmar OK explícito de Agustin Malugani para modificar `@Entity Order` y `StateEnum` antes de T002–T004.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Paralelizable (archivos distintos, sin dependencias pendientes)
- **[USn]**: User story del spec.md

## Path Conventions

- Backend monolito: `src/` en raíz del repositorio `SaphireSouvenirs-Back`

---

## Phase 1: Setup

**Purpose**: Alinear implementación con artefactos de diseño

- [x] T001 Revisar `specs/005-order-payments-lifecycle/contracts/orders-api-payments.md`, `data-model.md`, `research.md` y código actual `orders.service.ts` / `update-order-partial.dto.ts` antes de codificar

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Entity, enum, helpers, DTO — **bloquea todas las user stories**

**⚠️ CRITICAL**: No comenzar US1–US5 hasta completar esta fase

- [x] T002 Agregar `Cancelled = 'cancelled'` en `src/enums/states.enum.ts`
- [x] T003 Agregar columna `depositAmount` (int, default 0) en `src/modules/orders/entities/order.entity.ts`
- [x] T004 [P] Extender `order-timeline-event-type.enum.ts`: `payment_updated`, `order_edited`, `order_cancelled`
- [x] T005 [P] Crear `src/modules/orders/helpers/derive-payment-state.helper.ts` con `derivePaymentState(depositAmount, totalPrice)`
- [x] T006 [P] Crear `src/modules/orders/helpers/serialize-order-response.helper.ts` con `serializeOrderWithBalance(order)`
- [x] T007 Crear `src/modules/orders/dto/update-order-admin.dto.ts` (whitelist integral; `state` solo `cancelled`; validaciones C4/C7)
- [x] T008 Actualizar `ListOrdersQueryDto`: `@IsEnum(StateEnum)` incluye `cancelled`

**Checkpoint**: App arranca con columna nueva; helpers unit-testeables importables

---

## Phase 3: User Story 1 — Registrar seña y saldo (P1) 🎯 MVP

**Goal**: `PUT { depositAmount }` → estado derivado + `remainingBalance` + `payment_updated`

**Independent Test**: quickstart.md §2–§3

### Implementation for User Story 1

- [x] T009 [US1] Refactor `OrdersService.updateOrder` (desde `updatePartial`): rama `depositAmount`, validación ≤ total, derive state, evento `payment_updated`
- [x] T010 [US1] Aplicar `serializeOrderWithBalance` en retorno de `updateOrder`
- [x] T011 [US1] Controller: reemplazar `UpdateOrderPartialDto` por `UpdateOrderAdminDto` en PUT

### Tests for User Story 1

- [x] T012 [US1] Tests: seña parcial → `partialPayment` + balance; seña = total → `paid`; seña > total → 400; ignora `state: paid` en body

**Checkpoint**: US1 verificable — registrar seña vía API

---

## Phase 4: User Story 2 — Estado derivado del monto (P1)

**Goal**: Re-derivar estado tras cambio de `totalPrice` sin `depositAmount` en body

**Independent Test**: quickstart.md §6 + spec US2 escenarios 3–5

### Implementation for User Story 2

- [x] T013 [US2] Tras replace `products` o recalc total en `updateOrder`, invocar `derivePaymentState` con `depositAmount` persistido
- [x] T014 [US2] Si `depositAmount > nuevo totalPrice` → `BadRequestException` + rollback transacción

### Tests for User Story 2

- [x] T015 [US2] Tests: edit products sube total → sigue `partialPayment`; baja total con seña cubriendo → `paid`; seña > nuevo total → 400

**Checkpoint**: US2 verificable — coherencia monto/estado/total

---

## Phase 5: User Story 3 — Edición integral (P1)

**Goal**: PUT con `products` + datos cliente; `order_edited` + nota automática

**Independent Test**: quickstart.md §5

### Implementation for User Story 3

- [x] T016 [US3] Implementar `replaceOrderDetails(order, products, transactionManager)` en Service (delete + recreate vía `OrderdetailsService`)
- [x] T017 [US3] Aplicar campos cliente/entrega del DTO con diff before/after
- [x] T018 [US3] `buildOrderEditSummary` + `createSystemAdminNote` (nota automática ES combinada)
- [x] T019 [US3] Emitir `order_edited` con `payload.changes`; reglas eventos compuestos (C3)
- [x] T020 [US3] PUT sin cambios reales → 200 sin nota ni eventos duplicados
- [x] T021 [US3] Pedido `cancelled` → 409 en PUT edición

### Tests for User Story 3

- [x] T022 [US3] Tests: products replace recalcula total; cambio `nameClient` → `order_edited` + nota; sin diff → sin eventos; cancelled → 409

**Checkpoint**: US3 verificable — edición completa con auditoría

---

## Phase 6: User Story 4 — Cancelar pedido (P1)

**Goal**: Cancelación, filtro listado, 404 post-shop

**Independent Test**: quickstart.md §7–§10

### Implementation for User Story 4

- [x] T023 [US4] `handleCancel` en Service: solo `inProcess`/`partialPayment`; 409 si `paid`; idempotente si ya `cancelled`
- [x] T024 [US4] Validar 400 si `state: cancelled` + `depositAmount` en mismo body (C12)
- [x] T025 [US4] `findAllPaginated`: excluir `cancelled` por defecto; `?state=cancelled` funciona
- [x] T026 [US4] `findOneById`: `NotFoundException` si `cancelled`
- [x] T027 [US4] Evento `order_cancelled` + nota con `cancelReason` opcional

### Tests for User Story 4

- [x] T028 [US4] Tests: cancel ok; cancel paid → 409; list default sin cancelled; findOne cancelled → 404; cancel+deposit → 400

**Checkpoint**: US4 verificable — ciclo de vida cancelación

---

## Phase 7: User Story 5 — Compatibilidad API 004 (P2)

**Goal**: Campos de pago en todos los GET; checkout intacto

**Independent Test**: quickstart.md §1, §12

### Implementation for User Story 5

- [x] T029 [US5] `serializeOrderWithBalance` en `findAllPaginated` items, `findAdminById`, `create` response
- [x] T030 [US5] `create()`: persistir `depositAmount: 0` explícito; sin regresión email/timeline `created`
- [x] T031 [US5] Mantener `transaction_changed` solo para cambio exclusivo de entrega; documentar en código si aplica

### Tests for User Story 5

- [x] T032 [US5] Tests: GET serializa balance; `create` defaults deposit 0

**Checkpoint**: US5 verificable — compatibilidad 004

---

## Phase 8: Polish & Cross-Cutting

- [x] T033 [P] Deprecar/eliminar `update-order-partial.dto.ts` si sin usos
- [x] T034 Swagger: `@ApiProperty` en `UpdateOrderAdminDto`; ejemplos PUT con `depositAmount`
- [x] T035 Ejecutar `npm test` (suite completa) y `npm run build`
- [ ] T036 Validación manual `quickstart.md` §1–§13
- [x] T037 Verificar regresión: `POST /orders`, `GET /orders/:id/admin`, notas manuales `POST notes`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias
- **Foundational (Phase 2)**: Bloquea US1–US5 — requiere OK `@Entity`
- **US1 (Phase 3)**: Tras T005–T007
- **US2 (Phase 4)**: Tras T016 (products replace) o en paralelo con US3 si replace primero
- **US3 (Phase 5)**: Tras T009 base `updateOrder`
- **US4 (Phase 6)**: Tras T009; T025–T026 independientes de US3
- **US5 (Phase 7)**: Tras serialización helper T006
- **Polish (Phase 8)**: Tras US1–US5

### Recommended merge order

1. Foundational T002–T008
2. US1 T009–T012 (MVP seña)
3. US4 T023–T028 (cancel + list + 404) — puede paralelo con US3
4. US3 T016–T022 (edición integral)
5. US2 T013–T015 (cubre recalc — integrar con US3)
6. US5 T029–T032
7. Polish

### MVP First

Phases 1–3 (T001–T012): seña + balance + derive básico.

---

## Notes

- No modificar `envs.ts`
- No nuevas `@Entity` — solo modificar `Order` + enum
- Front fuera de scope; handoff en contract § Handoff front
- Total tasks: **37** (T001–T037)
