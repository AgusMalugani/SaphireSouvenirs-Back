# Research: 002-order-email-decouple

**Date**: 2026-06-13

## R1: Patrón de Inyección de Dependencias para email

**Decision**: Token Symbol `EMAIL_SENDER` + interfaz `EmailSender` en
`src/modules/email/`; implementación `NodemailerEmailSender` en
`src/modules/nodemailer/` registrada con `{ provide: EMAIL_SENDER, useClass: NodemailerEmailSender }`.

**Rationale**: Patrón estándar NestJS para ports/adapters; permite swap a
`ResendEmailSender` cambiando solo el módulo provider; `OrdersService` depende del
contrato, no de Nodemailer.

**Alternatives considered**:

- Clase abstracta `EmailSender` — rechazado; interfaces + token son más idiomáticos en TS
- Import directo de `NodemailerService` — rechazado; acoplamiento actual causa el bug
- `@nestjs-modules/mailer` — rechazado; el proyecto ya usa `nodemailer` directo; migración
  innecesaria en esta feature

## R2: Desacople fire-and-forget del envío de email

**Decision**: Tras commit de transacción DB, invocar
`void this.dispatchOrderConfirmationEmail(...).catch((error) => this.logger.warn(...))`
sin `await` antes del `return order`.

**Rationale**: Garantiza SC-001 (<3s respuesta); el cliente recibe HTTP 201/200 con la
orden; fallos SMTP no afectan el request (FR-002, FR-003, FR-010).

**Alternatives considered**:

- NestJS `EventEmitter2` — rechazado; YAGNI para un solo listener
- Cola Bull/Redis — rechazado; out of scope
- Mantener `await sendEmail` — rechazado; causa el bug en producción

## R3: Transacción TypeORM para persistencia de orden

**Decision**: `DataSource.transaction()` en `OrdersService.create` envolviendo: save
orden → crear detalles → actualizar total. Extender `OrderdetailsService.create` con
parámetro opcional `EntityManager` para participar en la misma transacción.

**Rationale**: Cumple FR-004 y clarificación Q7; evita deletes manuales y FK errors;
rollback automático si falla cualquier paso de persistencia.

**Alternatives considered**:

- Delete manual orderdetail + order en catch — rechazado; falló en prod (FK violation)
- `@Transaction()` decorator en método — viable pero menos explícito con servicios anidados
- Sin transacción (solo quitar rollback email) — rechazado; deja riesgo de datos parciales

## R4: Ubicación del HTML de confirmación

**Decision**: Método privado `buildOrderConfirmationHtml` en `OrdersService`; payload
`SendOrderConfirmationPayload` incluye `html` renderizado.

**Rationale**: Clarificación Q8; la plantilla depende de datos de orden/productos que ya
están en `OrdersService`; `EmailSender` permanece transport-only.

**Alternatives considered**:

- Template en `NodemailerEmailSender` — rechazado; acopla transporte a dominio
- Servicio de plantillas separado — rechazado; over-engineering para una sola plantilla

## R5: Timeouts SMTP en Nodemailer

**Decision**: Configurar en `createTransport`:
`connectionTimeout: 10000`, `greetingTimeout: 10000`, `socketTimeout: 15000` (ms).

**Rationale**: Limita bloqueo del event loop en envío background (FR-009); logs Render
mostraron ~2min hang con defaults.

**Alternatives considered**:

- Sin timeouts — rechazado; riesgo de colgar worker en Render
- Timeout 5s — rechazado; demasiado agresivo para dev local con red lenta

## R6: Manejo de errores en NodemailerEmailSender

**Decision**: Capturar errores internamente, loguear con `Logger.warn` incluyendo
`orderId`, **no** lanzar `ConflictException` ni propagar al caller async.

**Rationale**: FR-010; el HTTP response ya se envió; excepciones no deben afectar al
cliente ni generar unhandled rejection sin catch en el void chain.

**Alternatives considered**:

- Lanzar `ConflictException` — rechazado; comportamiento legacy incorrecto post-decouple
- Reintentos automáticos — rechazado; out of scope

## R7: Eliminación de NodemailerService legacy

**Decision**: Eliminar `nodemailer.service.ts`; única implementación
`NodemailerEmailSender implements EmailSender`.

**Rationale**: Clarificación Q10; evita dos clases paralelas y confusión en DI.

**Alternatives considered**:

- Wrapper de compatibilidad — rechazado en clarify
- Renombrar in-place — rechazado; preferimos nombre explícito `NodemailerEmailSender`

## R8: Auditoría de módulos con registro directo

**Decision**: Grep/auditoría de `NodemailerService` en `providers`; archivos conocidos:
`orders.module.ts`, `orderdetails.module.ts`. Remover de providers; `OrdersModule` importa
`NodemailerModule` (exporta `EMAIL_SENDER`). `OrderdetailsModule` no necesita email si no
inyecta el servicio (verificar uso).

**Rationale**: FR-008; anti-patrón actual duplica providers y rompe encapsulación DI.

**Alternatives considered**:

- Solo limpiar OrdersModule — rechazado en clarify (auditoría completa)

## R9: Estrategia de tests

**Decision**: `orders.service.spec.ts` con `@nestjs/testing` Test module; mocks de
`Repository<Order>`, `DataSource`, `OrderdetailsService`, `@Inject(EMAIL_SENDER)`.
Casos: éxito + email invocado, email rechazado sin delete, fallo DB sin respuesta exitosa.

**Rationale**: FR-012, constitución VI; sin SMTP real en CI.

**Alternatives considered**:

- e2e con supertest — rechazado; out of scope
- Solo test de NodemailerEmailSender — insuficiente para bugfix de OrdersService

## R10: Gmail SMTP en Render

**Decision**: Documentar en quickstart que mail en prod puede seguir fallando (ETIMEDOUT);
esta feature desbloquea checkout; follow-up `003-email-provider-resend`.

**Rationale**: Evidencia de logs producción; no es bug de credenciales sino conectividad
SMTP saliente desde PaaS.

**Alternatives considered**:

- Integrar Resend en esta feature — rechazado; out of scope en spec
