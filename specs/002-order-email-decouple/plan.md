# Implementation Plan: Desacoplar envío de email del checkout

**Branch**: `002-order-email-decouple` | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-order-email-decouple/spec.md`

## Summary

Corregir el bug de producción donde `POST /orders` queda colgado por `await sendEmail`
(Gmail SMTP ETIMEDOUT desde Render) aunque la orden ya existe en Neon. Desacoplar el
envío de email con DI (`EMAIL_SENDER` + `EmailSender`), responder al cliente inmediatamente
tras persistir orden + detalles + total (fire-and-forget), nunca borrar orden por fallo
SMTP, y envolver persistencia en transacción TypeORM. Eliminar `NodemailerService` legacy.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js LTS

**Primary Dependencies**: NestJS 10, TypeORM 0.3, nodemailer 6.x, Jest 29, dayjs

**Storage**: PostgreSQL (Neon) — sin cambios de esquema ni `@Entity`

**Testing**: Jest unit tests en `src/modules/orders/orders.service.spec.ts`

**Target Platform**: Desarrollo local + Render (backend) + Vercel (frontend sin cambios)

**Project Type**: Monolito NestJS REST API (`SaphireSouvenirs-Back`)

**Performance Goals**: `POST /orders` responde en < 3s con email simulado en fallo/timeout

**Constraints**: Sin cambios frontend; contrato HTTP legacy; sin `process.env` en `src/`;
sin `any`; imports al tope de archivo

**Scale/Scope**: ~10 archivos fuente create/modify/delete, 1 test file, 0 env vars nuevas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Reference: `.specify/memory/constitution.md` (v1.0.0)

- [x] Lógica de negocio en `Services` — OrdersService, NodemailerEmailSender, OrderdetailsService
- [x] Variables de entorno solo vía `envs.ts` — sin nuevas vars; NodemailerEmailSender usa `envs`
- [x] Endpoints nuevos — N/A; `POST /orders` existente, público justificado en spec
- [x] Rutas admin — N/A
- [x] Swagger — N/A (sin controllers/DTOs nuevos)
- [x] Persistencia: sin modificar `@Entity`; transacción solo en service layer
- [x] Cambios en `@Entity` — N/A (ninguna modificación)
- [x] Tests unitarios `OrdersService.create` + rollback DB definidos en plan
- [x] Envelope `{ data: T }` — N/A (legacy mantenido en POST /orders)
- [x] Workflow SDD: specify ✅ → clarify ✅ → plan (este doc) → tasks → analyze

**Post-design re-check**: Sin violaciones. No se requiere Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-order-email-decouple/
├── spec.md
├── plan.md              # Este archivo
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── email-sender.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/modules/email/
├── email-sender.interface.ts      # CREATE: EmailSender interface
├── email-sender.token.ts          # CREATE: EMAIL_SENDER Symbol
└── send-order-confirmation.payload.ts  # CREATE: payload type

src/modules/nodemailer/
├── nodemailer-email.sender.ts     # CREATE: NodemailerEmailSender implements EmailSender
├── nodemailer.module.ts           # MODIFY: provide/export EMAIL_SENDER
└── nodemailer.service.ts          # DELETE

src/modules/orders/
├── orders.service.ts              # MODIFY: transaction, DI, fire-and-forget, buildOrderConfirmationHtml
├── orders.service.spec.ts         # CREATE: unit tests
└── orders.module.ts               # MODIFY: import NodemailerModule, remove NodemailerService

src/modules/orderdetails/
├── orderdetails.service.ts        # MODIFY: create() optional EntityManager param
└── orderdetails.module.ts         # MODIFY: remove NodemailerService from providers

src/app.module.ts                  # VERIFY: NodemailerModule import unchanged
```

**Structure Decision**: Contratos DI en `src/modules/email/` (port); adapter SMTP en
`src/modules/nodemailer/` (adapter). Patrón ports & adapters sin capa UseCase extra.

## Phase 0: Research

Ver [research.md](./research.md) — 10 decisiones resueltas (R1–R10), sin NEEDS CLARIFICATION.

## Phase 1: Design

| Artefacto | Propósito |
|-----------|-----------|
| [data-model.md](./data-model.md) | Contratos, flujo transaccional, env vars |
| [contracts/email-sender.md](./contracts/email-sender.md) | Interfaz DI, payload, implementación |
| [quickstart.md](./quickstart.md) | Validación manual post-implement |

## Implementation Approach

### 1. Contratos email (`src/modules/email/`)

Crear tres archivos:

- `email-sender.token.ts` — `export const EMAIL_SENDER = Symbol('EMAIL_SENDER')`
- `send-order-confirmation.payload.ts` — interface payload
- `email-sender.interface.ts` — `EmailSender` con `sendOrderConfirmation(payload)`

Ver contrato completo en [contracts/email-sender.md](./contracts/email-sender.md).

### 2. `NodemailerEmailSender` (reemplaza `NodemailerService`)

