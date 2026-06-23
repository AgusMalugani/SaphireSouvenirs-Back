# Implementation Plan: Migrar proveedor de email a Brevo API

**Branch**: `003-email-provider-brevo` | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-email-provider-brevo/spec.md`

## Summary

Reemplazar `NodemailerEmailSender` (Gmail SMTP, ETIMEDOUT en Render) por `BrevoEmailSender`
usando `fetch` a la API transaccional de Brevo. Renombrar `NodemailerModule` → `EmailModule`,
actualizar `envs.ts` (`BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_CC`), eliminar nodemailer y
deps legacy. El contrato `EmailSender` de la feature 002 permanece intacto; `OrdersService`
solo renombra referencia env en payload.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS

**Primary Dependencies**: NestJS 10, `fetch` nativo (Node 20), Jest 29, Zod 4

**Storage**: PostgreSQL (Neon) — sin cambios de esquema

**Testing**: `brevo-email.sender.spec.ts` (mock fetch) + `orders.service.spec.ts` (regresión)

**Target Platform**: Render (backend) + Vercel (frontend sin cambios)

**Project Type**: Monolito NestJS REST API

**Performance Goals**: `POST /orders` <3s (regresión 002); Brevo fetch timeout 15s async

**Constraints**: Sin SDK Brevo; sin `process.env` en `src/`; sin cambios `@Entity`

**Scale/Scope**: ~8 archivos create/modify/delete, 1 test file nuevo, 3 env vars nuevas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Reference: `.specify/memory/constitution.md` (v1.0.0)

- [x] Lógica de negocio en `Services` — `BrevoEmailSender` en módulo email
- [x] Variables de entorno solo vía `envs.ts` + `.env.example` actualizado
- [x] Endpoints nuevos — N/A
- [x] Swagger — N/A
- [x] Persistencia — sin cambios `@Entity`
- [x] Tests: `BrevoEmailSender` + regresión `OrdersService`
- [x] Envelope `{ data: T }` — N/A
- [x] Workflow SDD: specify ✅ → clarify ✅ → plan (este doc) → tasks → analyze

**Post-design re-check**: Sin violaciones.

## Project Structure

### Documentation (this feature)

```text
specs/003-email-provider-brevo/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/email-sender.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/modules/email/
├── email-sender.token.ts           # EXISTING
├── email-sender.interface.ts       # EXISTING
├── send-order-confirmation.payload.ts  # EXISTING
├── email.module.ts                 # CREATE (reemplaza nodemailer.module)
└── brevo/
    ├── brevo-email.sender.ts       # CREATE
    └── brevo-email.sender.spec.ts  # CREATE

src/modules/nodemailer/             # DELETE entire folder

src/config/envs.ts                  # MODIFY: BREVO_*, EMAIL_*, remove NODEMAILER_*
src/modules/orders/orders.service.ts    # MODIFY: envs.EMAIL_CC (1 línea)
src/modules/orders/orders.service.spec.ts  # MODIFY: mock env keys
src/modules/orders/orders.module.ts     # MODIFY: EmailModule import
src/app.module.ts                   # MODIFY: EmailModule import

.env.example                        # MODIFY
package.json                        # MODIFY: remove nodemailer, @types/nodemailer, @nestjs-modules/mailer
```

**Structure Decision**: Adapter Brevo bajo `src/modules/email/brevo/`; módulo unificado
`EmailModule` colocalizado con contratos DI existentes de 002.

## Phase 0: Research

Ver [research.md](./research.md) — 9 decisiones (R1–R9), sin NEEDS CLARIFICATION.

## Phase 1: Design

| Artefacto | Propósito |
|-----------|-----------|
| [data-model.md](./data-model.md) | Env vars, mapping Brevo API |
| [contracts/email-sender.md](./contracts/email-sender.md) | Contrato v2 Brevo |
| [quickstart.md](./quickstart.md) | Validación local + Render |

## Implementation Approach

### 1. `BrevoEmailSender` (`src/modules/email/brevo/brevo-email.sender.ts`)

```typescript
const BREVO_SEND_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_FETCH_TIMEOUT_MS = 15_000;

@Injectable()
export class BrevoEmailSender implements EmailSender {
  async sendOrderConfirmation(payload: SendOrderConfirmationPayload): Promise<void> {
    try {
      const response = await fetch(BREVO_SEND_EMAIL_URL, {
        method: 'POST',
        headers: {
          'api-key': envs.BREVO_API_KEY,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'SaphireSouvenirs', email: envs.EMAIL_FROM },
          to: [{ email: payload.to }],
          cc: [{ email: payload.cc }],
          subject: payload.subject,
          htmlContent: payload.html,
        }),
        signal: AbortSignal.timeout(BREVO_FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.warn(
          `Order confirmation email failed for ${payload.orderId}: HTTP ${response.status} ${errorBody}`,
        );
        return;
      }

      const responseBody = (await response.json()) as { messageId?: string };
      this.logger.log(
        `Order confirmation email sent for ${payload.orderId}: ${responseBody.messageId ?? 'ok'}`,
      );
    } catch (error: unknown) {
      this.logger.warn(
        `Order confirmation email failed for ${payload.orderId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
```

### 2. `EmailModule` (`src/modules/email/email.module.ts`)

Mover lógica de `nodemailer.module.ts`; registrar `BrevoEmailSender`; export `EMAIL_SENDER`.

### 3. `envs.ts`

```typescript
BREVO_API_KEY: z.string().min(1),
EMAIL_FROM: z.string().email(),
EMAIL_CC: z.string().email(),
// eliminar NODEMAILER_USER, NODEMAILER_PASS, NODEMAILER_FROM, NODEMAILER_CC
```

### 4. Actualizar imports

| Archivo | Cambio |
|---------|--------|
| `app.module.ts` | `NodemailerModule` → `EmailModule` from `modules/email/email.module` |
| `orders.module.ts` | idem |
| `orders.service.ts` | `envs.NODEMAILER_CC` → `envs.EMAIL_CC` |
| `orders.service.spec.ts` | mock `EMAIL_CC` |

### 5. Eliminar legacy

- Delete `src/modules/nodemailer/` (module + nodemailer-email.sender.ts)
- `npm uninstall nodemailer @types/nodemailer @nestjs-modules/mailer`

### 6. Tests `brevo-email.sender.spec.ts`

| Caso | Mock fetch | Assert |
|------|------------|--------|
| Success | 201 + `{ messageId: 'brevo-123' }` | resolves, log called |
| HTTP error | 401 + body | resolves, warn, no throw |
| Network error | `reject` | resolves, warn, no throw |

Verificar headers `api-key` y body JSON en caso success.

### 7. Sin cambios

- `EmailSender` interface / payload / token
- `OrdersService.create` lógica (transacción, fire-and-forget, HTML)
- `orders.controller.ts`, frontend

## Complexity Tracking

> Sin violaciones.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Risks & Mitigations

| Riesgo | Mitigación |
|--------|------------|
| `EMAIL_FROM` no verificado en Brevo | Documentar en quickstart; log 4xx claro |
| Render sin vars nuevas post-deploy | Checklist migración NODEMAILER_* → BREVO/EMAIL_* |
| `AbortSignal.timeout` no en Node antiguo | `engines.node: 20.x` en package.json |
| Regresión checkout | Mantener fire-and-forget; tests orders.service |

## Next Step

Ejecutar `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.
