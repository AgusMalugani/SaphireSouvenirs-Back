# Implementation Plan: Operaciones de pedidos — backend v2 (Orders API)

**Branch**: `004-orders-api-v2` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-orders-api-v2/spec.md`

## Summary

Evolucionar el módulo `orders` para alinear el backend con el front 005: listado admin
paginado `{ data, meta }`, auth admin en rutas sensibles, PUT parcial seguro, timeline
y notas persistidas, detalle `GET /orders/:id/admin`, y email CTA `/post-shop/:id`.
Dos entidades nuevas (`OrderTimelineEvent`, `OrderAdminNote`) con payload JSONB.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS

**Primary Dependencies**: NestJS 10, TypeORM 0.3, class-validator, Jest 29, dayjs

**Storage**: PostgreSQL (Neon) — **2 tablas nuevas** vía `@Entity` + synchronize dev

**Testing**: `orders.service.spec.ts` extendido (list, update, timeline, notes)

**Target Platform**: Render (backend) + Vercel (front 005 ya desplegado/consumiendo)

**Project Type**: Monolito NestJS REST API

**Performance Goals**: Listado paginado <500ms típico; checkout <3s (regresión 002)

**Constraints**: Sin nuevas env vars; sin cambios enums; POST/GET público sin envelope nuevo

**Scale/Scope**: ~15 archivos create/modify, 2 entidades, 4 DTOs nuevos, 2 rutas nuevas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Reference: `.specify/memory/constitution.md` (v1.0.0)

- [x] Lógica de negocio en `OrdersService` (timeline, notes, list, update)
- [x] Variables de entorno — sin cambios (`envs.ts` intacto)
- [x] Endpoints modificados/nuevos — evaluados: admin protegidos; públicos justificados en spec
- [x] Swagger — `@ApiBearerAuth`, `@ApiQuery`, DTOs decorados en controller
- [x] Persistencia — **⚠️ 2 `@Entity` nuevas**; advertencia + OK Agustin Malugani requerido
- [x] Tests — extender `orders.service.spec.ts`
- [x] Envelope `{ data, meta }` en `GET /orders`; excepción documentada en admin detail (front 005)
- [x] Workflow SDD: specify ✅ → clarify ✅ → plan (este doc) → tasks → analyze

**Post-design re-check**: Sin violaciones. Excepción envelope admin detail justificada por contrato front.

## ⚠️ Entity Change Warning

Esta feature **crea** `@Entity`:

- `OrderTimelineEvent` (`payload` JSONB)
- `OrderAdminNote`

Con `synchronize: true` en desarrollo, el esquema se actualizará al arrancar.
**Requiere confirmación explícita de Agustin Malugani antes de `/speckit-implement`.**

## Project Structure

### Documentation (this feature)

```text
specs/004-orders-api-v2/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/orders-api.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/modules/orders/
├── entities/
│   ├── order.entity.ts                    # EXISTING (sin cambio columnas)
│   ├── order-timeline-event.entity.ts     # CREATE
│   └── order-admin-note.entity.ts         # CREATE
├── dto/
│   ├── create-order.dto.ts                # EXISTING
│   ├── update-order.dto.ts                # DEPRECATE → reemplazar uso
│   ├── update-order-partial.dto.ts        # CREATE
│   ├── list-orders-query.dto.ts           # CREATE
│   └── create-order-note.dto.ts           # CREATE
├── enums/
│   └── order-timeline-event-type.enum.ts  # CREATE (opcional)
├── orders.controller.ts                   # MODIFY: guards, rutas, orden
├── orders.service.ts                      # MODIFY: list, update, admin, notes, timeline, email URL
├── orders.service.spec.ts                 # MODIFY: tests ampliados
└── orders.module.ts                       # MODIFY: register new entities

