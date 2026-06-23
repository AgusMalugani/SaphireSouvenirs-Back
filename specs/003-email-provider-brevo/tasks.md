---
description: "Task list for feature 003-email-provider-brevo"
---

# Tasks: Migrar proveedor de email a Brevo API

**Input**: Design documents from `specs/003-email-provider-brevo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/email-sender.md

**Tests**: Incluidos (FR-010, FR-011) — `brevo-email.sender.spec.ts` + regresión `orders.service.spec.ts`

**Organization**: Tareas agrupadas por user story para entregas incrementales verificables.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Paralelizable (archivos distintos, sin dependencias pendientes)
- **[USn]**: User story del spec.md

## Path Conventions

- Backend monolito: `src/` en raíz del repositorio `SaphireSouvenirs-Back`

---

## Phase 1: Setup

**Purpose**: Alinear implementación con artefactos de diseño

- [x] T001 Revisar contrato v2 en `specs/003-email-provider-brevo/contracts/email-sender.md`, mapping API en `specs/003-email-provider-brevo/data-model.md` y decisiones en `specs/003-email-provider-brevo/research.md` antes de codificar

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Variables de entorno, adapter Brevo y EmailModule — **bloquea todas las user stories**

**⚠️ CRITICAL**: No comenzar US1/US2/US3 hasta completar esta fase

- [x] T002 Actualizar `src/config/envs.ts`: agregar `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_CC`; eliminar `NODEMAILER_USER`, `NODEMAILER_PASS`, `NODEMAILER_FROM`, `NODEMAILER_CC` del schema Zod
- [x] T003 [P] Actualizar `.env.example`: sección Brevo (`BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_CC`); eliminar sección Nodemailer/Gmail
- [x] T004 Crear `src/modules/email/brevo/brevo-email.sender.ts`: `BrevoEmailSender implements EmailSender`, `fetch` POST a `https://api.brevo.com/v3/smtp/email`, timeout 15s `AbortSignal`, `Logger`, sin throw en errores
- [x] T005 Crear `src/modules/email/email.module.ts`: `{ provide: EMAIL_SENDER, useClass: BrevoEmailSender }` y `exports: [EMAIL_SENDER]`

**Checkpoint**: `BrevoEmailSender` implementado; `EmailModule` exporta token; `envs.ts` valida nuevas variables

---

## Phase 3: User Story 1 - Correo de confirmación en producción (Priority: P1) 🎯 MVP

**Goal**: Pedidos envían mail vía Brevo API; módulos apuntan a `EmailModule`

**Independent Test**: Pedido de prueba con API key válida → mail en cliente + CC; log con `messageId` (ver `specs/003-email-provider-brevo/quickstart.md` §4)

### Implementation for User Story 1

- [x] T006 [US1] Actualizar `src/app.module.ts` y `src/modules/orders/orders.module.ts`: reemplazar `NodemailerModule` por `EmailModule` desde `src/modules/email/email.module.ts`
- [x] T007 [US1] Actualizar `src/modules/orders/orders.service.ts`: renombrar `envs.NODEMAILER_CC` → `envs.EMAIL_CC` en payload de `sendOrderConfirmation` (único cambio permitido)
- [x] T008 [P] [US1] Eliminar carpeta `src/modules/nodemailer/` (`nodemailer.module.ts`, `nodemailer-email.sender.ts`)

### Tests for User Story 1

- [x] T009 [US1] Crear `src/modules/email/brevo/brevo-email.sender.spec.ts`: mock `fetch` → 201 + `{ messageId }`; assert headers `api-key`, body JSON correcto, `Logger.log` con `orderId`

**Checkpoint**: US1 verificable — app arranca; pedido dispara fetch Brevo; sin carpeta nodemailer

---

## Phase 4: User Story 2 - Checkout intacto ante fallo Brevo (Priority: P2)

**Goal**: Fallo API Brevo no bloquea checkout ni revierte orden (regresión 002)

**Independent Test**: Mock fetch 401 o reject → `POST /orders` OK; `BrevoEmailSender` no throw (ver quickstart §5)

### Tests for User Story 2

- [x] T010 [US2] Agregar casos en `src/modules/email/brevo/brevo-email.sender.spec.ts`: HTTP 401/500 → `warn` sin throw; `fetch` reject (timeout) → `warn` sin throw
- [x] T011 [US2] Actualizar `src/modules/orders/orders.service.spec.ts`: mock `envs` con `EMAIL_CC` en lugar de `NODEMAILER_CC`; verificar tests existentes pasan sin cambio de comportamiento

