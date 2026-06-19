# Contract: EmailSender (DI Port)

**Feature**: 002-order-email-decouple  
**Version**: 1.0  
**Status**: Approved for implementation

## Purpose

Abstracción de transporte de correo desacoplada de `OrdersService`. Permite cambiar el
proveedor (Nodemailer/Gmail → Resend/SendGrid) registrando otra implementación en el
módulo NestJS sin modificar la lógica de creación de pedidos.

## Token de inyección

```typescript
export const EMAIL_SENDER = Symbol('EMAIL_SENDER');
```

Registro en módulo:

```typescript
{
  provide: EMAIL_SENDER,
  useClass: NodemailerEmailSender,
}
```

Consumo:

```typescript
constructor(
  @Inject(EMAIL_SENDER)
  private readonly emailSender: EmailSender,
) {}
```

## Interface `EmailSender`

```typescript
export interface EmailSender {
  sendOrderConfirmation(
    payload: SendOrderConfirmationPayload,
  ): Promise<void>;
}
```

### Semántica

| Aspecto | Regla |
|---------|-------|
| Idempotencia | No garantizada en v1 |
| Bloqueo | MUST NOT bloquear el caller HTTP; invocación fire-and-forget desde OrdersService |
| Errores | Implementación MUST loguear y resolver/rechazar sin propagar al request HTTP completado |
| Side effects | Envío de email externo únicamente |

## Payload `SendOrderConfirmationPayload`

```typescript
export interface SendOrderConfirmationPayload {
  to: string;
  cc: string;
  subject: string;
  html: string;
  orderId: string;
}
```

| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| `to` | Sí | Email del cliente |
| `cc` | Sí | Copia al operador (`envs.NODEMAILER_CC`) |
| `subject` | Sí | Asunto del correo |
| `html` | Sí | Cuerpo HTML **ya renderizado** por OrdersService |
| `orderId` | Sí | UUID de la orden para logs |

## Implementación inicial: `NodemailerEmailSender`

| Responsabilidad | Detalle |
|-----------------|---------|
| Transport | Gmail vía `nodemailer.createTransport({ service: 'gmail', ... })` |
| Timeouts | `connectionTimeout: 10000`, `greetingTimeout: 10000`, `socketTimeout: 15000` |
| From header | `"SaphireSouvenirs" <${envs.NODEMAILER_FROM}>` |
| Recipients | `[payload.to, payload.cc]` |
| Logging éxito | `Logger.log` con `orderId` + `messageId` |
| Logging error | `Logger.warn` con `orderId` + error; **no** `ConflictException` |

## Implementación futura (out of scope)

```typescript
@Injectable()
export class ResendEmailSender implements EmailSender {
  async sendOrderConfirmation(payload: SendOrderConfirmationPayload): Promise<void> {
    // HTTP API Resend
  }
}
```

Swap en módulo:

```typescript
{ provide: EMAIL_SENDER, useClass: ResendEmailSender }
```

## Prohibiciones

- `OrdersService` MUST NOT import `NodemailerEmailSender` ni `nodemailer` directamente
- MUST NOT registrar implementaciones concretas en `OrdersModule.providers`
- MUST NOT construir HTML dentro de `EmailSender` implementations
- MUST NOT usar `process.env`; solo `envs` desde `src/config/envs.ts`

## Test doubles

En tests unitarios de `OrdersService`:

```typescript
const emailSenderMock: EmailSender = {
  sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
};
// provider: { provide: EMAIL_SENDER, useValue: emailSenderMock }
```

Casos mínimos:

1. `sendOrderConfirmation` invocado tras persistencia exitosa
2. Mock rechaza → orden no eliminada; `create` resuelve con order
3. Fallo DB → `create` rechaza; email mock no invocado o invocado 0 veces
