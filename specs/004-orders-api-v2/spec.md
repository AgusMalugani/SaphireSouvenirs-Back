# Feature Specification: Operaciones de pedidos — backend v2 (Orders API)

**Feature Branch**: `004-orders-api-v2`

**Created**: 2026-06-23

**Status**: Ready

**Input**: User description: "Feature: 004-orders-api-v2 — Operaciones de pedidos backend v2 (Orders API). Listado admin paginado, PUT parcial seguro, auth admin, timeline server-side, notas internas, detalle admin, email CTA /post-shop/:id. Alineado con front 005-orders-operations-overhaul."

## Clarifications

### Session 2026-06-23

- Q: ¿Payload de timeline: JSONB vs columnas tipadas por tipo? → A: JSONB en columna `payload` de `OrderTimelineEvent`; tipos de evento validados en Service; sin tablas por tipo en v1.
- Q: ¿Whitelist de `sort` en GET /orders? → A: Solo `createAt` en v1 (único valor que envía el front 005 por defecto); `sort` inválido → 400.
- Q: ¿Transiciones de `state` restringidas o libres? → A: Libres entre valores enum en v1 (`inProcess` ↔ `partialPayment` ↔ `paid`); sin máquina de estados hasta feature futura.
- Q: ¿Query con `state` o `transactionType` enum inválido? → A: 400 Bad Request con mensaje claro; no ignorar el param.
- Q: ¿`createdBy` en evento `created` desde checkout público? → A: `createdBy` omitido o `null` (no hay usuario autenticado en `POST /orders`).
- Q: ¿`page`/`limit` inválidos (0, negativos)? → A: Coerción a defaults (`page=1`, `limit=20`); `limit` máximo 100.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Listado admin con filtros en servidor (Priority: P1)

Como administrador autenticado, necesito listar pedidos con filtros, búsqueda y
paginación en el servidor, viendo productos en cada tarjeta, para operar el negocio
sin cargar ni filtrar todo el catálogo de pedidos en el navegador.

**Why this priority**: El front 005 ya envía query params; hoy el backend devuelve un
array plano sin `product` en `orderDetails`, forzando modo híbrido en cliente.

**Independent Test**: `GET /orders?state=inProcess&page=1&limit=20` con token admin
→ respuesta `{ data, meta }` con pedidos filtrados y `orderDetails[].product.name`
poblado.

**Acceptance Scenarios**:

1. **Given** admin autenticado, **When** consulta `GET /orders` con `state=inProcess`,
   **Then** recibe solo pedidos en ese estado dentro de `data` y `meta` con totales.
2. **Given** admin autenticado, **When** envía `q=maria`, **Then** resultados incluyen
   pedidos cuyo `nameClient`, `email`, `numCel`, `num2Cel`, `id` o `theme` coinciden
   (case-insensitive).
3. **Given** request sin token o sin rol admin, **When** consulta `GET /orders`,
   **Then** responde 401 o 403 según convención del proyecto.
4. **Given** listado paginado, **When** `page=2&limit=20`, **Then** `meta` refleja
   `page`, `limit`, `total` y `totalPages` correctos.

---

### User Story 2 - Actualización parcial segura (Priority: P1)

Como administrador, necesito cambiar solo el estado de pago o los datos de entrega
de un pedido, sin riesgo de sobrescribir productos, totales o email del cliente.

**Why this priority**: `UpdateOrderDto` actual acepta `CreateOrderDto` completo;
el front 005 ya envía payloads mínimos (`{ state }` o `{ transactionType, address }`).

**Independent Test**: `PUT /orders/:id` con `{ state: "paid" }` persiste cambio;
`PUT` con `{ orderDetails: [...] }` responde 400.

**Acceptance Scenarios**:

1. **Given** pedido existente y admin autenticado, **When** `PUT` con
   `{ "state": "paid" }`, **Then** solo `state` cambia y se registra evento
   `state_changed` en timeline.
