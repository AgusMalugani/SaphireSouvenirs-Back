# Feature Specification: Migrar proveedor de email a Brevo API

**Feature Branch**: `003-email-provider-brevo`

**Created**: 2026-06-13

**Status**: Ready

**Input**: User description: "Feature: 003-email-provider-brevo — Migrar transporte de email de Nodemailer/Gmail SMTP a Brevo API (fetch HTTP). Reemplazo completo del adapter; conservar DI EmailSender de 002; EmailModule; envs BREVO_API_KEY, EMAIL_FROM, EMAIL_CC."

## Clarifications

### Session 2026-06-13

- Q: ¿Conviven Nodemailer y Brevo en runtime? → A: No; reemplazo completo del transporte. Se elimina NodemailerEmailSender, módulo `nodemailer/` y dependencias `nodemailer` del proyecto. Se conserva solo la abstracción DI (`EmailSender` + `EMAIL_SENDER`) de la feature 002.
- Q: ¿Cómo se integra Brevo? → A: `fetch` HTTP a `POST https://api.brevo.com/v3/smtp/email`; sin SDK `@getbrevo/brevo`.
- Q: ¿Cambian variables de entorno? → A: Agregar `BREVO_API_KEY`; renombrar `NODEMAILER_FROM` → `EMAIL_FROM`, `NODEMAILER_CC` → `EMAIL_CC`; eliminar `NODEMAILER_USER` y `NODEMAILER_PASS`.
- Q: ¿Cómo se organiza el módulo NestJS? → A: Renombrar `NodemailerModule` → `EmailModule`; `BrevoEmailSender` en `src/modules/email/` (p. ej. `brevo/brevo-email.sender.ts`).
- Q: ¿Se modifica `OrdersService`? → A: No; solo cambia la implementación inyectada de `EMAIL_SENDER`.
- Q: ¿Qué pasa si falla Brevo? → A: Igual que 002: log `warn` con `orderId`; no bloquea checkout ni revierte orden.
- Q: ¿Requisito del remitente? → A: `EMAIL_FROM` debe estar verificado en la cuenta Brevo (sender o dominio).
- Q: ¿Se permite algún cambio en `OrdersService`? → A: Solo renombrar referencia `envs.NODEMAILER_CC` → `envs.EMAIL_CC` al armar payload; sin cambios de lógica de negocio ni flujo fire-and-forget.
- Q: ¿Timeout del `fetch` a Brevo? → A: 15 segundos con `AbortSignal`; errores por timeout se loguean como `warn` sin propagar.
- Q: ¿Eliminar `@nestjs-modules/mailer` de `package.json`? → A: Sí, si no hay uso en `src/` (dependencia legacy sin referencias).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correo de confirmación en producción (Priority: P1)

Como cliente que confirma un pedido en la tienda, necesito recibir el email de
confirmación con el resumen de mi compra, para tener constancia del pedido y el enlace
a `/postShop/:id` aunque no revise el sitio de inmediato.

**Why this priority**: En Render, Gmail SMTP no conecta (ETIMEDOUT); el checkout ya funciona
(002) pero los mails nunca llegan. Brevo vía HTTP resuelve la entrega real en producción.

**Independent Test**: Tras deploy con `BREVO_API_KEY` y sender verificado, crear pedido de
prueba y verificar recepción en bandeja del cliente y en CC del operador.

**Acceptance Scenarios**:

1. **Given** backend en producción con credenciales Brevo válidas y `EMAIL_FROM`
   verificado, **When** se confirma un pedido válido, **Then** el cliente recibe email
   HTML con productos, total y enlace post-compra.
2. **Given** pedido creado exitosamente, **When** Brevo acepta el envío, **Then** logs
   registran éxito con `orderId` y referencia de mensaje Brevo.
3. **Given** `EMAIL_CC` configurado, **When** se envía confirmación, **Then** el operador
   recibe copia del correo.

---

### User Story 2 - Checkout intacto ante fallo Brevo (Priority: P2)