**Checkpoint**: US2 verificable — tests Brevo error paths + orders.service regression green

---

## Phase 5: User Story 3 - Código sin Nodemailer (Priority: P3)

**Goal**: Cero referencias nodemailer en src/ y package.json

**Independent Test**: `rg nodemailer src/` y `package.json` → 0 matches (ver quickstart §7)

### Implementation for User Story 3

- [x] T012 [US3] Ejecutar `npm uninstall nodemailer @types/nodemailer @nestjs-modules/mailer` y verificar `package-lock.json` actualizado
- [x] T013 [P] [US3] Auditar `src/` y `package.json`: cero referencias a `nodemailer`, `NodemailerEmailSender`, `NodemailerModule`, `NodemailerService`
- [x] T014 [US3] Verificar que solo `EmailModule` registra `EMAIL_SENDER` con `BrevoEmailSender` (ningún otro módulo registra implementación concreta)

**Checkpoint**: US3 verificable — dependencias limpias; DI encapsulada en EmailModule

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validación final, build y guía operativa

- [x] T015 Ejecutar `npm test` (suite completa) y corregir fallos si los hay
- [x] T016 Ejecutar `npm run build` y corregir errores de compilación
- [ ] T017 [P] Actualizar `.env` local manualmente (no commitear): migrar `NODEMAILER_*` → `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_CC`
- [ ] T018 [P] Ejecutar validación manual de `specs/003-email-provider-brevo/quickstart.md` (§1-6) y anotar resultados
- [x] T019 Verificar alineación código ↔ `specs/003-email-provider-brevo/contracts/email-sender.md` v2; sin imports no usados ni `any` en archivos modificados

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias
- **Foundational (Phase 2)**: Depende de Setup — **bloquea US1, US2, US3**
- **US1 (Phase 3)**: Depende de T002–T005
- **US2 (Phase 4)**: Depende de T009 (spec Brevo existe); T011 puede paralelizarse con T010
- **US3 (Phase 5)**: Depende de T008 (nodemailer eliminado); T012 tras T008
- **Polish (Phase 6)**: Depende de US1 + US2 + US3

### User Story Dependencies

- **US1 (P1)**: Tras Foundational — MVP (mail en prod)
- **US2 (P2)**: Tras US1 o en paralelo con T009+ (tests adicionales)
- **US3 (P3)**: Tras T008 + T012 (cleanup deps)

### Within Each Phase

- `envs.ts` (T002) antes de `BrevoEmailSender` (T004) si sender usa envs al importar
- `BrevoEmailSender` (T004) antes de `EmailModule` (T005)
- `EmailModule` (T005) antes de actualizar imports en app/orders (T006)
- Eliminar nodemailer (T008) antes de `npm uninstall` (T012)

### Parallel Opportunities

- T003 en paralelo con T002
- T008 en paralelo con T009 (distintos archivos: delete vs create spec) tras T006-T007
- T013 en paralelo con T015 tras T012
- T017, T018, T019 en paralelo al final

---

## Parallel Example: Foundational

```bash
# Tras T002, en paralelo:
Task T003: "Actualizar .env.example"
Task T004: "Crear brevo-email.sender.ts"  # tras T002
```

---

## Parallel Example: US1 + tests

```bash
# Tras T005-T007, en paralelo:
Task T008: "Eliminar src/modules/nodemailer/"
Task T009: "Crear brevo-email.sender.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1 + Phase 2 (T001–T005)
2. Completar T006–T009 [US1]
3. **STOP y VALIDAR**: quickstart §4 — mail de prueba local
4. Deploy Render con vars Brevo si listo

### Incremental Delivery

1. Foundational → envs + BrevoEmailSender + EmailModule
2. US1 → wire modules + delete nodemailer folder + test success
3. US2 → tests error paths + orders regression
4. US3 → npm uninstall + auditoría
5. Polish → build + quickstart Render

---

## Notes

- No modificar lógica de `OrdersService.create` ni `@Entity`
- No commitear `.env` con `BREVO_API_KEY`
- Migrar vars en Render: agregar BREVO/EMAIL_*; eliminar NODEMAILER_*
- `EMAIL_FROM` debe estar verificado en panel Brevo
- Total tasks: **19** (T001–T019)