2. **Given** pedido existente, **When** `PUT` con
   `{ "transactionType": "send", "address": "Calle 123" }`, **Then** persisten
   esos campos y se registra `transaction_changed`.
3. **Given** body con `orderDetails`, `totalPrice`, `email` u otros campos prohibidos,
   **When** admin hace `PUT`, **Then** responde 400 sin modificar el pedido.
4. **Given** request sin auth admin, **When** hace `PUT`, **Then** 401/403.

---

### User Story 3 - Rutas admin protegidas (Priority: P1)

Como dueño del negocio, necesito que listado, edición, detalle admin y notas solo
sean accesibles con credenciales de administrador, manteniendo checkout y post-shop
públicos.

**Why this priority**: Hoy `GET /orders` y `PUT /orders/:id` están sin guards —
exposición de datos y mutación no autorizada.

**Independent Test**: Sin token → `GET /orders` y `PUT` fallan; `POST /orders` y
`GET /orders/:id` siguen funcionando sin token.

**Acceptance Scenarios**:

1. **Given** usuario no autenticado, **When** `POST /orders` válido, **Then** crea
   pedido (checkout público).
2. **Given** usuario no autenticado, **When** `GET /orders/:id`, **Then** devuelve
   detalle sin `timeline` ni `notes`.
3. **Given** usuario no autenticado, **When** `GET /orders` o `PUT /orders/:id`,
   **Then** 401/403.
4. **Given** token admin válido, **When** accede rutas admin, **Then** operación
   permitida.

---

### User Story 4 - Timeline de auditoría server-side (Priority: P2)

Como administrador, necesito ver historial de cambios de un pedido generado por el
sistema, para trazabilidad entre operadores sin depender solo de eventos optimistas
del front.

**Why this priority**: El front 005 muestra timeline optimista tras PUT; necesita
datos reales al abrir detalle admin.

**Independent Test**: Tras crear pedido → evento `created`; tras cambiar estado →
`state_changed` con `{ from, to }` en enums API.

**Acceptance Scenarios**:

1. **Given** nuevo pedido vía `POST /orders`, **When** se persiste, **Then** se
   crea evento `created` asociado al `orderId`.
2. **Given** `PUT` que cambia `state`, **When** persiste, **Then** timeline incluye
   `state_changed` con valores enum `from`/`to` (sin labels español).
3. **Given** `PUT` que cambia `transactionType` o `address`, **When** persiste,
   **Then** timeline incluye `transaction_changed`.
4. **Given** `GET /orders/:id` público, **When** cliente consulta, **Then** respuesta
   no incluye `timeline`.

---

### User Story 5 - Notas internas append-only (Priority: P2)

Como administrador, necesito agregar notas internas a un pedido que no vea el
cliente, para registrar acuerdos telefónicos o observaciones operativas.

**Why this priority**: El front 005 ya llama `POST /orders/:id/notes`; hoy responde
404 y guarda nota solo localmente.

**Independent Test**: `POST /orders/:id/notes` con `{ note: "texto" }` persiste nota
y crea evento `admin_note_added`; nota vacía → 400.

**Acceptance Scenarios**:

1. **Given** admin autenticado y pedido existente, **When** `POST` con nota válida,
   **Then** nota persistida con `id`, `text`, `createdAt`, `createdBy`.
2. **Given** nota con solo espacios, **When** `POST`, **Then** 400.
3. **Given** nota creada, **When** admin intenta editarla o borrarla vía API,
   **Then** no existe endpoint v1 (append-only).
4. **Given** cliente público, **When** consulta `GET /orders/:id`, **Then** no ve
   notas internas.

---

### User Story 6 - Detalle admin con timeline y notas (Priority: P2)

Como administrador, al abrir "Ver" en el panel necesito el pedido completo con
productos, historial y notas en una sola respuesta.

**Why this priority**: El front llama `GET /orders/:id/admin` y lee `timeline` y
`notes` en la raíz del JSON.

**Independent Test**: `GET /orders/:id/admin` con token admin → 200 con orden,
`orderDetails` con `product`, `timeline[]`, `notes[]`.