Migrar lógica de `nodemailer.service.ts` a `nodemailer-email.sender.ts`:

```typescript
@Injectable()
export class NodemailerEmailSender implements EmailSender {
  private readonly logger = new Logger(NodemailerEmailSender.name);
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: envs.NODEMAILER_USER, pass: envs.NODEMAILER_PASS },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  async sendOrderConfirmation(payload: SendOrderConfirmationPayload): Promise<void> {
    // sendMail; log success/error; NO throw ConflictException
  }
}
```

Eliminar `nodemailer.service.ts`.

### 3. `NodemailerModule`

```typescript
@Module({
  providers: [
    { provide: EMAIL_SENDER, useClass: NodemailerEmailSender },
  ],
  exports: [EMAIL_SENDER],
})
export class NodemailerModule {}
```

### 4. `OrderdetailsService.create` — soporte transaccional

Agregar parámetro opcional `entityManager?: EntityManager`:

```typescript
async create(dto: CreateOrderdetailDto, order: Order, entityManager?: EntityManager) {
  const orderDetailRepository = entityManager
    ? entityManager.getRepository(Orderdetail)
    : this.orderDetailRepository;
  // product lookup via productService (fuera de TX — aceptable; product es read-only)
  // save via orderDetailRepository
}
```

**Nota**: `ProductsService.findOneById` queda fuera de la transacción (lectura). Si el
producto no existe, la transacción no inició writes de detalle aún si validamos antes.

### 5. `OrdersService.create` — refactor principal

**Inyectar**:

```typescript
constructor(
  @InjectRepository(Order) private readonly orderRepository: Repository<Order>,
  private readonly orderDetailsService: OrderdetailsService,
  @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  private readonly dataSource: DataSource,
) {}
```

**Flujo**:

```typescript
async create(createOrderDto: CreateOrderDto): Promise<Order> {
  const order = await this.dataSource.transaction(async (manager) => {
    // 1. create + save order
    // 2. orderDetails via orderDetailsService.create(prod, order, manager)
    // 3. compute total + build orderItemsHtml fragment
    // 4. save order with totalPrice
    // return persisted order with orderDetails attached
  });

  const emailHtml = this.buildOrderConfirmationHtml({ order, orderDetails, nameClient, total });
  void this.emailSender
    .sendOrderConfirmation({ to: email, cc: envs.NODEMAILER_CC, subject: '...', html: emailHtml, orderId: order.id })
    .catch((error) => this.logger.warn(`Order confirmation email failed for ${order.id}`, error));

  return order;
}
```

**Eliminar**:

- `await this.nodemailerService.sendEmail(...)`
- `catch` con `orderRepository.delete(order.id)`
- Import de `NodemailerService`

**Extraer**: `buildOrderConfirmationHtml(...)` — mover template HTML actual sin cambios
funcionales de contenido.

### 6. Limpieza DI de módulos

**`OrdersModule`**:

```typescript
imports: [TypeOrmModule.forFeature([...]), NodemailerModule],
providers: [OrdersService, OrderdetailsService, ProductsService, CategoriesService, FileUploadService, CloudinaryService],
// REMOVER: NodemailerService, OrderdetailsService duplicado
```

**`OrderdetailsModule`**: auditar y remover `NodemailerService`, `OrdersService` si no
necesarios en providers (evitar dependencias circulares duplicadas).

**Auditoría**: `rg NodemailerService src/` → 0 referencias post-cambio excepto historial git.

### 7. Tests (`orders.service.spec.ts`)

| Caso | Assert |
|------|--------|
| Happy path | `create` returns order; `emailSender.sendOrderConfirmation` called once |
| Email rejects | `create` resolves; `orderRepository.delete` **not** called |
| DB transaction fails | `create` throws; email mock **not** called |
| Async dispatch | Tras `create`, await microtasks; mock invocado |

Mock `DataSource.transaction` para ejecutar callback con manager mock, o mockear
repositories vía `getRepository`.

### 8. Sin cambios

- `envs.ts` / `.env.example` — vars existentes suficientes
- `orders.controller.ts` — sin cambios
- Frontend — sin cambios
- `@Entity` — sin cambios

## Complexity Tracking

> Sin violaciones de constitución que requieran justificación.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Risks & Mitigations

| Riesgo | Mitigación |
|--------|------------|
| Unhandled rejection en fire-and-forget | `.catch()` explícito en void chain |
| Product read fuera de TX | Validación de producto antes de save detalle; rollback si product invalid mid-flight |
| Dependencia circular Orders ↔ Orderdetails modules | Import NodemailerModule solo en OrdersModule |
| Mail sigue sin llegar en Render | Documentado en quickstart; follow-up 003 Resend |
| Tests complejos por DataSource.transaction | Mock transaction callback con EntityManager stub |

## Next Step

Ejecutar `/speckit-tasks` para generar `tasks.md` atómico, luego `/speckit-analyze`.
