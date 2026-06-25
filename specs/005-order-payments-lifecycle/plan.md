# Implementation Plan: Seña, edición integral y cancelación de pedidos (Backend)

**Branch**: `005-order-payments-lifecycle` | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-order-payments-lifecycle/spec.md`

## Summary

Extender el módulo `orders` (post-004) con: campo `depositAmount`, estado de pago
derivado automáticamente, `remainingBalance` en API, PUT admin integral (productos +
cliente + seña), cancelación `cancelled` con exclusión en listado y 404 en post-shop,
auditoría ampliada (notas automáticas + timeline `payment_updated`, `order_edited`,
`order_cancelled`). Sin nuevas entidades; modifica `Order` y `StateEnum`.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS

**Primary Dependencies**: NestJS 10, TypeORM 0.3, class-validator, Jest 29, dayjs

**Storage**: PostgreSQL — **modifica** `@Entity Order` (+ columna `depositAmount`);
`StateEnum` + valor `cancelled`

**Testing**: `orders.service.spec.ts` extendido (seña, derive state, products edit, cancel, 404)

**Target Platform**: Render (backend); front en feature posterior

**Project Type**: Monolito NestJS REST API

**Performance Goals**: PUT transaccional con replace orderDetails <1s típico; listado sin regresión

**Constraints**: Sin nuevas env vars; `POST /orders` sin `depositAmount` en body; montos enteros ARS

**Scale/Scope**: ~12 archivos modify, 1–2 DTOs nuevos/reemplazo, 3 helpers Service, 3 enum timeline

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Reference: `.specify/memory/constitution.md` (v1.0.0)

- [x] Lógica de negocio en `OrdersService` (derive state, replace products, cancel, audit)
- [x] Variables de entorno — sin cambios (`envs.ts` intacto)
- [x] Endpoints — PUT ampliado admin; GET público 404 cancelados justificado en spec
- [x] Swagger — actualizar `UpdateOrderAdminDto`, ejemplos `depositAmount`/`remainingBalance`
- [x] Persistencia — **⚠️ modifica `@Entity Order` + `StateEnum`**; OK Agustin Malugani requerido
- [x] Tests — extender `orders.service.spec.ts` (FR-019)
- [x] Envelope listado `{ data, meta }` sin cambio (004)
- [x] Workflow SDD: specify ✅ → clarify ✅ → plan (este doc) → tasks → analyze → implement

**Post-design re-check**: Supersede parcial 004 en PUT (whitelist ampliada) y derivación de
`state`; documentado en Migration Notes. Sin violaciones de constitución.

## ⚠️ Entity Change Warning

Esta feature **modifica**:

- `Order` — nueva columna `depositAmount` (number, default 0)
- `StateEnum` — nuevo valor `cancelled`

Con `synchronize: true` en desarrollo, TypeORM aplicará cambios al arrancar.
**Requiere confirmación explícita de Agustin Malugani antes de `/speckit-implement`.**

No se crean tablas nuevas; `OrderTimelineEvent` / `OrderAdminNote` de 004 se reutilizan.

## Project Structure

### Documentation (this feature)

```text
specs/005-order-payments-lifecycle/
├── spec.md
├── plan.md              # este archivo
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/orders-api-payments.md
├── tasks.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/enums/states.enum.ts                           # MODIFY: + Cancelled = "cancelled"

src/modules/orders/
├── entities/order.entity.ts                       # MODIFY: + depositAmount
├── enums/order-timeline-event-type.enum.ts        # MODIFY: + 3 tipos
├── dto/
│   ├── update-order-partial.dto.ts                # DEPRECATE → reemplazar
│   └── update-order-admin.dto.ts                  # CREATE (whitelist integral)
├── helpers/
│   ├── derive-payment-state.helper.ts             # CREATE (pure)
│   └── serialize-order-response.helper.ts         # CREATE (remainingBalance)
├── orders.controller.ts                           # MODIFY: UpdateOrderAdminDto
├── orders.service.ts                              # MODIFY: updateOrder, list filter, 404
├── orders.service.spec.ts                         # MODIFY: tests ampliados
└── orders.module.ts                               # EXISTING (sin cambio registro)

