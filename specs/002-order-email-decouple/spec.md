# Feature Specification: Desacoplar envío de email del checkout

**Feature Branch**: `002-order-email-decouple`

**Created**: 2026-06-13

**Status**: Ready

**Input**: User description: "Feature: 002-order-email-decouple — Desacoplar envío de email del checkout con Inyección de Dependencias. Bug en producción: orden se crea en DB pero POST /orders no responde por timeout SMTP Gmail desde Render; rollback por email falla por FK. Objetivo: email fire-and-forget, DI con EmailSender, no borrar orden por fallo de mail."

## Clarifications

### Session 2026-06-13

- Q: ¿Qué ocurre si falla el envío de email? → A: La compra se confirma igual; la orden y sus detalles permanecen en la base de datos.
- Q: ¿Cuándo se revierte una orden creada? → A: Solo por errores de persistencia en base de datos (orden, detalles o total), nunca por fallo de SMTP/email.
- Q: ¿Cambia el contrato HTTP de `POST /orders`? → A: No; se mantiene el formato de respuesta legacy actual (sin envelope `{ data: T }`) para no romper el frontend.
- Q: ¿Se modifica el esquema de base de datos? → A: No; no se agregan campos como `emailSent` ni se alteran entidades `@Entity`.
- Q: ¿Qué proveedor de email se integra en esta feature? → A: Solo se abstrae el contrato vía DI; la implementación concreta inicial migra la lógica Nodemailer/Gmail existente. Resend/SendGrid quedan fuera de alcance.
- Q: ¿Alcance de tests? → A: Tests unitarios de `OrdersService.create` con mock del contrato de email; sin conexión real a Gmail ni SMTP en CI.
- Q: ¿Estrategia de rollback ante fallo de persistencia (orden, detalles o total)? → A: Transacción TypeORM única que envuelve creación de orden, detalles y actualización de total; rollback automático ante cualquier fallo (sin deletes manuales).
- Q: ¿Quién construye el HTML del correo de confirmación? → A: `OrdersService` (método privado `buildOrderConfirmationHtml`); `EmailSender` recibe payload con HTML renderizado y solo transporta el envío.
- Q: ¿Alcance de limpieza DI de módulos con `NodemailerService`? → A: Auditoría completa de todos los módulos que registren `NodemailerService` en `providers`; migrarlos a importar el módulo que exporta `EMAIL_SENDER`.
- Q: ¿Qué hacer con la clase legacy `NodemailerService`? → A: Eliminarla por completo; solo `NodemailerEmailSender implements EmailSender` (sin wrapper ni duplicado).
- Q: ¿Alcance de tests unitarios en `OrdersService.create`? → A: Mock de email async más al menos un test de rollback por fallo de persistencia (error al guardar detalles/total; orden no expuesta como exitosa).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Checkout no bloqueado por email (Priority: P1)

Como cliente que confirma un pedido en la tienda, necesito recibir confirmación inmediata
de mi compra aunque el sistema de correo falle o tarde, para poder continuar al detalle
del pedido y contactar por WhatsApp sin quedar atrapado en una pantalla de carga.

**Why this priority**: En producción hoy la UI queda indefinidamente en "Creando orden..."
aunque la orden ya existe en la base de datos; esto bloquea ventas y genera confusión.

**Independent Test**: Enviar `POST /orders` con payload válido simulando fallo o timeout
del servicio de email y verificar que la respuesta HTTP exitosa llega en menos de 3 segundos
con la orden persistida.

**Acceptance Scenarios**:

1. **Given** un carrito y formulario de pedido válidos, **When** el cliente confirma el
   pedido y el servicio de email no responde (timeout SMTP), **Then** el endpoint responde
   exitosamente en menos de 3 segundos con los datos de la orden creada.
2. **Given** un pedido confirmado con email fallido, **When** el frontend recibe la
   respuesta, **Then** puede navegar a la página post-compra (`/postShop/:id`) sin error.
3. **Given** un entorno de producción (Render), **When** Gmail SMTP no es alcanzable,
   **Then** la creación de orden no depende de la conexión SMTP para completar la
   respuesta HTTP.

---

### User Story 2 - Orden no se revierte por fallo de mail (Priority: P2)

Como operador del negocio, necesito que los pedidos confirmados por el cliente permanezcan
registrados aunque falle el envío del correo de confirmación, para no perder ventas válidas
ni generar inconsistencias entre lo que el cliente cree haber comprado y lo que existe en
el sistema.

**Why this priority**: Hoy, ante error de email, el sistema intenta borrar la orden; además
falla por restricción de clave foránea con `orderdetail`, dejando datos huérfanos y error 500.

**Independent Test**: Simular rechazo del servicio de email tras persistir orden y detalles;
verificar que la orden sigue existiendo en base de datos y que no se ejecuta eliminación
por motivo de SMTP.

