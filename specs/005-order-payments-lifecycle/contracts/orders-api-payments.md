# Contract: Orders API — Payments & Lifecycle (delta 005)

**Feature**: 005-order-payments-lifecycle  
**Version**: 1.0  
**Status**: Approved for implementation  
**Base**: [004 orders-api.md](../../004-orders-api-v2/contracts/orders-api.md)

## Base path

`/api/v1/orders`

## Cambios respecto a 004

### Nuevos campos en Order (todas las respuestas con Order)

| Campo | Tipo | Persistido | Notas |
|-------|------|------------|-------|
| `depositAmount` | number (int ≥ 0) | Sí | Default 0 |
| `remainingBalance` | number | No | `max(0, totalPrice - depositAmount)` |

### StateEnum

+ `cancelled`

Estados de pago (`inProcess`, `partialPayment`, `paid`) **no se aceptan** como input
manual en PUT; se derivan de `depositAmount` + `totalPrice`. Excepción: `state: cancelled`.

---

## PUT /orders/:id [admin]

Reemplaza whitelist de 004.

### Body permitido

| Campo | Tipo | Notas |
|-------|------|-------|
| `depositAmount` | number | Entero ≥ 0, ≤ `totalPrice` |
| `state` | string | Solo `"cancelled"` |
| `cancelReason` | string | Opcional, max 500, trim |
| `transactionType` | enum | `send` \| `withdraw` |
| `address` | string | 3–100 chars |
| `nameClient` | string | |
| `personalizationName` | string | |
| `email` | email | |
| `numCel` | string | |
| `num2Cel` | string | |
| `theme` | string | |
| `endOrder` | date string | ISO date |
| `products` | array | `[{ productId, cuantity }]`, min 1 si presente |

### Prohibidos (400 `forbidNonWhitelisted`)

`totalPrice`, `orderDetails`, `remainingBalance`, `id`, `createAt`, `products` vacío,
`state` distinto de `cancelled`, `depositAmount` + `state: cancelled` juntos.

### Comportamiento

1. Pedido `cancelled` → 409 en edición (salvo cancel idempotente).
2. `state: cancelled` desde `inProcess` \| `partialPayment` → ok; desde `paid` → 409.
3. `depositAmount` presente → deriva `state` de pago; ignora `inProcess`/`partialPayment`/`paid` en body.
4. `products` presente → replace `orderDetails`, recalc `totalPrice`, re-derive state.
5. Si `depositAmount > totalPrice` tras recalc → 400, rollback.
6. Cambios reales → nota automática + timeline (`payment_updated`, `order_edited`, `order_cancelled`).
7. Sin cambios → 200 sin nota/evento duplicado.

### Response

`Order` + `depositAmount` + `remainingBalance` + relaciones habituales.

---

## GET /orders [admin]

| Query | Comportamiento |
|-------|----------------|
| (sin `state`) | Excluye `cancelled`; `meta.total` sin cancelados |
| `state=cancelled` | Solo cancelados |
| `state=inProcess\|partialPayment\|paid` | Ese estado (cancelados excluidos implícitamente) |

Resto igual que 004 (`q`, `page`, `limit`, `sort`, `transactionType`).

---

## GET /orders/:id [público]

| Condición | Response |
|-----------|----------|
| `state !== cancelled` | 200 Order + `depositAmount`, `remainingBalance` |
| `state === cancelled` | **404** Not Found |

Sin `timeline` / `notes` (igual 004).

---

## GET /orders/:id/admin [admin]

Sin cambio de envelope. Incluye pedidos `cancelled`. Campos de pago en orden raíz.

---

## POST /orders [público]

Sin cambio. No acepta `depositAmount`. Persiste `depositAmount: 0`, `state: inProcess`.

---

## Timeline types (completo post-005)

`created` | `state_changed`* | `transaction_changed`* | `admin_note_added` |
`payment_updated` | `order_edited` | `order_cancelled`

\* `state_changed` / `transaction_changed`: mantener de 004 para cambios **solo** de
entrega sin otros campos; derivación de pago por seña usa `payment_updated` en lugar de
`state_changed`.

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| 400 | Validación DTO, seña > total, cancel+deposit juntos, products inválidos |
| 404 | GET público pedido cancelado o id inexistente |
| 409 | Editar cancelado; cancelar `paid`; deposit en cancelado |

Auth 400/403 igual convención proyecto.

---

## Handoff front (fase posterior)

- Enviar `depositAmount` en lugar de `state` para pago.
- Cancelar con `PUT { state: "cancelled", cancelReason?: string }` en request separada.
- Post-shop: manejar 404 como “pedido no disponible”.
- Mostrar `remainingBalance` en panel admin.
