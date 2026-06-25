# Quickstart: Validar 005-order-payments-lifecycle

Guía post-implementación. Requiere 004 desplegado + migración `depositAmount` / enum `cancelled`.

## Prerequisites

- Backend local `npm run start` con DB sincronizada
- Token admin: `POST /api/v1/auth/signin`
- Al menos un pedido de prueba con `totalPrice` conocido (`ORDER_ID`)

## 1. Campos de pago en GET público

```bash
curl http://localhost:3000/api/v1/orders/<ORDER_ID>
```

**Esperado**: `depositAmount: 0`, `remainingBalance` = `totalPrice`, `state: inProcess`.

## 2. Registrar seña parcial

```bash
curl -X PUT http://localhost:3000/api/v1/orders/<ORDER_ID> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"depositAmount": 5000}'
```

**Esperado**: `state: partialPayment`, `remainingBalance: totalPrice - 5000`, timeline
`payment_updated` en GET admin.

## 3. Seña = total → pagado

```bash
curl -X PUT ... -d '{"depositAmount": <TOTAL_PRICE>}'
```

**Esperado**: `state: paid`, `remainingBalance: 0`.

## 4. Monto gana sobre state manual

```bash
curl -X PUT ... -d '{"depositAmount": 3000, "state": "paid"}'
```

(con total 10000)

**Esperado**: `state: partialPayment` (no `paid`).

## 5. Edición integral — productos

```bash
curl -X PUT http://localhost:3000/api/v1/orders/<ORDER_ID> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"products":[{"productId":"<PRODUCT_UUID>","cuantity":2}]}'
```

**Esperado**: `orderDetails` actualizados, `totalPrice` recalculado, `order_edited` +
nota automática en admin.

## 6. Seña > total tras bajar productos → 400

Pedido con seña $8000; PUT products que dejen total < 8000 sin bajar seña antes.

**Esperado**: 400, pedido sin cambios.

## 7. Cancelar pedido señado

```bash
curl -X PUT ... -d '{"state":"cancelled","cancelReason":"Cliente desistió"}'
```

**Esperado**: `state: cancelled`; desaparece de `GET /orders` default; visible con
`?state=cancelled`.

## 8. No cancelar pagado

En pedido `paid`:

```bash
curl -X PUT ... -d '{"state":"cancelled"}'
```

**Esperado**: 409.

## 9. Post-shop bloqueado

```bash
curl -w "%{http_code}" http://localhost:3000/api/v1/orders/<CANCELLED_ORDER_ID>
```

**Esperado**: 404.

## 10. Admin ve cancelado

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3000/api/v1/orders/<CANCELLED_ORDER_ID>/admin
```

**Esperado**: 200 con timeline `order_cancelled`.

## 11. Conflictos body

```bash
curl -X PUT ... -d '{"state":"cancelled","depositAmount":1000}'
```

**Esperado**: 400.

## 12. Checkout sin regresión

`POST /api/v1/orders` con payload checkout válido.

**Esperado**: orden creada; `depositAmount: 0`; email sigue funcionando.

## 13. Tests

```bash
npm test -- orders.service.spec.ts
npm run build
```

**Esperado**: verde.
