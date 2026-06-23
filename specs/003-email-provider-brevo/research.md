# Research: 003-email-provider-brevo

**Date**: 2026-06-13

## R1: Proveedor HTTP vs SMTP en Render

**Decision**: Migrar a Brevo Transactional Email API (`POST /v3/smtp/email`) vía `fetch`.

**Rationale**: Feature 002 confirmó ETIMEDOUT en conexión SMTP Gmail desde Render; HTTP
desde PaaS es más fiable. El contrato `EmailSender` de 002 permite swap sin tocar
`OrdersService`.

**Alternatives considered**:

- Mantener Nodemailer/Gmail — rechazado; no entrega en prod
- Resend/SendGrid — rechazado; usuario eligió Brevo
- SDK `@getbrevo/brevo` — rechazado en spec; usar `fetch` nativo

## R2: Ubicación de `BrevoEmailSender` y `EmailModule`

**Decision**: `src/modules/email/brevo/brevo-email.sender.ts` + `src/modules/email/email.module.ts`.
Eliminar carpeta `src/modules/nodemailer/` por completo.

**Rationale**: Contratos DI ya viven en `src/modules/email/`; el adapter Brevo es
hermano lógico bajo el mismo dominio. `EmailModule` reemplaza `NodemailerModule`.

**Alternatives considered**:

- Mantener `nodemailer/` y solo cambiar clase — rechazado; nombre confuso post-migración
- Módulo `BrevoModule` separado — rechazado; un solo `EmailModule` exporta token

## R3: Variables de entorno

**Decision**:

| Nueva | Reemplaza |
|-------|-----------|
| `BREVO_API_KEY` | — |
| `EMAIL_FROM` | `NODEMAILER_FROM` |
| `EMAIL_CC` | `NODEMAILER_CC` |

Eliminar: `NODEMAILER_USER`, `NODEMAILER_PASS`.

**Rationale**: Alineado con clarify; nombres agnósticos del proveedor para from/cc;
API key específica de Brevo.

## R4: Payload Brevo API

**Decision**: Mapear `SendOrderConfirmationPayload` a cuerpo JSON Brevo:

```json
{
  "sender": { "name": "SaphireSouvenirs", "email": "<EMAIL_FROM>" },
  "to": [{ "email": "<payload.to>" }],
  "cc": [{ "email": "<payload.cc>" }],
  "subject": "<payload.subject>",
  "htmlContent": "<payload.html>"
}
```

Headers: `api-key: <BREVO_API_KEY>`, `Content-Type: application/json`.

**Rationale**: `OrdersService` ya pasa `cc: envs.EMAIL_CC` en payload; no duplicar env
en `BrevoEmailSender`.

## R5: Timeout y errores

**Decision**: `AbortSignal.timeout(15_000)` en `fetch`; catch log `warn` con `orderId`;
nunca `throw` hacia caller (igual que `NodemailerEmailSender` en 002).

**Rationale**: Clarify session; evita colgar worker; preserva fire-and-forget.

## R6: Cambio mínimo en `OrdersService`

**Decision**: Única línea: `envs.NODEMAILER_CC` → `envs.EMAIL_CC` en payload de email.
Actualizar mock en `orders.service.spec.ts` (`EMAIL_CC`).

**Rationale**: FR-004/FR-013; sin cambio de lógica `create()`.

## R7: Limpieza de dependencias

**Decision**: Remover de `package.json`:

- `nodemailer`
- `@types/nodemailer`
- `@nestjs-modules/mailer` (sin referencias en `src/`)

Ejecutar `npm install` para actualizar lockfile.

**Rationale**: FR-005; reduce superficie y vulnerabilidades transitivas.

## R8: Tests

**Decision**: `brevo-email.sender.spec.ts` con `global.fetch` mockeado:

1. Respuesta 201 + `{ messageId }` → `Logger.log` invocado
2. Respuesta 400/500 → `Logger.warn`, método resuelve sin throw
3. (Opcional) timeout / reject → `warn` sin throw

`orders.service.spec.ts`: actualizar mock env keys solamente.

**Rationale**: FR-010/FR-011; sin API real en CI.

## R9: URL Brevo en envs (opcional)

**Decision**: URL hardcodeada en `BrevoEmailSender`:

`https://api.brevo.com/v3/smtp/email`

No agregar `BREVO_API_URL` a envs (YAGNI).

**Rationale**: Endpoint estable; evita variable extra.