Como cliente, necesito que mi pedido se confirme aunque falle el envío del correo, para
no quedar bloqueado en la pantalla de carga ni perder la compra.

**Why this priority**: Comportamiento garantizado en 002; esta feature no debe regresarlo
al acoplar Brevo.

**Independent Test**: Simular respuesta de error de Brevo API; `POST /orders` responde
en <3s; orden persiste; sin delete por fallo de mail.

**Acceptance Scenarios**:

1. **Given** API Brevo no disponible o rechaza el envío, **When** se confirma pedido,
   **Then** `POST /orders` responde exitosamente en menos de 3 segundos.
2. **Given** fallo de Brevo en background, **When** el flujo termina, **Then** la orden
   permanece en base de datos sin rollback.
3. **Given** error Brevo, **When** se registra en logs, **Then** no se propaga excepción
   al request HTTP ya completado.

---

### User Story 3 - Código sin Nodemailer (Priority: P3)

Como desarrollador del backend, necesito que el único adapter de email sea Brevo vía
`EmailModule`, sin dependencias SMTP legacy, para simplificar deploy en Render y mantenimiento.

**Why this priority**: Elimina código y deps muertas; alinea infra con proveedor HTTP.

**Independent Test**: `rg nodemailer src/` y `package.json` → 0 referencias; `EmailModule`
registra `BrevoEmailSender` como `EMAIL_SENDER`.

**Acceptance Scenarios**:

1. **Given** el repositorio post-implementación, **When** se audita `src/` y
   `package.json`, **Then** no existen referencias a `nodemailer`, `NodemailerEmailSender`
   ni `NodemailerModule`.
2. **Given** `EmailModule`, **When** se inspecciona DI, **Then** `{ provide: EMAIL_SENDER,
   useClass: BrevoEmailSender }` y export del token.
3. **Given** `OrdersModule`, **When** importa email, **Then** usa `EmailModule` (no
   `NodemailerModule`); `OrdersService` mantiene la misma lógica (solo renombre de env
   `EMAIL_CC` en payload si aplica).

---

### Edge Cases

- ¿Qué ocurre si `BREVO_API_KEY` es inválida? Pedido se confirma; log `warn`; sin mail.
- ¿Qué ocurre si `EMAIL_FROM` no está verificado en Brevo? API error 4xx; mismo
  comportamiento no bloqueante.
- ¿Qué ocurre si fetch a `api.brevo.com` hace timeout? Log error; checkout no afectado.
- ¿Qué ocurre en development sin key Brevo? Fail-fast al arrancar vía Zod en `envs.ts`
  (key requerida).
- ¿Qué ocurre con destinatario inválido? Brevo rechaza; log; orden ya persistida.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST implementar `BrevoEmailSender implements EmailSender` usando
  `fetch` HTTP a `https://api.brevo.com/v3/smtp/email` con timeout de 15 s (`AbortSignal`).
- **FR-002**: `BrevoEmailSender` MUST enviar con remitente `"SaphireSouvenirs"` +
  `envs.EMAIL_FROM`, destinatario `payload.to`, CC `payload.cc`, asunto `payload.subject`,
  cuerpo HTML `payload.html`.
- **FR-003**: El sistema MUST registrar `BrevoEmailSender` en `EmailModule` como
  `{ provide: EMAIL_SENDER, useClass: BrevoEmailSender }` y exportar `EMAIL_SENDER`.
- **FR-004**: `OrdersModule` y `AppModule` MUST importar `EmailModule` (reemplazar
  `NodemailerModule`). `OrdersService` MUST NOT cambiar lógica de negocio; único cambio
  permitido: referencia `envs.EMAIL_CC` en lugar de `envs.NODEMAILER_CC` al construir payload.
- **FR-005**: El sistema MUST eliminar `src/modules/nodemailer/`, `NodemailerEmailSender`,
  dependencias `nodemailer` / `@types/nodemailer` y `@nestjs-modules/mailer` (si sin uso)
  de `package.json`.
