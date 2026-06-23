# Contract: EmailSender (DI Port) — v2 Brevo

**Feature**: 003-email-provider-brevo  
**Version**: 2.0  
**Status**: Approved for implementation  
**Supersedes**: `specs/002-order-email-decouple/contracts/email-sender.md` (implementación)

## Purpose

Contrato de transporte de correo sin cambios respecto a v1 (002). La implementación
runtime pasa de `NodemailerEmailSender` (SMTP Gmail) a `BrevoEmailSender` (HTTP API).

## Token de inyección

```typescript
export const EMAIL_SENDER = Symbol('EMAIL_SENDER');
```

Registro en `EmailModule`:

```typescript
@Module({
  providers: [{ provide: EMAIL_SENDER, useClass: BrevoEmailSender }],
  exports: [EMAIL_SENDER],
})
export class EmailModule {}
```

## Interface `EmailSender` (unchanged)

```typescript
export interface SendOrderConfirmationPayload {
  to: string;
  cc: string;
  subject: string;
  html: string;
  orderId: string;
}

export interface EmailSender {
  sendOrderConfirmation(payload: SendOrderConfirmationPayload): Promise<void>;
}
```

### Semántica (unchanged from v1)

| Aspecto | Regla |
|---------|-------|
| Bloqueo | MUST NOT bloquear HTTP; fire-and-forget desde OrdersService |
| Errores | Log `warn` con `orderId`; MUST NOT throw al caller |
| HTML | Pre-renderizado por OrdersService |

## Implementación: `BrevoEmailSender`

| Aspecto | Valor |
|---------|-------|
| URL | `https://api.brevo.com/v3/smtp/email` |
| Method | `POST` |
| Headers | `api-key: envs.BREVO_API_KEY`, `Content-Type: application/json`, `accept: application/json` |
| Timeout | 15 s (`AbortSignal.timeout(15_000)`) |
| Sender | `{ name: 'SaphireSouvenirs', email: envs.EMAIL_FROM }` |
| Recipients | `to: [{ email: payload.to }]`, `cc: [{ email: payload.cc }]` |
| Body | `subject`, `htmlContent: payload.html` |
| Success log | `orderId` + `messageId` from response JSON if present |
| Error log | `orderId` + status/body; no throw |

### Ejemplo request body

```json
{
  "sender": {
    "name": "SaphireSouvenirs",
    "email": "noreply@tudominio.com"
  },
  "to": [{ "email": "cliente@example.com" }],
  "cc": [{ "email": "operador@example.com" }],
  "subject": "Confirmación de Pedido ✔",
  "htmlContent": "<!DOCTYPE html>..."
}
```

## Prohibiciones (unchanged + extended)

- `OrdersService` MUST NOT import `BrevoEmailSender` directamente
- MUST NOT usar `process.env` en implementación
- MUST NOT usar `nodemailer` ni SMTP en runtime
- MUST NOT registrar `EMAIL_SENDER` fuera de `EmailModule`

## Environment

| Variable | Uso |
|----------|-----|
| `BREVO_API_KEY` | Header `api-key` |
| `EMAIL_FROM` | `sender.email` (verificado en Brevo) |
| `EMAIL_CC` | Valor en `payload.cc` desde OrdersService |

## Test doubles

```typescript
// BrevoEmailSender.spec.ts
global.fetch = jest.fn();

// OrdersService — sin cambio de mock EmailSender
const emailSenderMock: EmailSender = {
  sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
};
```

Casos `BrevoEmailSender`:

1. `fetch` → 201 + `{ messageId: 'abc' }` → resolves, log success
2. `fetch` → 400 → resolves, log warn, no throw
3. `fetch` → rejects (timeout) → resolves, log warn, no throw
