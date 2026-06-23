# Data Model: 004-orders-api-v2

⚠️ **Entity warning**: Esta feature crea `OrderTimelineEvent` y `OrderAdminNote`.
Con `synchronize: true` en desarrollo, TypeORM aplicará cambios de esquema al arrancar.
Requiere OK explícito de Agustin Malugani antes de implementar (constitución V).

## Entidades existentes (sin cambio de columnas)

### Order

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | uuid | PK |
| `state` | enum | `inProcess`, `partialPayment`, `paid` |
| `transactionType` | enum | `send`, `withdraw` |
| `createAt`, `endOrder` | date | sort default `createAt` |
| `nameClient`, `email`, `numCel`, `num2Cel`, `theme`, `address` | string | `q` search |
| `totalPrice` | number | no editable vía PUT |
| `orderDetails` | 1:N | con `product` en list/admin |

### Orderdetail / Product

Sin cambios. List/admin cargan `orderDetails.product` (mín. `id`, `name`, `img_url`).

## Entidades nuevas

### OrderTimelineEvent

| Columna | Tipo | Requerida | Notas |
|---------|------|-----------|-------|
| `id` | uuid | Sí | PK |
| `orderId` | uuid FK → Order | Sí | `onDelete: CASCADE` |
| `type` | varchar | Sí | `created`, `state_changed`, `transaction_changed`, `admin_note_added` |
| `payload` | jsonb | Sí | forma validada en Service |
| `createdAt` | timestamptz | Sí | default now |
| `createdByUserId` | uuid FK → User | No | null en `created` checkout |

**Payload shapes (v1)**

| type | payload |
|------|---------|
| `created` | `{}` o `{ orderId }` opcional |
| `state_changed` | `{ from: StateEnum, to: StateEnum }` |
| `transaction_changed` | `{ fromTransactionType?, toTransactionType?, fromAddress?, toAddress? }` |
| `admin_note_added` | `{ note: string }` |

### OrderAdminNote

| Columna | Tipo | Requerida | Notas |
|---------|------|-----------|-------|
| `id` | uuid | Sí | PK |
| `orderId` | uuid FK → Order | Sí | CASCADE |
| `text` | text | Sí | trim en DTO |
| `createdAt` | timestamptz | Sí | default now |
| `createdByUserId` | uuid FK → User | Sí | admin autenticado |

## API response shapes

### GET /orders (admin)

```json
{
  "data": [ { "...Order", "orderDetails": [{ "product": { "id", "name", "img_url" } }] } ],
  "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

### GET /orders/:id/admin (admin, raíz plana)

```json
{
  "id": "uuid",
  "state": "inProcess",
  "orderDetails": [],
  "timeline": [
    {
      "id": "uuid",
      "type": "state_changed",
      "payload": { "from": "inProcess", "to": "paid" },
      "createdAt": "2026-06-23T12:00:00.000Z",
      "createdBy": { "id": "uuid", "email": "admin@example.com" }
    }
  ],
  "notes": [
    {
      "id": "uuid",
      "text": "...",
      "createdAt": "...",
      "createdBy": { "id": "uuid", "email": "..." }
    }
  ]
}
```

### POST /orders/:id/notes

Request: `{ "note": "string" }`  
Response sugerida: `{ "note": { id, text, createdAt, createdBy } }` (front no depende del body hoy).

## Module graph

```text
OrdersModule
  TypeOrmModule.forFeature([
    Order, Orderdetail, Product, Category,
    OrderTimelineEvent, OrderAdminNote, User
  ])
  OrdersController
  OrdersService
```

## Índices recomendados (v1)

- `OrderTimelineEvent(orderId, createdAt)`
- `OrderAdminNote(orderId, createdAt)`
- Opcional: índice en `Order.state`, `Order.transactionType` si volumen crece