- **FR-006**: `envs.ts` MUST validar `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_CC` con Zod;
  MUST eliminar `NODEMAILER_USER`, `NODEMAILER_PASS`, `NODEMAILER_FROM`, `NODEMAILER_CC`.
- **FR-007**: `.env.example` MUST documentar las nuevas variables y eliminar sección
  Nodemailer/Gmail.
- **FR-008**: Errores de Brevo MUST loguearse con `Logger` incluyendo `orderId`; MUST NOT
  propagar al caller HTTP (fire-and-forget preservado desde 002).
- **FR-009**: Éxitos MUST loguearse con `Logger` incluyendo `orderId` y id de mensaje
  Brevo si la API lo devuelve.
- **FR-010**: El cambio MUST incluir tests unitarios de `BrevoEmailSender` con `fetch`
  mockeado: éxito → log; error HTTP → `warn` sin throw.
- **FR-011**: Tests existentes de `OrdersService` MUST seguir pasando sin modificación
  de comportamiento de negocio.
- **FR-012**: MUST actualizar contrato en
  `specs/003-email-provider-brevo/contracts/email-sender.md` (v2) durante plan/implement.
- **FR-013**: `OrdersService` MUST seguir usando `envs.NODEMAILER_CC` renombrado a
  `envs.EMAIL_CC` en payload (único cambio de referencia env en orders si aplica).

### Key Entities

- **EmailSender (contrato 002)**: Sin cambios de interfaz ni payload.
- **BrevoEmailSender (adapter)**: Transporte HTTP Brevo; única implementación en runtime.
- **EmailModule**: Módulo NestJS que exporta `EMAIL_SENDER`.
- **Variables de entorno**: `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_CC`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tras deploy en Render con credenciales Brevo, 100% de pedidos de prueba
  envían mail recibido en cliente y CC (verificación manual).
- **SC-002**: `POST /orders` válidos responden en menos de 3 segundos independientemente
  del resultado del envío Brevo (regresión 002).
- **SC-003**: `npm test` pasa incluyendo `brevo-email.sender.spec.ts` y
  `orders.service.spec.ts` sin SMTP ni API real en CI.
- **SC-004**: 0 referencias a `nodemailer` en `src/` y en `dependencies` de
  `package.json`.
- **SC-005**: Un desarrollador configura email local siguiendo `.env.example` con cuenta
  Brevo en menos de 15 minutos.

## Assumptions

- Feature 002 completada: `EmailSender`, fire-and-forget, transacción DB, tests
  `OrdersService`.
- Cuenta Brevo activa con API key y sender/dominio verificado para `EMAIL_FROM`.
- Render permite `fetch` saliente a `https://api.brevo.com`.
- No se usa SDK oficial Brevo; solo `fetch` nativo (Node 20).
- Sin selector multi-proveedor (`EMAIL_PROVIDER`); solo Brevo en runtime.
- Constitución: cumple II (envs), VI (tests), VIII (sin `any`); sin cambios `@Entity`.

## Out of Scope

- Modificar lógica de `OrdersService.create`, `orders.controller`, frontend.
- SDK `@getbrevo/brevo`.
- Cola, reintentos, campo `emailSent` en DB.
- Convivencia Nodemailer + Brevo en runtime.
- Envelope `{ data: T }` en APIs.
- Tests e2e con API Brevo real en CI.

## Dependencies

- Feature `002-order-email-decouple` (contrato `EmailSender`, `EMAIL_SENDER`).
- API Brevo Transactional Email v3.
- Variables en Render: `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_CC`.

## Migration Notes

| Antes (002) | Después (003) |
|-------------|---------------|
| `NodemailerModule` | `EmailModule` |
| `NodemailerEmailSender` | `BrevoEmailSender` |
| `NODEMAILER_*` (4 vars) | `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_CC` |
| SMTP Gmail | HTTP Brevo |

Actualizar `.env` local y dashboard Render al desplegar; no commitear secretos.
