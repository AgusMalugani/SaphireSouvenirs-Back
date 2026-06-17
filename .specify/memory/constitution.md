<!--
Sync Impact Report
- Version change: template (unratified) → 1.0.0
- Modified principles: placeholder template → 8 principios ratificados (I–VIII)
- Added sections: Restricciones Técnicas, Workflow SDD, Prohibitions, AI Protocol
- Removed sections: ninguna (plantilla reemplazada)
- Templates: ✅ plan-template.md (Constitution Check) | ✅ tasks-template.md (tests obligatorios) | ⚠ spec-template.md (sin cambios estructurales)
- Runtime guidance: ✅ .cursor/SaphireSouvenirs-Backend-Rules.mdc (alineación persistencia)
- Follow-up TODOs: primera feature SDD para dropSchema:false, synchronize condicional y flag de seeders
-->

# Constitución del Proyecto — SaphireSouvenirs-Back

API REST NestJS para e-commerce de souvenirs personalizados.

## Core Principles

### I. Modularidad NestJS Estricta

Toda la lógica de negocio MUST residir en los `Services` de su módulo correspondiente.
No se introducirán capas UseCase/Domain salvo aprobación explícita documentada en `plan.md`.

**Rationale:** El proyecto ya opera con módulos NestJS simples; capas extra aumentan
costo sin beneficio probado en el alcance actual.

### II. Configuración Centralizada Tipo Segura

Queda prohibido usar `process.env` directamente dentro de `src/`.
Toda variable de entorno MUST accederse exclusivamente vía `src/config/envs.ts`
validado con Zod. Cambios MUST actualizar el schema Zod y `.env.example`.

**Rationale:** Fail-fast en arranque y tipado consistente en todo el backend.

### III. Seguridad por Defecto

Los endpoints nuevos MUST evaluarse como protegidos por defecto (`AuthGuard`).
Las rutas públicas requieren justificación explícita en `spec.md`.
Las rutas administrativas MUST usar `AuthGuard` + `@Roles('admin')` + `RolesGuard`.

**Rationale:** Reduce exposición accidental de operaciones sensibles en features nuevas.

### IV. Contratos Code-First

La API mantiene prefijo global `api/v1`. Swagger UI en `/api`.
Controllers y DTOs de features nuevas MUST incluir decoradores `@nestjs/swagger`.
En esta versión de la constitución no se exige carpeta `api-specs/`.

**Rationale:** La documentación vive junto al código y se genera en runtime.

### V. Persistencia Consciente

PostgreSQL (Neon) vía TypeORM en `src/config/typeOrm.config.ts`.
`dropSchema` MUST ser `false` en todos los entornos.
`synchronize` MUST ser condicional vía `envs` (nunca `true` en producción/staging).
Modificar `@Entity` requiere advertencia en `plan.md` y confirmación explícita de
Agustin Malugani antes de implementar. Sin roadmap obligatorio de migrations por ahora.

**Rationale:** Protege datos locales y evita cambios de esquema silenciosos en prod.

### VI. Calidad Gradual con Tests Obligatorios

La deuda de tests en código legacy queda ratificada y no bloquea entregas.
Features nuevas MUST incluir tests (unitarios y/o e2e con Jest); `plan.md` define
cuál aplica. Bugfixes que toquen `service` o `controller` MUST incluir test mínimo
del cambio. Sin umbral numérico de cobertura.

**Rationale:** Mejora incremental sin exigir remediación masiva retroactiva.

### VII. Respuestas API Estandarizadas (código nuevo)

Endpoints nuevos MUST responder con envelope `{ data: T }`.
Endpoints legacy con formatos inconsistentes se estandarizan al modificar el módulo
(política gradual).

**Rationale:** Contrato predecible para el frontend sin big-bang en APIs existentes.

### VIII. Simplicidad (YAGNI)

TypeScript estricto; prohibido `any` en código nuevo o modificado.
Fechas con `dayjs`. DTOs con `class-validator` y `class-transformer`.

**Rationale:** Mantener el codebase legible y alineado con el stack actual.

## Restricciones Técnicas

- **Runtime:** NestJS v10, TypeScript v5, Node LTS.
- **Deploy:** PostgreSQL en Neon + aplicación en Render.
- **Validación:** `ValidationPipe` global en `main.ts`.
- **Seeders:** no ejecutar en cada bootstrap; solo con flag explícita en `envs`.
- **CI/CD:** sin gates obligatorios por ahora.
- **Guía operativa:** `.cursor/SaphireSouvenirs-Backend-Rules.mdc` complementa esta
  constitución; en conflicto gana la regla más específica al dominio afectado cuando
  no contradiga principios fundamentales.

## Workflow SDD

Para cualquier cambio en el repositorio (incluido `src/`, config, docs,
`package.json`, `typeOrm`, `envs`):

1. `/speckit-specify` — definición funcional (`spec.md`)
2. `/speckit-clarify` — obligatorio antes de planificar
3. `/speckit-plan` — diseño técnico (`plan.md`) con Constitution Check
4. `/speckit-tasks` — checklist atómica (`tasks.md`)
5. `/speckit-analyze` — siempre obligatorio; no implementar con issues CRITICAL
6. `/speckit-implement` — ejecución guiada por `tasks.md`

**Layout de features:**

```text
specs/<###-feature-name>/
├── spec.md
├── plan.md
├── tasks.md
└── contracts/    # cuando aplique (Phase 1 del plan)
```

## Prohibitions

- Usar `process.env` en `src/`
- Usar `any` en código nuevo o modificado
- Hardcodear secrets, tokens o credenciales
- Escribir código sin `spec.md` + `plan.md` + `tasks.md` aprobados
- Saltar `/speckit-clarify` o `/speckit-analyze`
- `dropSchema: true` en cualquier entorno
- `synchronize: true` en producción o staging
- Exponer endpoints públicos sin justificación en `spec.md`
- Nuevos endpoints sin envelope `{ data: T }`
- Modificar `@Entity` sin aviso en `plan.md` y sin OK explícito de Agustin Malugani
- Omitir decoradores `@nestjs/swagger` en features nuevas
- Entregar features o bugfixes aplicables sin tests cuando corresponda
- Revertir typos legacy corregidos (`typeOrm.config.ts`, `InProcess`, etc.)
- Introducir capas UseCase/Domain sin aprobación en `plan.md`

## AI Protocol

El agente MUST NOT modificar archivos del proyecto sin completar el workflow SDD.
No hay excepciones por tamaño del cambio ni por tipo de archivo (config, docs,
dependencias, una línea, etc.). Implementación y cambios de infraestructura solo
tras `tasks.md` aprobado y `/speckit-analyze` sin issues CRITICAL.

## Governance

- Cambios a esta constitución requieren aprobación explícita de Agustin Malugani.
- La constitución es la referencia de gobernanza SDD del repositorio.
- Reglas MDC más específicas prevalecen en su dominio cuando no contradigan
  principios fundamentales.
- **Versionado:** MAJOR para cambios incompatibles de gobernanza; MINOR para nuevos
  principios o secciones; PATCH para clarificaciones sin cambio semántico.
- **Cumplimiento:** Todo `plan.md` MUST incluir Constitution Check antes de Phase 0.

**Version**: 1.0.0 | **Ratified**: 2026-06-13 | **Last Amended**: 2026-06-13 | **Authority**: Agustin Malugani
