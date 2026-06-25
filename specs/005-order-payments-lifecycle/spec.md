# Feature Specification: Seña, edición integral y cancelación de pedidos (Backend)

**Feature Branch**: `005-order-payments-lifecycle`

**Created**: 2026-06-13

**Status**: Ready (specify ✅ clarify ✅ plan ✅)

**Input**: Registrar monto de seña con estado automático, saldo restante, edición
completa del pedido (productos + cliente), auditoría en notas/timeline, cancelación
con restricciones y bloqueo de acceso público. Solo backend; front en fase posterior.

**Depends on**: `004-orders-api-v2` (listado admin, PUT parcial, timeline, notas,
detalle admin).

## Clarifications

### Session 2026-06-13

- Q: ¿Booleano “está señado” o solo monto? → A: Solo `depositAmount` (number ≥ 0).
  Sin campo booleano.
- Q: ¿Qué incluye “editar pedido”? → A: Todo: productos/cantidades + datos de
  cliente, entrega, tema, fechas. Recalcula `totalPrice` en servidor.
- Q: ¿Pedido cancelado en vista pública (post-shop)? → A: No accesible.
  `GET /orders/:id` responde 404 si `state === cancelled`.
- Q: ¿Cancelar si está pagado? → A: No. `paid` → 409. `inProcess` y `partialPayment`
  → sí se puede cancelar.
- Q: ¿Conflicto `state` manual vs `depositAmount`? → A: Gana el monto. El servidor
  deriva `state` desde `depositAmount` y `totalPrice`; ignora `state` de pago en
  body cuando viene `depositAmount` (salvo acción explícita `cancelled`).
- Q: ¿Si al editar productos `depositAmount > nuevo totalPrice`? → A: 400 Bad Request;
  admin debe ajustar seña antes de reducir el total.
- Q: ¿Re-cancelar pedido ya cancelado? → A: Idempotente 200 sin duplicar timeline ni
  nota automática.
- Q: ¿Cancelación vía qué campo? → A: `state: "cancelled"` en PUT; motivo opcional
  `cancelReason` string en body.

### Session 2026-06-13 (clarify ronda 2)

- Q: ¿`state` de pago manual sin `depositAmount`? → A: Ignorar `inProcess`/`partialPayment`/`paid` en body; solo `cancelled` válido sin monto; estado de pago siempre derivado de `depositAmount` + `totalPrice`.
- Q: ¿Re-derivar estado si cambia `totalPrice` sin `depositAmount` en body? → A: Sí, tras recalcular total usar `depositAmount` persistido.
- Q: ¿Timeline en PUT con varios cambios? → A: Hasta 3 eventos (`payment_updated`, `order_edited`, `order_cancelled`); una nota automática combinada por request.
- Q: ¿Precisión `depositAmount`? → A: Entero ≥ 0 (pesos ARS, como `totalPrice`).
- Q: ¿Filtro listado vs cancelados? → A: Default excluye `cancelled`; `?state=cancelled` solo cancelados; otros `state` no incluyen cancelados.
- Q: ¿Legacy `partialPayment` sin monto? → A: Sin backfill; admin carga monto en primera edición; luego gana derivación.
- Q: ¿`cancelReason`? → A: Opcional, trim, max 500 caracteres.
- Q: ¿Reemplazo `orderDetails`? → A: Delete + recreate en transacción (patrón create).
- Q: ¿`cancelled` + `depositAmount` en mismo PUT? → A: 400; cancelación en request separada.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar seña y saldo (Priority: P1)

Como administrador, registro cuánto pagó el cliente a cuenta (seña) y el sistema
muestra cuánto resta abonar, sin calcularlo manualmente.

**Why this priority**: Hoy el estado “Señado” se cambia a mano sin registrar montos;
no hay trazabilidad financiera operativa.

**Independent Test**: Pedido `totalPrice: 15000`, `PUT { depositAmount: 5000 }` →
`depositAmount: 5000`, `remainingBalance: 10000`, `state: partialPayment`, evento
`payment_updated` en timeline.

**Acceptance Scenarios**:

1. **Given** pedido `inProcess` con `totalPrice: 10000`, **When** admin registra
   `depositAmount: 3000`, **Then** `state = partialPayment`, `remainingBalance = 7000`,
   timeline registra `payment_updated`.
2. **Given** `totalPrice: 8000`, **When** `depositAmount: 8000`, **Then** `state = paid`,
   `remainingBalance = 0`.
3. **Given** `depositAmount: 0`, **When** PUT (sin cancelar), **Then** `state = inProcess`.
4. **Given** `depositAmount < 0` o no numérico, **When** PUT, **Then** 400.
5. **Given** `depositAmount > totalPrice`, **When** PUT, **Then** 400.
6. **Given** body con `state: paid` y `depositAmount: 3000` en total 10000, **When**
   PUT, **Then** persiste seña 3000 y `state = partialPayment` (gana monto).