src/modules/orderdetails/orderdetails.service.ts   # REUSE create() en transacción
```

**Structure Decision**: Helpers puros testeables para `derivePaymentState`; lógica de
transacción y auditoría en `OrdersService`. Sin capa UseCase.

## Phase 0: Research

Ver [research.md](./research.md) — decisiones C1–C12, sin NEEDS CLARIFICATION.

## Phase 1: Design

| Artefacto | Propósito |
|-----------|-----------|
| [data-model.md](./data-model.md) | Order + enum + payloads timeline + API shapes |
| [contracts/orders-api-payments.md](./contracts/orders-api-payments.md) | Delta HTTP sobre 004 |
| [quickstart.md](./quickstart.md) | Validación manual curl |

## Implementation Approach

### 1. `StateEnum` y `Order`

```typescript
// states.enum.ts
export enum StateEnum {
  PartialPayment = 'partialPayment',
  Paid = 'paid',
  InProcess = 'inProcess',
  Cancelled = 'cancelled',
}

// order.entity.ts
@Column({ type: 'int', default: 0 })
depositAmount: number;
```

`create()` — inicializar `depositAmount: 0` explícito en schema si hace falta.

### 2. Helpers

**`derivePaymentState(depositAmount, totalPrice): StateEnum`**

| Condición | Resultado |
|-----------|-----------|
| `depositAmount <= 0` | `inProcess` |
| `0 < depositAmount < totalPrice` | `partialPayment` |
| `depositAmount >= totalPrice` | `paid` |

No invocar si `order.state === cancelled` (estado terminal).

**`serializeOrderWithBalance(order): Order & { remainingBalance: number }`**

`remainingBalance = Math.max(0, order.totalPrice - order.depositAmount)`

Aplicar en: `findOneById`, `findAdminById`, items de `findAllPaginated`, retorno de
`updateOrder`, `create` (opcional consistencia).

### 3. DTO `UpdateOrderAdminDto`

Reemplaza `UpdateOrderPartialDto` en controller PUT.

| Campo | Validación |
|-------|------------|
| `depositAmount` | `@IsOptional() @IsInt() @Min(0)` |
| `state` | `@IsOptional() @IsIn(['cancelled'])` — solo cancelación |
| `cancelReason` | `@IsOptional() @IsString() @MaxLength(500)` + trim |
| `products` | `@IsOptional() @IsArray() @ArrayMinSize(1)` + `CreateOrderdetailDto[]` |
| Cliente/entrega | mismas reglas que `CreateOrderDto` campos, todos `@IsOptional()` |

**Validación cruzada en Service** (custom):

- `state === 'cancelled'` && `depositAmount` definido → `BadRequestException`
- `depositAmount > totalPrice` (actual o post-recalc) → 400

`@ValidateIf` o pipe custom opcional; preferir checks en Service tras cargar orden.

### 4. `OrdersService.updateOrder` (refactor de `updatePartial`)

Flujo en transacción:

```
1. findOneById + relations orderDetails
2. Si cancelled → 409 (salvo idempotente cancel)
3. Si body.state === 'cancelled' → handleCancel(); return
4. Snapshot before para diff
5. Si products → delete orderDetails; recreate; recalc totalPrice
6. Aplicar campos cliente/entrega/depositAmount del DTO
7. Validar depositAmount <= totalPrice
8. derivePaymentState (si no cancelled)
9. Si sin cambios → return serialize (sin nota/eventos)
10. save order
11. Emitir timeline: payment_updated | order_edited | (order_cancelled ya en 3)
12. createSystemAdminNote(resumen ES combinado)
```

**`handleCancel(order, cancelReason?, adminUser)`**

- Si ya `cancelled` → return order (idempotente)
- Si `paid` → `ConflictException` 409
- Set `state = cancelled`
- Evento `order_cancelled` + nota

**Replace products** (C8):

```typescript
await transactionManager.getRepository(Orderdetail).delete({ order: { id } });
// Promise.all products.map → orderDetailsService.create(..., transactionManager))
```

### 5. Listado `findAllPaginated`

```typescript
if (!query.state) {
  queryBuilder.andWhere('order.state != :cancelled', { cancelled: StateEnum.Cancelled });
} else {
  queryBuilder.andWhere('order.state = :state', { state: query.state });
}
```

Validar `StateEnum` incluye `cancelled` en `ListOrdersQueryDto` `@IsEnum`.

### 6. `findOneById` público

```typescript
if (order.state === StateEnum.Cancelled) {
  throw new NotFoundException('No hay orden con esa id');
}
return serializeOrderWithBalance(order);
```

### 7. Timeline enum extendido

```typescript
PaymentUpdated = 'payment_updated',
OrderEdited = 'order_edited',
OrderCancelled = 'order_cancelled',
```

Payloads — ver [data-model.md](./data-model.md).

**Deprecar** emisión de `state_changed` en PUT cuando el cambio de estado viene solo
de `derivePaymentState` por seña; usar `payment_updated`. Mantener `state_changed` solo
si en futuro hay cambio de estado sin monto — en 005 **no** emitir `state_changed` por
derivación automática (evitar duplicado con `payment_updated`).

**`transaction_changed`**: seguir emitiendo si cambian `transactionType`/`address` sin
ser parte de `order_edited` — o consolidar en `order_edited` con `changes`. **Decisión**:
si cambió entrega → `transaction_changed` (compat 004) **y** incluir en nota combinada;
si solo entrega sin otros campos → solo `transaction_changed`. Si entrega + otros campos
→ `order_edited` + `transaction_changed` si aplica ambos.

Simplificación v1: cualquier cambio no-pago y no-cancel → un solo `order_edited` con
`changes` completo; cambio solo `depositAmount` → `payment_updated`; cambio solo
`transactionType`/`address` → mantener `transaction_changed` de 004 **o** absorber en
`order_edited`. **Plan**: absorber campos cliente/entrega/productos en `order_edited`;
`transaction_changed` solo si **únicamente** cambió entrega (misma regla 004); si además
cambió otro campo → solo `order_edited` (evitar triple evento).

### 8. Nota automática del sistema

`createSystemAdminNote(order, adminUser, summaryLines: string[])`

Texto ejemplo:

```
Pedido modificado: seña $0 → $5000; productos actualizados (2 ítems); nombre cliente actualizado.
```

Atribuida al `adminUser` autenticado (misma entidad `OrderAdminNote`).

### 9. Controller

Renombrar handler internamente a `updateOrder`; DTO `UpdateOrderAdminDto`; pipe
`forbidNonWhitelisted` existente.

### 10. Tests `orders.service.spec.ts`

| Caso | Assert |
|------|--------|
| `depositAmount` parcial | `partialPayment`, `remainingBalance`, `payment_updated` |
| `depositAmount` = total | `paid`, balance 0 |
| Ignorar `state: paid` con seña parcial | `partialPayment` |
| `products` replace | nuevo total, re-derive state |
| `products` baja total, seña > nuevo total | 400, rollback |
| `state: cancelled` en `paid` | 409 |
| `state: cancelled` idempotente | sin duplicar eventos |
| `findOneById` cancelled | NotFoundException |
| `findAllPaginated` default | query excluye cancelled |
| cancel + deposit mismo body | 400 |
| PUT sin cambios | sin nota/evento |

### 11. Sin cambios

- `POST /orders` contrato (sin `depositAmount` en DTO)
- `DELETE /orders/:id`
- Email Brevo / fire-and-forget
- Rutas orden `:id/admin` antes de `:id`
- `envs.ts`

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Supersede PUT 004 whitelist | Edición integral requerida por negocio | Mantener 2 endpoints PUT — duplicación |
| Modificar `StateEnum` | Cancelación formal en listados | Flag `isCancelled` — rompe filtros front `state` |
| PUT transaccional productos | Consistencia total/seña/ líneas | PATCH líneas individuales — fuera scope |

## Risks & Mitigations

| Riesgo | Mitigación |
|--------|------------|
| synchronize altera Order | OK explícito; default `depositAmount=0` |
| Front envía `state: paid` en PUT | Ignorar; documentar en handoff front |
| Seña > total post-edit | 400 transaccional |
| Legacy partialPayment sin monto | Admin corrige manualmente |
| Eventos timeline duplicados | Reglas emisión por tipo (C3) |

## Next Step

Ejecutar `/speckit-tasks` → `/speckit-analyze` → confirmar OK `@Entity` → `/speckit-implement`.
