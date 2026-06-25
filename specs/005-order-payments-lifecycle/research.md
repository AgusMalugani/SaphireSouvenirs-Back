# Research & Clarifications: 005-order-payments-lifecycle

Decisiones cerradas en `/speckit-clarify` (sesión 2026-06-13, ronda 2).
Sin `[NEEDS CLARIFICATION]` pendientes para `/speckit-plan`.

---

## C1 — `state` manual en PUT sin `depositAmount`

**Pregunta**: ¿Se acepta `state: inProcess | partialPayment | paid` en body sin monto?

**Decisión**: **No**. En PUT solo `state: cancelled` es válido como acción de estado sin `depositAmount`. Cualquier otro valor de `state` de pago en body → **ignorado** (no 400, para no romper clientes que aún envíen `state` por inercia del front 005). El estado de pago efectivo **siempre** se deriva de `depositAmount` persistido + `totalPrice` tras la mutación.

**Rationale**: Alineado con “gana el monto”; evita doble fuente de verdad.

---

## C2 — Re-derivar estado tras cambio de `totalPrice` sin `depositAmount` en body

**Pregunta**: Si PUT solo cambia `products` y no envía `depositAmount`, ¿recalcular `state`?

**Decisión**: **Sí**. Tras recalcular `totalPrice`, ejecutar `derivePaymentState(depositAmount, totalPrice)` con el monto ya persistido. Ej.: seña $8000, total baja a $7000 → `paid` automático (si no viola regla 400).

---

## C3 — Eventos timeline en PUT compuesto

**Pregunta**: Un PUT con seña + productos + nombre → ¿un evento o varios?

**Decisión**: **Hasta 3 eventos** según tipos de cambio:
- `payment_updated` si cambió `depositAmount`
- `order_edited` si cambió cualquier otro campo o `products`
- `order_cancelled` si pasó a `cancelled`

**Una sola** `OrderAdminNote` automática por request con resumen combinado en español.

---

## C4 — Precisión de `depositAmount`

**Decisión**: `number`, entero ≥ 0, misma convención que `totalPrice` y `price` de productos (pesos ARS sin decimales en v1). `@Min(0)`, validación en DTO.

---

## C5 — Filtro `GET /orders` y cancelados

**Decisión**:
- Sin `state` en query → `WHERE state != 'cancelled'`
- `?state=cancelled` → solo cancelados
- `?state=inProcess|partialPayment|paid` → ese estado **y** excluye cancelados implícitamente (cancelled no matchea)
- No se requiere `includeCancelled` adicional en v1

---

## C6 — Legacy `partialPayment` con `depositAmount = 0`

**Decisión**: Sin backfill automático. En lectura API se expone tal cual; admin debe cargar `depositAmount` en primera edición. Si tras cargar monto el estado derivado difiere del legacy, **gana derivación**.

---

## C7 — `cancelReason`

**Decisión**: Opcional, string, `trim`, `@MaxLength(500)`. Vacío → omitir en nota automática (solo “Pedido cancelado.”).

---

## C8 — Reemplazo de `orderDetails`

**Decisión**: Transacción TypeORM: eliminar líneas existentes del pedido (`orderDetails` CASCADE o delete explícito), recrear vía `OrderdetailsService.create` (mismo patrón que `create`), recalcular `totalPrice`.

---

## C9 — DTO PUT: reemplazo de `UpdateOrderPartialDto`

**Decisión**: Nuevo `UpdateOrderDto` (o `UpdateOrderAdminDto`) con whitelist completa; deprecar ampliación mínima de 004. Mantiene `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` en handler.

**`state` en DTO**: `@IsEnum` restringido a `cancelled` únicamente para el campo de cancelación — los valores de pago no son input válido (validador custom o enum subset).

---

## C10 — Respuesta serializada `remainingBalance`

**Decisión**: Mapper en Service o interceptor de serialización al devolver `Order`: adjuntar `remainingBalance` en todos los métodos que retornan orden (`findOneById`, `findAdminById`, `findAllPaginated` items, `updatePartial` return). No columna TypeORM.

---

## C11 — `depositAmount` en `POST /orders`

**Decisión**: No aceptar en checkout público; siempre 0. Campo no está en `CreateOrderDto`.

---

## C12 — Conflictos PUT `state: cancelled` + `depositAmount`

**Decisión**: Si `state: cancelled` presente, **prioridad cancelación**; no actualizar `depositAmount` en la misma request (400 si vienen ambos — evita ambigüedad). Admin cancela en un paso; edita seña en otro.

---

## Riesgos / gates

| Riesgo | Mitigación |
|--------|------------|
| `@Entity Order` + enum | OK explícito Agustin; `synchronize: true` |
| Front envía `state` manual | Ignorar valores de pago en body |
| Seña > total tras editar productos | 400 transaccional rollback |
| Pedidos legacy inconsistentes | Admin corrige monto manualmente |

---

## APTO para plan

Coverage FR: 23/23 con decisiones C1–C12 integradas en spec.
0 issues CRITICAL abiertos.
