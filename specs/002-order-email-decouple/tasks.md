---
description: "Task list for feature 002-order-email-decouple"
---

# Tasks: Desacoplar envío de email del checkout

**Input**: Design documents from `specs/002-order-email-decouple/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/email-sender.md

**Tests**: Incluidos (FR-012) — unit tests en `src/modules/orders/orders.service.spec.ts`

**Organization**: Tareas agrupadas por user story para entregas incrementales verificables.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Paralelizable (archivos distintos, sin dependencias pendientes)
- **[USn]**: User story del spec.md

## Path Conventions

- Backend monolito: `src/` en raíz del repositorio `SaphireSouvenirs-Back`

---

## Phase 1: Setup

**Purpose**: Alinear implementación con artefactos de diseño

- [x] T001 Revisar contrato DI en `specs/002-order-email-decouple/contracts/email-sender.md`, flujo transaccional en `specs/002-order-email-decouple/data-model.md` y decisiones en `specs/002-order-email-decouple/research.md` antes de codificar

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contratos email, adapter SMTP y soporte transaccional en orderdetails — **bloquea todas las user stories**

**⚠️ CRITICAL**: No comenzar US1/US2/US3 hasta completar esta fase

- [x] T002 Crear `src/modules/email/email-sender.token.ts` con `export const EMAIL_SENDER = Symbol('EMAIL_SENDER')`
- [x] T003 [P] Crear `src/modules/email/send-order-confirmation.payload.ts` con interface `SendOrderConfirmationPayload` (`to`, `cc`, `subject`, `html`, `orderId`)
- [x] T004 Crear `src/modules/email/email-sender.interface.ts` con interface `EmailSender` y método `sendOrderConfirmation(payload)` según contrato
- [x] T005 Crear `src/modules/nodemailer/nodemailer-email.sender.ts`: `NodemailerEmailSender implements EmailSender`, timeouts SMTP (10s/10s/15s), `Logger`, sin `ConflictException` en errores
- [x] T006 Actualizar `src/modules/nodemailer/nodemailer.module.ts`: `{ provide: EMAIL_SENDER, useClass: NodemailerEmailSender }` y `exports: [EMAIL_SENDER]`
- [x] T007 Eliminar `src/modules/nodemailer/nodemailer.service.ts` y corregir imports rotos
- [x] T008 Actualizar `src/modules/orderdetails/orderdetails.service.ts`: agregar parámetro opcional `entityManager?: EntityManager` en `create()`; usar `entityManager.getRepository(Orderdetail)` cuando se provea

**Checkpoint**: `NodemailerModule` exporta `EMAIL_SENDER`; no existe `NodemailerService`; `OrderdetailsService.create` acepta EntityManager

---

## Phase 3: User Story 1 - Checkout no bloqueado por email (Priority: P1) 🎯 MVP

**Goal**: `POST /orders` responde en <3s sin esperar SMTP; email fire-and-forget tras persistir

**Independent Test**: Mock/fallo SMTP → respuesta HTTP exitosa rápida con orden persistida (ver `specs/002-order-email-decouple/quickstart.md` §2-3)

### Tests for User Story 1

- [x] T009 [P] [US1] Crear `src/modules/orders/orders.service.spec.ts` con mocks de `Repository<Order>`, `DataSource`, `OrderdetailsService`, `@Inject(EMAIL_SENDER)` y setup de `TestingModule`

### Implementation for User Story 1

- [x] T010 [US1] Refactorizar `src/modules/orders/orders.service.ts`: inyectar `DataSource` y `@Inject(EMAIL_SENDER) EmailSender`; envolver persistencia en `dataSource.transaction()` retornando `{ order, orderDetails, total }` desde el callback; validar productos antes de writes en TX; extraer `buildOrderConfirmationHtml()` privado; dispatch async `void emailSender.sendOrderConfirmation(...).catch(logger.warn)` **sin await** antes de `return order`
- [x] T011 [US1] Actualizar `src/modules/orders/orders.module.ts`: `imports: [NodemailerModule, OrderdetailsModule]`; remover `NodemailerService`, duplicado de `OrderdetailsService` y providers que ya exportan los módulos importados
- [x] T012 [US1] Agregar test happy path en `src/modules/orders/orders.service.spec.ts`: `create` retorna order; `sendOrderConfirmation` invocado una vez tras persistencia

**Checkpoint**: US1 verificable — POST responde rápido; email no bloquea return; test happy path pasa

---

## Phase 4: User Story 2 - Orden no se revierte por fallo de mail (Priority: P2)

**Goal**: Fallo SMTP/email no elimina orden ni detalles; rollback solo por error DB

**Independent Test**: Mock email rechazado → orden persiste; `orderRepository.delete` no invocado (ver `specs/002-order-email-decouple/quickstart.md` §3)

### Tests for User Story 2

- [x] T013 [US2] Agregar test en `src/modules/orders/orders.service.spec.ts`: mock `EmailSender` rechaza → `create` resuelve con order; `orderRepository.delete` **no** llamado
- [x] T014 [US2] Agregar test rollback DB en `src/modules/orders/orders.service.spec.ts`: mock transacción/detalle falla → `create` rechaza; mock email **no** invocado

### Implementation for User Story 2

- [x] T015 [US2] Verificar en `src/modules/orders/orders.service.ts` que no existe `orderRepository.delete` en catch por email ni rollback manual post-commit; rollback exclusivo vía transacción TypeORM

**Checkpoint**: US2 verificable — tests email-fail y DB-fail pasan; sin delete por SMTP

---

## Phase 5: User Story 3 - Proveedor de email intercambiable (Priority: P3)

**Goal**: DI limpia; ningún módulo registra implementación concreta fuera de `NodemailerModule`

**Independent Test**: `rg NodemailerService src/` → 0 referencias; `OrdersService` solo importa `EmailSender` token (ver `specs/002-order-email-decouple/quickstart.md` §6)

### Implementation for User Story 3

- [x] T016 [P] [US3] Auditar `src/modules/**/*.module.ts`: ningún módulo fuera de `nodemailer/` registra `NodemailerEmailSender`, `NodemailerService` ni `EMAIL_SENDER` en `providers`; documentar archivos corregidos
- [x] T017 [US3] Actualizar `src/modules/orderdetails/orderdetails.module.ts`: remover `NodemailerService` y providers innecesarios (`OrdersService` si no se usa directamente)
- [x] T018 [US3] Verificar `src/app.module.ts` mantiene import de `NodemailerModule`; confirmar `OrdersService` no importa `NodemailerEmailSender` ni `nodemailer` directamente

**Checkpoint**: US3 verificable — DI encapsulada; swap futuro solo en `nodemailer.module.ts`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validación final, build y guía operativa

- [x] T019 Ejecutar `npm test -- orders.service` y corregir fallos si los hay
- [x] T020 Ejecutar `npm run build` y corregir errores de compilación
- [x] T021 [P] Ejecutar validación manual de `specs/002-order-email-decouple/quickstart.md` (§1-5) y anotar resultados
- [x] T022 [P] Verificar ausencia de imports no usados, sin `any` en archivos modificados, y alineación código ↔ `specs/002-order-email-decouple/contracts/email-sender.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias
- **Foundational (Phase 2)**: Depende de Setup — **bloquea US1, US2, US3**
- **US1 (Phase 3)**: Depende de Phase 2 (T002-T008)
- **US2 (Phase 4)**: Depende de US1 (T010-T012); tests añaden cobertura de no-delete
- **US3 (Phase 5)**: Depende de Phase 2; puede paralelizarse parcialmente con US1 tras T006
- **Polish (Phase 6)**: Depende de US1 + US2 + US3