**Acceptance Scenarios**:

1. **Given** admin autenticado, **When** `GET /orders/:id/admin`, **Then** respuesta
   incluye campos de orden, `timeline`, `notes` (alias `adminNotes` aceptado por
   front como fallback).
2. **Given** pedido inexistente, **When** `GET /orders/:id/admin`, **Then** 404.
3. **Given** sin auth admin, **When** consulta ruta admin, **Then** 401/403.
4. **Given** eventos con autor, **When** exista `createdByUserId`, **Then**
   `createdBy` expone `{ id, email }`.

---

### User Story 7 - Email con URL canónica post-shop (Priority: P2)

Como cliente que confirma compra, el email de confirmación debe enlazar a la ruta
canónica `/post-shop/:id` que usa el front 005, no la legacy `/postShop/:id`.

**Why this priority**: Compatibilidad con deploy front ya en producción; el front
redirige legacy pero el email debe usar URL correcta.

**Independent Test**: Tras pedido, HTML del email contiene
`{URL_CLIENT}/post-shop/{orderId}`; flujo fire-and-forget Brevo sin cambios.

**Acceptance Scenarios**:

1. **Given** pedido creado, **When** se genera HTML de confirmación, **Then** CTA
   apunta a `/post-shop/:id`.
2. **Given** envío de email, **When** Brevo falla, **Then** pedido persiste (regresión
   002/003 intacta).

---

### Edge Cases

- ¿Qué ocurre si `state` o `transactionType` en query no son valores enum válidos?
  → 400 Bad Request.
- ¿Qué ocurre si `page` o `limit` son inválidos (0, negativos)? → coerción a
  `page=1`, `limit=20`; `limit` > 100 → cap en 100.
- ¿Qué ocurre si `sort` no es `createAt`? → 400 Bad Request.
- ¿Pedidos creados antes del deploy sin evento `created`? → timeline vacío hasta
  primera mutación o nota (no backfill retroactivo en v1).
- ¿`PUT` sin cambios reales en campos? → 200 sin duplicar eventos de timeline.
- ¿`GET /orders/:id/admin` con orden sin notas/eventos? → arrays vacíos, no error.
- ¿Token admin expirado? → 401; front muestra lista vacía o flujo login existente.
- ¿Transición `state` de `paid` a `inProcess`? → permitida en v1 (sin restricción).
- ¿Evento `created` en checkout? → `createdBy` null/ausente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `GET /orders` MUST aceptar query params: `state`, `transactionType`,
  `q`, `page`, `limit`, `sort`, `order` con defaults `page=1`, `limit=20`,
  `sort=createAt`, `order=desc`.
- **FR-002**: `GET /orders` MUST responder `{ data: Order[], meta: { total, page,
  limit, totalPages } }` en raíz (no array legacy).
- **FR-003**: Cada ítem en `data` MUST incluir `orderDetails` con relación `product`
  (mínimo `id`, `name`; opcional `img_url`).
- **FR-004**: Filtro `q` MUST buscar case-insensitive en `nameClient`, `email`,
  `numCel`, `num2Cel`, `id`, `theme`.
- **FR-005**: `GET /orders` MUST requerir autenticación admin (`AuthGuard` +
  `RolesGuard`, rol `admin`).
- **FR-006**: `PUT /orders/:id` MUST aceptar solo campos opcionales: `state`,
  `transactionType`, `address` (parcial, combinables).
- **FR-007**: `PUT /orders/:id` MUST rechazar body con campos prohibidos
  (`orderDetails`, `products`, `totalPrice`, `email`, `nameClient`, etc.) → 400.
- **FR-008**: `PUT /orders/:id` MUST requerir autenticación admin.
- **FR-009**: `PUT` que modifica `state` MUST crear evento timeline `state_changed`
  con `payload: { from, to }` (valores enum API).
- **FR-010**: `PUT` que modifica `transactionType` y/o `address` MUST crear evento
  `transaction_changed` con `payload` JSONB: `{ fromTransactionType?, toTransactionType?,
  fromAddress?, toAddress? }` (solo claves de campos que cambiaron).
