# Quickstart: Validar 001-db-config-hardening

Guía para verificar manualmente la feature después de `/speckit-implement`.

## Prerequisites

- `.env` configurado desde `.env.example`
- PostgreSQL accesible (`DATABASE_URL`)
- `npm install` ejecutado

## 1. Tests unitarios (sin DB)

```bash
npm test -- resolveRuntimeConfig
```

**Esperado**: Todos los casos de la matriz en `contracts/runtime-config.md` pasan.

## 2. Arranque sin seed (default)

`.env`:

```env
NODE_ENV=development
DB_SYNCHRONIZE=true
SEED_ON_STARTUP=false
```

```bash
npm run start:dev
```

**Esperado**:

- App arranca sin errores
- **No** aparecen logs "categorias cargadas" / "Productos cargado" / "Admin cargado"
- Reiniciar 2 veces: datos previos en DB se mantienen (no drop schema)

## 3. Arranque con seed explícito

`.env`:

```env
SEED_ON_STARTUP=true
```

Reiniciar `start:dev`.

**Esperado**: Logs de seeders presentes; categorías/admin creados si no existían.

## 4. Simular producción (sync y seed forzados off)

`.env`:

```env
NODE_ENV=production
DB_SYNCHRONIZE=true
SEED_ON_STARTUP=true
```

```bash
npm run build && npm run start:prod
```

**Esperado**:

- App arranca
- Sin ejecución de seeders
- Opcional: log de advertencia por `SEED_ON_STARTUP` ignorado
- Esquema no sincronizado automáticamente (sin alteraciones por synchronize)

## 5. Render checklist

En el dashboard de Render, confirmar:

- `NODE_ENV=production`
- `SEED_ON_STARTUP` ausente o `false`
- `DB_SYNCHRONIZE` ausente o `false` (efectivo siempre off en prod)

## Referencias

- Matriz completa: [contracts/runtime-config.md](./contracts/runtime-config.md)
- Variables: [data-model.md](./data-model.md)
