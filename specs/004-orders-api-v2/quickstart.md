# Quickstart: Validar 004-orders-api-v2

Guía post-implementación para verificar Orders API v2 con front 005.

## Prerequisites

- Backend con migración/synchronize aplicada (`OrderTimelineEvent`, `OrderAdminNote`)
- Token admin (`POST /api/v1/auth/signin`)
- Front local con `VITE_API_URL=http://localhost:3000/api/v1`

## 1. Auth en listado

```bash
# Sin token → 400/403
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/orders

# Con token admin
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3000/api/v1/orders?state=inProcess&page=1&limit=20"
```

**Esperado**: JSON `{ "data": [...], "meta": { total, page, limit, totalPages } }`; cada ítem con `orderDetails[].product.name`.

## 2. Checkout público intacto

```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{ ... CreateOrderDto válido ... }'
```

**Esperado**: 201/200 con orden; evento `created` en DB; email CTA `/post-shop/:id`.

## 3. PUT parcial

```bash
curl -X PUT http://localhost:3000/api/v1/orders/<ORDER_ID> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"state":"paid"}'
```

**Esperado**: orden actualizada; timeline `state_changed`.

```bash
# Prohibido
curl -X PUT ... -d '{"orderDetails":[]}'
```

**Esperado**: 400.

## 4. Detalle admin

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3000/api/v1/orders/<ORDER_ID>/admin
```

**Esperado**: `timeline[]`, `notes[]` en raíz.

## 5. Nota interna

```bash
curl -X POST http://localhost:3000/api/v1/orders/<ORDER_ID>/notes \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"note":"Prueba nota interna"}'
```

**Esperado**: 201/200; nota en siguiente GET admin.

## 6. Post-shop público

```bash
curl http://localhost:3000/api/v1/orders/<ORDER_ID>
```

**Esperado**: sin claves `timeline`, `notes`, `adminNotes`.

## 7. Tests

```bash
npm test -- orders.service
npm test
npm run build
```

## 8. Smoke front 005

1. Login admin → `/orders`
2. Filtrar por estado → listado refetch (no solo cliente)
3. Modal "Ver" → timeline server + notas
4. Cambiar pago/envío → PUT OK + timeline optimista merge

## Referencias

- [contracts/orders-api.md](./contracts/orders-api.md)
- [data-model.md](./data-model.md)
- Front: `SaphireSouvernis-Front/specs/005-orders-operations-overhaul/contracts/orders-api-client.md`