- **FR-011**: `POST /orders` MUST permanecer público; al crear pedido MUST registrar
  evento timeline `created`.
- **FR-012**: `GET /orders/:id` MUST permanecer público; MUST NOT incluir `timeline`
  ni `notes`/`adminNotes`.
- **FR-013**: `GET /orders/:id/admin` MUST requerir admin; MUST devolver orden +
  `orderDetails` con `product` + `timeline[]` + `notes[]` en raíz JSON (sin envelope
  `{ data: T }` adicional — compatibilidad front 005).
- **FR-014**: `POST /orders/:id/notes` MUST requerir admin; body `{ note: string }`;
  `note.trim()` vacío → 400.
- **FR-015**: Notas MUST ser append-only en v1 (sin PUT/DELETE de notas).
- **FR-016**: `POST /orders/:id/notes` MUST persistir nota y crear evento
  `admin_note_added` con `payload: { note }`.
- **FR-017**: Enums `state` y `transactionType` MUST NOT cambiar valores existentes:
  `inProcess` | `partialPayment` | `paid`; `send` | `withdraw`.
- **FR-018**: Timeline event types MUST ser: `created`, `state_changed`,
  `transaction_changed`, `admin_note_added`.
- **FR-019**: Timeline events MUST exponer `{ id, type, payload, createdAt,
  createdBy? }` con `createdBy: { id, email }` cuando aplique.
- **FR-020**: Email confirmación MUST usar CTA `{URL_CLIENT}/post-shop/{orderId}`
  (reemplazar `/postShop/`).
- **FR-021**: MUST NOT modificar contrato de `POST /orders` ni envelope de
  `GET /orders/:id` público si hoy responde entidad directa.
- **FR-022**: `DELETE /orders/:id` MUST NOT modificarse en v1 (legacy/no-op
  documentado).
- **FR-023**: Feature MUST incluir tests unitarios de `OrdersService` para listado
  filtrado, update parcial, timeline y notas.
- **FR-024**: Nuevas entidades `OrderTimelineEvent` y `OrderAdminNote` MUST
  documentarse en `plan.md` con advertencia `@Entity` / `synchronize`.
- **FR-025**: `OrderTimelineEvent.payload` MUST persistirse como JSONB; validación
  de `type` y forma de `payload` en Service (no en DB).
- **FR-026**: `GET /orders` con `sort` distinto de `createAt` MUST responder 400.
- **FR-027**: `GET /orders` con `state` o `transactionType` fuera de enum MUST
  responder 400.
- **FR-028**: Transiciones de `state` MUST permitir cualquier par válido del enum
  en v1 (sin reglas de negocio adicionales).
- **FR-029**: Evento `created` desde `POST /orders` público MUST tener `createdBy`
  null u omitido en respuesta API.
- **FR-030**: `page`/`limit` inválidos MUST normalizarse; `limit` MUST caparse en 100.

### API Contract Summary (referencia front 005)

```
GET  /orders?state=&transactionType=&q=&page=1&limit=20&sort=createAt&order=desc
     → { data, meta }  [admin]

GET  /orders/:id           → Order público (sin timeline/notes)
GET  /orders/:id/admin     → Order + timeline[] + notes[]  [admin]
POST /orders/:id/notes     → { note }  [admin]
PUT  /orders/:id           → parcial state | transactionType | address  [admin]
POST /orders               → sin cambios [público]
```

**Fuentes de verdad front:**

- `SaphireSouvernis-Front/specs/005-orders-operations-overhaul/contracts/orders-api-client.md`
- `SaphireSouvernis-Front/specs/005-orders-operations-overhaul/data-model.md`
- `SaphireSouvernis-Front/specs/005-orders-operations-overhaul/spec.md` (Contrato API objetivo)

### Key Entities

- **Order** (existente): pedido con `state`, `transactionType`, datos cliente,
  `orderDetails`, `totalPrice`, fechas.