**Acceptance Scenarios**:

1. **Given** una orden y sus detalles persistidos correctamente, **When** el envío de
   email falla (timeout, credenciales, red), **Then** la orden y los `orderdetail`
   permanecen en la base de datos.
2. **Given** fallo de email en background, **When** el flujo de creación termina,
   **Then** no se invoca eliminación de la orden por ese motivo.
3. **Given** error de email registrado en logs, **When** un administrador consulta
   pedidos, **Then** la orden aparece en el listado con su total y detalles intactos.

---

### User Story 3 - Proveedor de email intercambiable (Priority: P3)

Como desarrollador del backend, necesito que el envío de correos dependa de una abstracción
inyectable y no de una implementación concreta acoplada al módulo de órdenes, para poder
cambiar de Nodemailer/Gmail a Resend, SendGrid u otro proveedor en el futuro sin modificar
la lógica de negocio de creación de pedidos.

**Why this priority**: Gmail SMTP no funciona desde Render (ETIMEDOUT en conexión); la
abstracción habilita un follow-up de migración a proveedor HTTP sin refactor masivo.

**Independent Test**: Registrar una implementación alternativa del contrato de email en el
módulo NestJS y verificar que `OrdersService` compila y funciona sin cambios en su código.

**Acceptance Scenarios**:

1. **Given** un contrato `EmailSender` registrado con token de inyección, **When**
   `OrdersService` crea una orden, **Then** delega el envío al contrato inyectado sin
   importar la implementación concreta.
2. **Given** una nueva implementación `ResendEmailSender` (futura), **When** se registra
   en el módulo con `useClass`, **Then** `OrdersService` no requiere modificaciones.
3. **Given** cualquier módulo del backend, **When** requiere envío de email, **Then**
   importa el módulo que exporta `EMAIL_SENDER` y no registra implementaciones
   concretas en su array `providers`.

---

### Edge Cases

- ¿Qué ocurre si falla la creación de `orderdetail` después de guardar la orden?
  La transacción TypeORM hace rollback completo; no quedan órdenes huérfanas ni detalles
  parciales; la respuesta HTTP debe ser error.
- ¿Qué ocurre si falla la actualización de `totalPrice`? La transacción revierte orden,
  detalles y total; no se expone una orden inconsistente como exitosa.
- ¿Qué ocurre si el email falla en background? La orden persiste; el error se registra en
  logs sin afectar la respuesta HTTP ya enviada al cliente.
- ¿Qué ocurre si el email tarda pero eventualmente conecta? No debe bloquear la respuesta;
  el cliente ya recibió confirmación antes de que termine el envío async.
- ¿Qué ocurre en development con Gmail operativo? El email se envía en background y la
  respuesta HTTP sigue siendo inmediata tras persistir.
- ¿Qué ocurre si `NODEMAILER_*` está mal configurado? El pedido se confirma; el fallo de
  mail queda en logs (no 500 al cliente por SMTP post-respuesta).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST persistir orden, detalles y total antes de considerar
  exitosa la creación del pedido.
- **FR-002**: El sistema MUST responder al cliente con la orden creada sin esperar la
  finalización del envío de email (patrón fire-and-forget).
- **FR-003**: El sistema MUST NOT eliminar una orden ni sus detalles por fallo del
  servicio de email (timeout, red, credenciales, proveedor caído).
- **FR-004**: El sistema MUST envolver la creación de orden, detalles y actualización de
  total en una transacción TypeORM; ante error de persistencia, rollback automático sin
  deletes manuales ni órdenes huérfanas.
- **FR-005**: El sistema MUST definir un contrato de envío de email (`EmailSender`) con
  token de inyección (`EMAIL_SENDER`) desacoplado de la implementación concreta.
  `NodemailerEmailSender` MUST ser la única implementación inicial; MUST eliminarse
  `NodemailerService` legacy sin mantener wrappers de compatibilidad.
- **FR-006**: `OrdersService` MUST depender exclusivamente del contrato inyectado
  (`@Inject(EMAIL_SENDER)`), sin importar implementaciones concretas de Nodemailer.
- **FR-007**: `OrdersService` MUST construir el HTML de confirmación en un método privado
  (`buildOrderConfirmationHtml`) y pasarlo al contrato `EmailSender` como payload renderizado;
  la implementación concreta MUST preservar destinatario, CC, asunto y contenido equivalente
  al flujo actual sin generar plantillas internamente.
- **FR-008**: El módulo de email MUST exportar el token `EMAIL_SENDER`. MUST auditar y
  actualizar todos los módulos que registren `NodemailerService` (u otra implementación
  concreta) en `providers`, reemplazándolos por `imports` del módulo de email exportando
  el token; prohibido registrar implementaciones concretas fuera del módulo de email.