---

### User Story 2 - Estado derivado del monto (Priority: P1)

Como administrador, no necesito elegir manualmente “Señado” o “Pagado” si cargué la
seña; el sistema infiere el estado de pago.

**Why this priority**: Evita inconsistencias entre monto registrado y badge de estado
en panel admin.

**Independent Test**: Nunca queda `depositAmount > 0` con `state: inProcess` en
respuestas API tras mutación exitosa.

**Acceptance Scenarios**:

1. **Given** `0 < depositAmount < totalPrice`, **Then** `state = partialPayment`.
2. **Given** `depositAmount >= totalPrice`, **Then** `state = paid`.
3. **Given** edición de productos que baja `totalPrice` con `depositAmount >= nuevo
   total`, **Then** `state = paid` automático.
4. **Given** edición que sube `totalPrice` con seña parcial existente, **Then**
   `state = partialPayment` si `0 < depositAmount < totalPrice`.
5. **Given** edición de productos donde `depositAmount > nuevo totalPrice`, **When**
   PUT, **Then** 400 sin modificar pedido.

---

### User Story 3 - Edición integral del pedido (Priority: P1)

Como administrador, corrijo productos, cantidades y todos los datos del cliente y
entrega; queda registro automático de qué cambió.

**Why this priority**: Errores de checkout o cambios de diseño requieren modificar el
pedido completo, no solo estado o dirección.

**Independent Test**: `PUT` con `products` nuevos + `nameClient` → `orderDetails`
actualizados, `totalPrice` recalculado, nota automática + `order_edited` en timeline.

**Acceptance Scenarios**:

1. **Given** pedido activo (no cancelado), **When** envío `products: [{ productId,
   cuantity }, ...]` válidos, **Then** reemplaza líneas, recalcula `totalPrice`,
   re-evalúa `state` según `depositAmount`.
2. **Given** cambios en `nameClient`, `personalizationName`, `email`, `numCel`,
   `num2Cel`, `theme`, `address`, `endOrder`, `transactionType`, **Then** persisten
   si válidos según DTO.
3. **Given** al menos un campo cambió, **Then** crea `OrderAdminNote` automática
   (resumen en español) + timeline `order_edited` con `payload.changes`.
4. **Given** `products` vacío o producto inexistente, **When** PUT, **Then** 400 sin
   cambios.
5. **Given** pedido `cancelled`, **When** PUT, **Then** 409 (no editable).
6. **Given** mismo payload sin diffs, **When** PUT, **Then** 200 sin nota ni evento
   duplicado.
7. **Given** body con `totalPrice`, `orderDetails`, `id`, `createAt`, **When** PUT,
   **Then** 400 (`forbidNonWhitelisted`).

---

### User Story 4 - Cancelar pedido (Priority: P1)

Como administrador, cancelo pedidos no pagados para que dejen de aparecer en el
listado operativo; el cliente no puede ver el detalle en post-shop.

**Why this priority**: Pedidos caídos o duplicados deben ocultarse sin borrado físico.

**Independent Test**: `PUT { state: "cancelled" }` en `partialPayment` → ok; en `paid`
→ 409; `GET /orders/:id` público → 404.

**Acceptance Scenarios**:

1. **Given** `inProcess` o `partialPayment`, **When** `PUT { state: "cancelled" }`,
   **Then** `state = cancelled`, timeline `order_cancelled`, nota automática; `cancelReason`
   opcional en payload de nota.
2. **Given** `paid`, **When** cancelo, **Then** 409 con mensaje claro.
3. **Given** ya `cancelled`, **When** cancelo de nuevo, **Then** 200 idempotente sin
   duplicar eventos.
4. **Given** `GET /orders` sin filtros, **Then** excluye cancelados; `meta.total` sin
   ellos.
5. **Given** `GET /orders?state=cancelled`, **Then** solo cancelados (admin).
6. **Given** pedido cancelado, **When** `GET /orders/:id` sin auth, **Then** 404.
7. **Given** pedido cancelado, **When** `GET /orders/:id/admin` con admin, **Then**
   visible con timeline y notas.

---

### User Story 5 - Compatibilidad API 004 (Priority: P2)

Como consumidor existente (front 005 u otros), las respuestas incluyen campos nuevos
sin romper checkout ni listado admin.

**Independent Test**: `POST /orders` checkout → `depositAmount: 0`, `state: inProcess`;
`GET /orders` sigue `{ data, meta }`.

**Acceptance Scenarios**:

1. **Given** cualquier GET Order relevante, **Then** incluye `depositAmount` y
   `remainingBalance` calculado.
2. **Given** PUT solo `transactionType` / `address` (como hoy), **Then** funciona +
   auditoría si hubo cambio real.
3. **Given** `POST /orders` público, **Then** contrato sin cambios salvo defaults de
   pago en entidad persistida.

---

### Edge Cases

- ¿Pedido `paid` editable en productos? → Sí; revalidar `depositAmount <= totalPrice`;
  estado de pago se re-deriva por monto (sigue `paid` si seña cubre total).
- ¿Cancelar con seña cargada? → Permitido; `depositAmount` queda histórico; sin
  reembolso en v1.
- ¿`depositAmount` en pedido cancelado? → 409 en cualquier PUT que no sea re-cancel
  idempotente.
- ¿Pedidos legacy `partialPayment` sin `depositAmount`? → `depositAmount = 0` en BD;
  admin carga monto en primera edición; tras eso gana derivación por monto.
- ¿PUT con `state: partialPayment|paid|inProcess` sin `depositAmount`? → Ignorar;
  estado de pago solo se deriva de monto persistido + total (clarify C1).
- ¿PUT solo cambia `products`? → Re-derivar `state` con `depositAmount` persistido (C2).
- ¿PUT con `state: cancelled` y `depositAmount` juntos? → 400; operaciones separadas (C12).
- ¿Un PUT con seña + datos + productos? → Eventos timeline separados por tipo; una nota
  automática resumen (C3).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `Order` MUST persistir `depositAmount` (number, default 0).
- **FR-002**: `StateEnum` MUST incluir valor `cancelled` además de los existentes.
- **FR-003**: Respuestas API con `Order` MUST incluir `remainingBalance` calculado:
  `max(0, totalPrice - depositAmount)`; MUST NOT persistirse en BD.
- **FR-004**: Tras cualquier mutación que altere `depositAmount` o `totalPrice`, Service
  MUST derivar `state` de pago: `0 → inProcess`, `(0, total) → partialPayment`,
  `>= total → paid`; MUST ignorar `state` de pago (`inProcess`/`partialPayment`/`paid`)
  en body; solo `state: cancelled` permitido sin monto.
- **FR-005**: MUST validar `0 <= depositAmount <= totalPrice` en toda mutación que
  toque seña o recalcule total.
- **FR-006**: `PUT /orders/:id` (admin) MUST aceptar whitelist ampliada: `depositAmount`,
  `state` (solo `cancelled` como acción de cancelación), `cancelReason`, `transactionType`,
  `address`, `nameClient`, `personalizationName`, `email`, `numCel`, `num2Cel`, `theme`,
  `endOrder`, `products` (misma forma que `POST /orders`).
- **FR-007**: Si `products` presente, Service MUST reemplazar `orderDetails` en
  transacción, recalcular `totalPrice`, re-evaluar estado de pago desde `depositAmount`.
- **FR-008**: Si tras recalcular total `depositAmount > totalPrice`, MUST 400 sin
  persistir cambios.
- **FR-009**: Cancelación MUST permitirse solo desde `inProcess` o `partialPayment`;
  desde `paid` MUST 409.
- **FR-010**: `GET /orders` MUST excluir `cancelled` por defecto; `?state=cancelled`
  MUST listar solo cancelados.
- **FR-011**: `GET /orders/:id` público MUST 404 si `state === cancelled`.
- **FR-012**: Pedidos `cancelled` MUST NOT ser editables (409 en PUT salvo cancel
  idempotente).
- **FR-013**: Mutaciones con cambios reales MUST crear `OrderAdminNote` automática
  (sistema) + evento timeline correspondiente.
- **FR-014**: Nuevos tipos timeline: `payment_updated`, `order_edited`,
  `order_cancelled` (además de los de 004).
- **FR-015**: `PUT` MUST usar `ValidationPipe` con `forbidNonWhitelisted: true`;
  campos prohibidos documentados en contract.
- **FR-016**: `POST /orders` MUST permanecer público; defaults `depositAmount: 0`,
  `state: inProcess`.
- **FR-017**: `GET /orders/:id/admin` MUST seguir mostrando pedidos cancelados.
- **FR-018**: Cancelación idempotente MUST retornar 200 sin duplicar eventos.
- **FR-019**: Feature MUST incluir tests unitarios en `orders.service.spec.ts`:
  seña, derivación de estado, edición productos, cancelación, 404 público, 400 por
  seña > total tras editar productos.
- **FR-020**: MUST NOT agregar variables de entorno nuevas.
- **FR-021**: Modificación de `@Entity Order` y `StateEnum` MUST documentarse en
  `plan.md` con advertencia `synchronize: true`.
