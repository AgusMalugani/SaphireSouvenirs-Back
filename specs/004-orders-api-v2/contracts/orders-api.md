# Contract: Orders API v2

**Feature**: 004-orders-api-v2  
**Version**: 1.0  
**Status**: Approved for implementation  
**Consumer**: SaphireSouvernis-Front feature 005

## Base path

`/api/v1/orders`

## Endpoints

| Método | Path | Auth | Response |
|--------|------|------|----------|
| POST | `/` | No | `Order` (sin cambio) |
| GET | `/` | Admin | `{ data, meta }` |
| GET | `/:id` | No | `Order` sin timeline/notes |
| GET | `/:id/admin` | Admin | `Order` + `timeline` + `notes` (raíz) |
| POST | `/:id/notes` | Admin | `{ note: AdminNote }` |
| PUT | `/:id` | Admin | `Order` actualizado |
| DELETE | `/:id` | — | Sin cambio v1 (legacy) |

## GET / — query params

| Param | Tipo | Default | Validación |
|-------|------|---------|------------|
| `state` | string | omitido | `@IsEnum(StateEnum)` si presente |
| `transactionType` | string | omitido | `@IsEnum(TransactionTypeEnum)` si presente |
| `q` | string | omitido | trim, ILIKE multi-campo |
| `page` | number | 1 | coerce ≥1 |
| `limit` | number | 20 | coerce 1–100 |
| `sort` | string | `createAt` | solo `createAt` o 400 |
| `order` | string | `desc` | `asc` \| `desc` |

## PUT /:id — body permitido

```json
{ "state": "paid" }
```

```json
{ "transactionType": "send", "address": "Calle 123" }
```

Campos prohibidos (400 con `forbidNonWhitelisted`): `orderDetails`, `products`, `email`, `totalPrice`, `nameClient`, etc.

## POST /:id/notes

```json
{ "note": "Cliente confirmó diseño por teléfono" }
```

## Auth errors

| Código | Condición |
|--------|-----------|
| 400 | Token inválido/ausente (`AuthGuard` actual) |
| 403 | Sin rol admin (`RolesGuard`) |

Alineado con convención existente del proyecto (no cambiar en esta feature).

## Timeline event types

`created` | `state_changed` | `transaction_changed` | `admin_note_added`

## Compatibilidad front 005

- `normalizeOrdersListResponse` detecta `{ data, meta }` → deja fallback cliente.
- `FindOrderAdmin` espera `timeline` y `notes` en raíz.
- Labels español: solo front; backend envía enums en `payload`.