- **Orderdetail** (existente): línea con `cuantity`, `subTotal`, relación `product`.
- **Product** (existente): `id`, `name`, `img_url` mínimo para UI admin.
- **OrderTimelineEvent** (nuevo): auditoría por pedido; `type`, `payload` JSONB,
  `createdAt`, `createdByUserId` opcional (null en evento `created` de checkout).
- **OrderAdminNote** (nuevo): nota interna append-only; `text`, `createdAt`, autor.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `GET /orders?state=inProcess&page=1&limit=20` sin token → 401/403.
- **SC-002**: `GET /orders` con admin → `{ data, meta }` y 100% de ítems con
  `orderDetails[].product.name` cuando existan líneas.
- **SC-003**: `PUT /orders/:id` con `{ state: "paid" }` → estado persistido + al
  menos un evento `state_changed` consultable vía admin.
- **SC-004**: `PUT` con `orderDetails` en body → 400 en 100% de intentos.
- **SC-005**: `GET /orders/:id` público → respuesta sin claves `timeline`, `notes`,
  `adminNotes`.
- **SC-006**: `GET /orders/:id/admin` → incluye `timeline` y `notes` arrays.
- **SC-007**: `POST /orders/:id/notes` → nota persistida; segunda lectura admin la
  incluye; sin endpoint de edición/borrado.
- **SC-008**: Email CTA contiene `/post-shop/` y no `/postShop/`.
- **SC-009**: `npm test` pasa incluyendo tests nuevos de órdenes.
- **SC-010**: Smoke con front 005: filtros admin usan servidor (no solo fallback
  cliente) tras deploy backend.

## Assumptions

- Frontend feature 005 desplegada o en desarrollo con modo híbrido; backend puede
  deployarse independientemente.
- Un solo rol operativo: `admin`; sin permisos granulares.
- Paginación offset suficiente para volumen actual de pedidos.
- `payload` de timeline como JSONB (clarificado sesión 2026-06-23).
- Pedidos históricos sin backfill de evento `created`; solo pedidos nuevos post-deploy.
- Transiciones de `state` libres en v1 (clarificado).
- Whitelist `sort` v1: solo `createAt`; ampliación en feature futura si el front lo pide.
- `GET /orders/:id/admin` sin envelope adicional por compatibilidad directa con
  `ViewBuyOrder` del front.
- Auth 401/403 alineado con `products.controller.ts`.
- Checkout (`POST /orders`) y email fire-and-forget (features 002/003) sin regresión.

## Out of Scope

- Cambiar valores de enums `state` y `transactionType`.
- Editar líneas del pedido (productos/cantidades) vía API.
- Editar o borrar notas existentes.
- Kanban, pagos online, cancelación formal, SMS, email al admin.
- Permisos granulares más allá de `admin`.
- Modificar `DELETE /orders/:id` (comportamiento legacy).
- Cambiar envelope de `POST /orders` o `GET /orders/:id` público.
- Cambios en `SaphireSouvernis-Front` (ya implementado en 005).
- Tests e2e con Playwright.

## Dependencies

- Feature front `005-orders-operations-overhaul` (contrato consumidor).
- Features backend `002-order-email-decouple`, `003-email-provider-brevo` (checkout +
  email intactos).
- Módulos existentes: `AuthGuard`, `RolesGuard`, `Order`, `Orderdetail`, `Product`.
- Constitución: Services, envs.ts, tests, Swagger en endpoints nuevos/modificados.

## Migration Notes

| Antes | Después |
|-------|---------|
| `GET /orders` → `Order[]` | `{ data, meta }` |
| `GET /orders` público | Solo admin |
| Sin timeline/notas | Persistencia + endpoints admin |
| `UpdateOrderDto` permisivo | `UpdateOrderPartialDto` acotado |
| Email `/postShop/:id` | `/post-shop/:id` |

Deploy backend activa contrato nuevo; front 005 deja modo híbrido automáticamente
al detectar `{ data, meta }`.