- **FR-009**: La implementación SMTP MUST configurar timeouts de conexión (~10–15 s) para
  evitar bloqueos prolongados del proceso cuando el envío async se ejecute.
- **FR-010**: Los fallos de email en background MUST registrarse con logger estructurado
  (incluyendo `orderId`) sin propagar excepciones al request HTTP ya completado.
- **FR-011**: El endpoint `POST /orders` MUST mantener su formato de respuesta legacy
  actual compatible con el frontend existente.
- **FR-012**: El cambio MUST incluir tests unitarios de `OrdersService.create` con mock
  de `EmailSender`: orden persistida, respuesta exitosa, invocación async de email, y
  ausencia de borrado de orden cuando el mock rechaza. MUST incluir al menos un test de
  rollback por fallo de persistencia (mock de error al guardar detalles o total) que
  verifique que la orden no se expone como exitosa.
- **FR-013**: MUST documentarse el contrato DI en
  `specs/002-order-email-decouple/contracts/email-sender.md` durante la fase de planificación
  o implementación.

### Key Entities

- **Order (existente)**: Pedido del cliente; no se modifica el esquema en esta feature.
- **Orderdetail (existente)**: Líneas del pedido; relación FK con Order sin cambios.
- **EmailSender (contrato)**: Abstracción de transporte de correo; recibe payload con HTML
  ya renderizado y ejecuta el envío sin conocer la estructura de `Order`.
- **SendOrderConfirmationPayload (contrato)**: Destinatario, copia, asunto, HTML renderizado
  y `orderId` para trazabilidad en logs; generado por `OrdersService`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En pruebas con email simulado en timeout/fallo, 100% de requests
  `POST /orders` válidos responden en menos de 3 segundos.
- **SC-002**: En pruebas con email simulado en fallo, 0% de órdenes eliminadas por
  motivo de SMTP tras persistencia exitosa.
- **SC-003**: En producción, 0 casos de UI bloqueada en "Creando orden..." cuando la
  orden ya fue persistida (verificación post-deploy con compra de prueba).
- **SC-004**: Tras deploy, el frontend navega a `/postShop/:id` en el flujo feliz de
  checkout independientemente del estado del email.
- **SC-005**: Los tests unitarios de `OrdersService.create` (email async + rollback DB)
  pasan con `npm test` sin Gmail ni SMTP real.
- **SC-006**: Un desarrollador puede registrar una implementación alternativa de
  `EmailSender` cambiando solo el módulo de email, sin editar `OrdersService`.

## Assumptions

- **Bug confirmado**: Logs Render muestran `ETIMEDOUT` en conexión SMTP Gmail (`command:
  CONN`); la orden se crea pero el request HTTP no completa a tiempo por `await sendEmail`.
- **Frontend**: No requiere cambios; consume la misma respuesta de `POST /orders`.
- **Variables de entorno**: Se mantienen `NODEMAILER_USER`, `NODEMAILER_PASS`,
  `NODEMAILER_FROM`, `NODEMAILER_CC` y `URL_CLIENT` vía `envs.ts`.
- **Producción SMTP**: Gmail por SMTP desde Render probablemente seguirá fallando hasta
  migrar a proveedor HTTP; esta feature desbloquea UX, no garantiza entrega de mail en prod.
- **Entidades**: Sin cambios en `@Entity`; cumple constitución V sin necesidad de OK
  adicional de Agustin Malugani.
- **Endpoint legacy**: `POST /orders` permanece público (comportamiento actual); no se
  rediseña auth en esta feature.
- **Constitución**: Cumple I (lógica en Services), II (envs centralizado), VI (tests en
  bugfix de service) y VIII (TypeScript estricto, sin `any`).

## Out of Scope

- Integración de Resend, SendGrid, Brevo u otro proveedor HTTP (solo preparar DI).
- Cambios en frontend (`ModalCreateOrder.jsx`, servicios, rutas).
- Modificación de entidades `@Entity` Order / Orderdetail o DTOs públicos de órdenes.
- Cola de mensajes, reintentos automáticos o campo persistente `emailSent` / `emailFailed`.
- Envelope `{ data: T }` en `POST /orders`.
- Tests e2e con SMTP real o base de datos de integración.
- Pipeline CI/CD en GitHub Actions.

## Dependencies

- Módulo existente `nodemailer` y variables `NODEMAILER_*` en `envs.ts`.
- `OrdersService.create` actual en `src/modules/orders/orders.service.ts`.
- Frontend en Vercel esperando respuesta síncrona con objeto `Order` para navegar a
  `/postShop/:id`.

## Follow-up (post-feature)

- Feature `003-email-provider-resend` (o similar): implementar `ResendEmailSender`,
  configurar env vars en Render, verificar entrega real en producción.
