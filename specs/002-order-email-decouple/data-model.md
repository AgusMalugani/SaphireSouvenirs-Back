# Data Model: 002-order-email-decouple

Esta feature **no modifica** entidades TypeORM ni tablas PostgreSQL. Documenta
contratos de aplicación, flujo de persistencia transaccional y variables de entorno
existentes.

## Entidades de persistencia (sin cambios)

| Entidad | Tabla | Cambios |
|---------|-------|---------|
| `Order` | `order` | Ninguno |
| `Orderdetail` | `orderdetail` | Ninguno |
| `Product` | `product` | Ninguno (lectura en detalle) |

Relación existente: `Orderdetail.order` → FK a `Order.id` (sin cascade delete configurado
en app; la transacción evita estados inconsistentes).

## Contratos de aplicación (nuevos)

### `EmailSender` (interfaz / port)

| Método | Descripción |
|--------|-------------|
| `sendOrderConfirmation(payload: SendOrderConfirmationPayload): Promise<void>` | Transporta el correo; no construye HTML |

### `SendOrderConfirmationPayload`

| Campo | Tipo | Origen | Validación |
|-------|------|--------|------------|
| `to` | `string` | `CreateOrderDto.email` | email del cliente |
| `cc` | `string` | `envs.NODEMAILER_CC` | copia operador |
| `subject` | `string` | constante / OrdersService | ej. `"Confirmación de Pedido ✔"` |
| `html` | `string` | `buildOrderConfirmationHtml()` | HTML renderizado |
| `orderId` | `string` | `order.id` UUID | trazabilidad en logs |

### `EMAIL_SENDER` (token DI)

| Propiedad | Valor |
|-----------|-------|
| Tipo | `Symbol('EMAIL_SENDER')` o constante string |
| Provider | `NodemailerEmailSender` (inicial) |
| Export | `NodemailerModule` |

## Environment Variables (sin cambios en schema)

| Variable | Uso en feature |
|----------|----------------|
| `NODEMAILER_USER` | Auth SMTP Gmail |
| `NODEMAILER_PASS` | App Password Gmail |
| `NODEMAILER_FROM` | Remitente |
| `NODEMAILER_CC` | CC en confirmación |
| `URL_CLIENT` | Link CTA en HTML (`/postShop/:id`) |

No se agregan variables nuevas en esta feature.

## Flujo de persistencia transaccional

```text
POST /orders
  → OrdersService.create()
      → DataSource.transaction()
          1. save Order (totalPrice: 0)
          2. OrderdetailsService.create(dto, order, manager?) × N
          3. calcular total
          4. save Order (totalPrice actualizado)
      → commit
      → void EmailSender.sendOrderConfirmation(payload)  // async, no await
      → return Order
```

### State transitions (orden)

| Estado | Condición |
|--------|-----------|
| No existe | Antes de transacción |
| Persistida completa | Tras commit exitoso (`state: inProcess` default entity) |
| No persistida | Rollback por error en pasos 1–4 |
| Email enviado / fallido | **No modelado en DB** (solo logs en esta feature) |

## Relationships (DI)

```text
OrdersModule
  imports → NodemailerModule (exports EMAIL_SENDER)
  injects → OrdersService(@Inject(EMAIL_SENDER) emailSender: EmailSender)

NodemailerModule
  provides → { EMAIL_SENDER → NodemailerEmailSender }
  uses → envs.NODEMAILER_*

OrdersService
  builds → SendOrderConfirmationPayload
  calls → emailSender.sendOrderConfirmation (fire-and-forget)
```

## HTTP Contract (legacy, sin cambios)

| Endpoint | Request | Response |
|----------|---------|----------|
| `POST /api/v1/orders` | `CreateOrderDto` | Objeto `Order` directo (sin `{ data: T }`) |