src/enums/states.enum.ts                   # EXISTING
src/enums/transactionType.enum.ts          # EXISTING
```

**Structure Decision**: Timeline y notas colocalizados en módulo `orders`; sin capa UseCase.

## Phase 0: Research

Ver [research.md](./research.md) — 14 decisiones (R1–R14), sin NEEDS CLARIFICATION.

## Phase 1: Design

| Artefacto | Propósito |
|-----------|-----------|
| [data-model.md](./data-model.md) | Entidades, JSONB, shapes API |
| [contracts/orders-api.md](./contracts/orders-api.md) | Contrato HTTP v2 |
| [quickstart.md](./quickstart.md) | Validación manual + smoke front |

## Implementation Approach

### 1. Entidades

**`OrderTimelineEvent`**

```typescript
@Entity()
export class OrderTimelineEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  order: Order;

  @Column()
  type: OrderTimelineEventType; // string enum

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true })
  createdByUser?: User | null;
}
```

**`OrderAdminNote`** — `orderId`, `text`, `createdAt`, `createdByUser` (required).

Registrar en `OrdersModule` `TypeOrmModule.forFeature([...])`.

### 2. DTOs

**`ListOrdersQueryDto`**: query params con transform/coerce page/limit; `@IsEnum` condicional.

**`UpdateOrderPartialDto`**: solo `state?`, `transactionType?`, `address?` opcionales.

**`CreateOrderNoteDto`**: `note` string `@IsNotEmpty` tras trim custom o `@Transform`.

### 3. `OrdersController` — rutas y guards

Orden crítico:

```typescript
@Get(':id/admin')        // admin — ANTES de :id
@Post(':id/notes')       // admin — ANTES de :id
@Get(':id')              // público
```

| Handler | Guards |
|---------|--------|
| `findAll` | AuthGuard + RolesGuard admin |
| `update` | AuthGuard + RolesGuard admin + forbidNonWhitelisted pipe |
| `findAdminDetail` | AuthGuard + RolesGuard admin |
| `addNote` | AuthGuard + RolesGuard admin |
| `create`, `findOneById` | sin guards |

Inyectar `@Req() request` para `request.user` en mutaciones admin.

### 4. `OrdersService` — métodos nuevos/refactor

| Método | Responsabilidad |
|--------|-----------------|
| `findAllPaginated(query)` | QueryBuilder, filtros, meta |
| `updatePartial(id, dto, adminUser?)` | validar cambios, persistir, timeline |
| `findAdminById(id)` | order + details + product + timeline + notes serializados |
| `addAdminNote(id, note, adminUser)` | nota + evento |
| `recordTimelineEvent(...)` | private; usado en create/update/note |
| `create()` | + evento `created` en transacción existente |
| `buildOrderConfirmationHtml` | `/postShop/` → `/post-shop/` |

**Listado `q`**: OR de `ILIKE` en `nameClient`, `email`, `numCel`, `num2Cel`, `id`, `theme`.

**`updatePartial`**: comparar valores antes/después; si sin cambio → 200 sin nuevo evento.

**Serialización `createdBy`**: mapper que expone `{ id, email }` si `createdByUser` cargado.

### 5. PUT con campos prohibidos

```typescript
@Put(':id')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
async update(@Param('id') id: string, @Body() dto: UpdateOrderPartialDto, @Req() req) {
  return this.ordersService.updatePartial(id, dto, req.user);
}
```

### 6. Tests `orders.service.spec.ts`

| Caso | Assert |
|------|--------|
| `findAllPaginated` filtro state | query mock, meta correcta |
| `findAllPaginated` q | ILIKE llamado |
| `updatePartial` state | save + timeline `state_changed` |
| `updatePartial` sin cambio | no timeline duplicado |
| `updatePartial` body prohibido | vía e2e o DTO pipe (unit si aplica) |
| `addAdminNote` | nota + evento |
| `create` | timeline `created` sin createdBy |
| Email HTML | contiene `/post-shop/` |

### 7. Sin cambios

- `POST /orders` contrato respuesta
- `GET /orders/:id` shape público
- `DELETE /orders/:id`
- Email fire-and-forget Brevo (003)
- `envs.ts`, `.env.example`

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Admin GET sin `{ data: T }` | Front 005 lee `timeline` en raíz | Cambiar front fuera de scope |
| 2 `@Entity` nuevas | Persistencia timeline/notas | JSON en Order — no normalizado, no queryable |

## Risks & Mitigations

| Riesgo | Mitigación |
|--------|------------|
| synchronize en prod | Solo dev; constitution prohíbe sync prod |
| Ruta `:id` captura `admin` | Orden rutas + tests controller |
| Breaking `GET /orders` array | Front 005 modo híbrido; deploy coordinado |
| JWT `roles` string vs array | No cambiar auth en esta feature; documentado R4 |
| Volumen pedidos | Paginación + cap limit 100 |

## Next Step

Ejecutar `/speckit-tasks` → `/speckit-analyze` → confirmar OK `@Entity` → `/speckit-implement`.
