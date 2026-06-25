# Data Model: 005-order-payments-lifecycle

⚠️ **Entity warning**: Esta feature **modifica** `Order` (+ `depositAmount`) y
`StateEnum` (+ `cancelled`). Con `synchronize: true` en desarrollo, TypeORM aplicará
cambios al arrancar. Requiere OK explícito de Agustin Malugani antes de implementar.

## Entidades modificadas

### Order

| Campo | Tipo | Default | Notas |
|-------|------|---------|-------|
| `depositAmount` | int (o numeric) | 0 | Monto señado en pesos ARS |
| `state` | enum | `inProcess` | + `cancelled` |

Sin cambio en: `id`, `createAt`, `endOrder`, `transactionType`, `address`, `totalPrice`,
`theme`, `nameClient`, `personalizationName`, `numCel`, `num2Cel`, `email`, `orderDetails`.

### StateEnum

`inProcess` | `partialPayment` | `paid` | **`cancelled`**

### Campo derivado API (no columna)

| Campo | Fórmula |
|-------|---------|
| `remainingBalance` | `max(0, totalPrice - depositAmount)` |

## Reglas de derivación de estado de pago

Solo aplica si `state !== cancelled`:

| depositAmount vs totalPrice | state |
|----------------------------|-------|
| `<= 0` | `inProcess` |
| `(0, total)` | `partialPayment` |
| `>= total` | `paid` |

## Entidades sin cambio de schema

### Orderdetail

Reemplazo lógico en PUT: delete all by `orderId` + recreate (misma forma que create).

### OrderTimelineEvent

Nuevos valores `type` (varchar):

| type | Cuándo |
|------|--------|
| `payment_updated` | Cambió `depositAmount` |
| `order_edited` | Cambió cliente, tema, fechas, productos, u otros no-pago |
| `order_cancelled` | Pasó a `cancelled` |

Tipos 004 sin cambio: `created`, `state_changed`, `transaction_changed`, `admin_note_added`.

**Payload shapes v1 (005)**

| type | payload |
|------|---------|
| `payment_updated` | `{ fromDeposit: number, toDeposit: number, totalPrice: number, remainingBalance: number }` |
| `order_edited` | `{ fields: string[], changes: Record<string, { from: unknown, to: unknown }>, productsChanged?: boolean }` |
| `order_cancelled` | `{ previousState: StateEnum, reason?: string }` |

### OrderAdminNote

Sin cambio schema. Notas automáticas del sistema usan misma tabla; `text` generado en
Service; `createdByUser` = admin que ejecutó PUT.

## API response shapes

### Order en GET/PUT (todos los endpoints que devuelven Order)

```json
{
  "id": "uuid",
  "state": "partialPayment",
  "depositAmount": 5000,
  "remainingBalance": 10000,
  "totalPrice": 15000,
  "orderDetails": [ ... ],
  "...": "resto campos Order"
}
```

### PUT /orders/:id — body whitelist

```json
{
  "depositAmount": 5000,
  "nameClient": "María García",
  "products": [{ "productId": "uuid", "cuantity": 2 }],
  "state": "cancelled",
  "cancelReason": "Cliente desistió"
}
```

**Mutuamente excluyente**: `state: cancelled` + `depositAmount` en misma request → 400.

## Module graph

```text
OrdersModule
  Order (+ depositAmount)
  Orderdetail (replace via OrderdetailsService)
  OrderTimelineEvent (+ 3 types)
  OrderAdminNote (system notes)
  OrdersService
    ├── derivePaymentState()
    ├── serializeOrderWithBalance()
    └── updateOrder() [transacción]
```

## Índices

Opcional v1: ninguno nuevo. Filtro `state != cancelled` usa columna `state` existente.

## Migración datos

| Pedido existente | Tras deploy |
|------------------|-------------|
| Cualquier state | `depositAmount = 0` (column default) |
| `partialPayment` sin monto histórico | Admin carga seña en primera edición |

No backfill automático de montos.