- **FR-022**: MUST NOT modificar `DELETE /orders/:id` (legacy).
- **FR-023**: Email checkout (002/003) MUST NOT regresionar.
- **FR-024**: PUT con `state: cancelled` y `depositAmount` en mismo body MUST 400.
- **FR-025**: `depositAmount` MUST ser entero ≥ 0; `cancelReason` opcional max 500 chars.
- **FR-026**: PUT compuesto MUST emitir eventos timeline separados por tipo de cambio;
  una nota automática combinada por request.
- **FR-027**: `POST /orders` MUST NOT aceptar `depositAmount` (siempre 0 en checkout).

### API Contract Summary (delta sobre 004)

```
PUT  /orders/:id  [admin]
     Body whitelist:
       depositAmount, state (cancelled), cancelReason,
       transactionType, address,
       nameClient, personalizationName, email, numCel, num2Cel, theme, endOrder,
       products: [{ productId, cuantity }]
     → Order + depositAmount + remainingBalance

GET  /orders              → excluye cancelled por defecto; ?state=cancelled
GET  /orders/:id          → 404 si cancelled; + depositAmount, remainingBalance
GET  /orders/:id/admin    → incluye cancelados
POST /orders              → sin cambio de contrato
```

### Key Entities

- **Order** (modificar): + `depositAmount`; `state` incluye `cancelled`.
- **Orderdetail** (existente): reemplazo transaccional en edición de `products`.
- **Product** (existente): referenciado al recalcular líneas.
- **OrderTimelineEvent** (existente 004): + tipos `payment_updated`, `order_edited`,
  `order_cancelled`.
- **OrderAdminNote** (existente 004): notas automáticas del sistema además de las
  manuales del admin.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `PUT { depositAmount: 5000 }` en total 15000 → `partialPayment`,
  `remainingBalance: 10000`.
- **SC-002**: `PUT { depositAmount: 8000 }` en total 8000 → `paid`, `remainingBalance: 0`.
- **SC-003**: `PUT` con `products` válidos → `orderDetails` y `totalPrice` coherentes.
- **SC-004**: `PUT { state: cancelled }` en `paid` → 409 en 100% de intentos.
- **SC-005**: `GET /orders/:id` en cancelado → 404 público; admin detail → 200.
- **SC-006**: `GET /orders` default → 0 ítems `cancelled` en `data`.
- **SC-007**: Edición con cambios → al menos 1 nota automática + evento `order_edited`
  o `payment_updated` consultable vía admin.
- **SC-008**: `npm test` y `npm run build` verdes.
- **SC-009**: `POST /orders` checkout sin regresión.

## Assumptions

- Solo backend en esta feature; UI admin y post-shop en feature front posterior.
- Un rol `admin`; sin permisos granulares.
- `remainingBalance` siempre calculado server-side.
- `products` en PUT usa misma validación que `CreateOrderDto.products`.
- Notas automáticas atribuidas al admin autenticado que ejecutó la acción.
- Pedidos históricos sin backfill de `depositAmount` distinto de 0.
- JSONB para payloads de nuevos eventos timeline (misma convención 004).
- Auth 401/403 alineado con convención existente.

## Out of Scope

- Frontend (formularios seña, edición productos, cancelar, post-shop UX).
- Email al señar, cancelar o editar.
- Pasarela de pago / Mercado Pago.
- Múltiples pagos parciales históricos (solo un `depositAmount` acumulado).
- Reembolsos y borrado físico de pedidos.
- Restaurar pedido cancelado (undelete).
- Cambios en `SaphireSouvernis-Front` en esta feature.

## Non-Goals

- Máquina de estados estricta más allá de derivación por monto + reglas de cancelación.
- Edición de pedido desde rutas públicas.
- Borrado de assets Cloudinary u otros módulos.

## Dependencies

- Feature `004-orders-api-v2` implementada (listado, timeline, notas, PUT parcial base).
- Módulos: `OrdersService`, `OrderdetailsService`, `AuthGuard`, `RolesGuard`.
- Constitución proyecto: lógica en Services, `envs.ts`, tests, Swagger en endpoints
  modificados.

## Migration Notes

| Antes (004) | Después (005) |
|-------------|---------------|
| Sin `depositAmount` | Campo persistido + `remainingBalance` en API |
| `state` manual vía PUT | Estado de pago derivado por monto (gana monto) |
| PUT solo state/entrega | PUT integral + productos |
| Sin `cancelled` | Enum + filtro listado + 404 post-shop |
| Editar productos prohibido | Permitido vía `products` |
| Timeline 4 tipos | + `payment_updated`, `order_edited`, `order_cancelled` |

Deploy backend primero; front consume campos nuevos en feature separada.