### User Story Dependencies

- **US1 (P1)**: Tras Foundational — MVP (desbloquea checkout en prod)
- **US2 (P2)**: Tras US1 refactor; principalmente tests + verificación de no-delete
- **US3 (P3)**: Tras Foundational; limpieza DI independiente del flujo create pero requiere T006-T007

### Within Each Phase

- Contratos email (T002-T004) antes de `NodemailerEmailSender` (T005)
- `NodemailerEmailSender` + module (T005-T006) antes de eliminar legacy (T007)
- `OrderdetailsService` transaccional (T008) antes de `OrdersService.create` refactor (T010)
- Test setup (T009) en paralelo con T010 solo si stubs preparados; idealmente T009 antes de T012-T014

### Parallel Opportunities

- T003 en paralelo con T002
- T009 en paralelo con inicio de T010 (distinto archivo)
- T016 en paralelo con T019 tras US1 completo
- T021 y T022 en paralelo al final

---

## Parallel Example: Foundational

```bash
# Tras T002, en paralelo:
Task T003: "send-order-confirmation.payload.ts"
Task T004: "email-sender.interface.ts"  # tras T003
```

---

## Parallel Example: User Story 1 + 3

```bash
# Tras T006-T007, en paralelo:
Task T010 [US1]: "Refactor orders.service.ts"
Task T016 [US3]: "Auditar NodemailerService en módulos"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1 + Phase 2 (T001-T008)
2. Completar T009-T012 [US1]
3. **STOP y VALIDAR**: quickstart §2 — POST responde en <3s
4. Deploy hotfix a Render si listo

### Incremental Delivery

1. Foundational → contrato DI + adapter SMTP listos
2. US1 → fire-and-forget + transacción (MVP desbloquea prod)
3. US2 → tests no-delete + rollback DB
4. US3 → auditoría DI en todos los módulos
5. Polish → build + quickstart completo

---

## Notes

- No modificar archivos `@Entity` en esta feature
- No modificar frontend ni `orders.controller.ts`
- No commitear `.env`
- Mail en Render puede seguir sin llegar hasta feature 003 Resend
- Total tasks: **22** (T001-T022)
