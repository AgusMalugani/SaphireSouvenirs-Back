# Data Model: 003-email-provider-brevo

Esta feature **no modifica** entidades TypeORM. Documenta variables de entorno, contrato
DI (sin cambios) y integración Brevo HTTP.

## Environment Variables

| Variable | Tipo | Requerida | Reemplaza | Validación Zod |
|----------|------|-----------|-----------|----------------|
| `BREVO_API_KEY` | string | Sí | — | `z.string().min(1)` |
| `EMAIL_FROM` | email string | Sí | `NODEMAILER_FROM` | `z.string().email()` o `min(1)` |
| `EMAIL_CC` | email string | Sí | `NODEMAILER_CC` | `z.string().email()` o `min(1)` |

**Eliminadas**: `NODEMAILER_USER`, `NODEMAILER_PASS`, `NODEMAILER_FROM`, `NODEMAILER_CC`.

Variables sin cambio: `DATABASE_URL`, `JWT_SECRET`, `URL_CLIENT`, Cloudinary, seed admin, etc.

## Contratos de aplicación (sin cambios estructurales)

### `EmailSender` + `SendOrderConfirmationPayload`

Sin modificación respecto a feature 002. Ver
`src/modules/email/email-sender.interface.ts` y `send-order-confirmation.payload.ts`.

### `BrevoEmailSender`

| Responsabilidad | Detalle |
|-----------------|---------|
| Input | `SendOrderConfirmationPayload` |
| HTTP | `POST https://api.brevo.com/v3/smtp/email` |
| Auth | Header `api-key: envs.BREVO_API_KEY` |
| Timeout | 15 s (`AbortSignal`) |
| Output | `Promise<void>`; logs only |

## Brevo API Request (mapping)

```text
payload.to        → to[0].email
payload.cc        → cc[0].email
payload.subject   → subject
payload.html      → htmlContent
envs.EMAIL_FROM   → sender.email
"SaphireSouvenirs"→ sender.name
payload.orderId   → solo logs (no en body Brevo)
```

## Brevo API Response (éxito)

HTTP `201 Created` — body puede incluir `messageId` (string). Loguear con `orderId`.

## Module graph (post-migración)

```text
AppModule
  imports → EmailModule

OrdersModule
  imports → EmailModule, OrderdetailsModule, TypeOrmModule

EmailModule (src/modules/email/email.module.ts)
  providers → { EMAIL_SENDER → BrevoEmailSender }
  exports → EMAIL_SENDER

OrdersService
  @Inject(EMAIL_SENDER) emailSender: EmailSender
  payload.cc ← envs.EMAIL_CC
```

## Flujo de envío (sin cambios en HTTP de órdenes)

```text
POST /orders
  → OrdersService.create() [sin cambio lógico]
  → transaction DB → return order
  → void emailSender.sendOrderConfirmation(payload)  [fire-and-forget]
      → BrevoEmailSender → fetch Brevo API
```

## Migration mapping

| Artefacto 002 | Artefacto 003 |
|---------------|---------------|
| `NodemailerModule` | `EmailModule` |
| `nodemailer/nodemailer-email.sender.ts` | `email/brevo/brevo-email.sender.ts` |
| `nodemailer/nodemailer.module.ts` | `email/email.module.ts` |
| `NODEMAILER_*` | `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_CC` |
