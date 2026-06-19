# Quickstart: Validar 002-order-email-decouple

Guía para verificar manualmente la feature después de `/speckit-implement`.

## Prerequisites

- `.env` con `NODEMAILER_*` y `URL_CLIENT` configurados
- PostgreSQL accesible (`DATABASE_URL`)
- `npm install` ejecutado
- Backend local en `http://localhost:3000`
- Frontend local o Vercel apuntando al API local (opcional para E2E manual)

## 1. Tests unitarios (sin DB ni SMTP)

```bash
npm test -- orders.service
```

**Esperado**:

- Caso feliz: orden retornada, mock `EmailSender` invocado
- Email mock falla: orden **no** eliminada; `create` resuelve
- Fallo persistencia: `create` rechaza; sin orden expuesta como exitosa

## 2. Checkout local — respuesta rápida

```bash
npm run start:dev
```

Confirmar pedido desde el front o vía curl:

```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d "{\"endOrder\":\"2026-07-01\",\"transactionType\":\"withdraw\",\"address\":\"test 123\",\"theme\":\"test\",\"nameClient\":\"Test\",\"personalizationName\":\"Test\",\"numCel\":\"3411111111\",\"num2Cel\":\"3412222222\",\"email\":\"tu-email@gmail.com\",\"products\":[{\"productId\":\"<UUID_PRODUCTO>\",\"cuantity\":1}]}"
```

**Esperado**:

- Respuesta HTTP en **< 3 segundos** con objeto `Order` (id, totalPrice, etc.)
- Orden visible en DB (Neon/local)
- Si Gmail configurado: mail puede llegar **después** de la respuesta HTTP

## 3. Simular fallo de email (dev)

Opción A — credenciales SMTP inválidas temporales en `.env`:

```env
NODEMAILER_PASS=invalid-for-test
```

Reiniciar y crear orden.

**Esperado**:

- POST responde exitosamente igual
- Log `warn` con `orderId` y error SMTP
- Orden permanece en DB
- Front navega a `/postShop/:id` (si probado con UI)

Restaurar credenciales válidas después.

## 4. Verificar transacción (error de producto)

Enviar `POST /orders` con `productId` inexistente.

**Esperado**:

- HTTP error (4xx/5xx según implementación)
- **No** queda orden huérfana en DB sin detalles válidos

## 5. Deploy Render — checkout producción

Tras deploy:

1. Confirmar pedido en `saphire-souvenirs-front.vercel.app`
2. Medir tiempo de respuesta del toast "Creando orden..."

**Esperado**:

- Toast "Orden creada ✅" en pocos segundos
- Navegación a `/postShop/:id`
- Orden en Neon
- Log Render: `warn` por SMTP timeout **sin** HTTP 500 en POST
- Mail puede **no** llegar (ETIMEDOUT) hasta feature 003 Resend

## 6. Checklist DI post-implement

```bash
# Ningún módulo fuera de nodemailer/ debe registrar implementaciones concretas de email
rg "NodemailerEmailSender|NodemailerService" src/modules --glob "*.module.ts"

# OrdersModule debe importar módulos, no duplicar EmailSender en providers
rg "EMAIL_SENDER|NodemailerModule|OrderdetailsModule" src/modules/orders/orders.module.ts
```

**Esperado**:

- `NodemailerEmailSender` registrado **solo** en `nodemailer.module.ts` vía token `EMAIL_SENDER`
- Cero referencias a `NodemailerService` en `src/` (clase eliminada)
- `OrdersModule` importa `NodemailerModule` y `OrderdetailsModule`; no registra implementaciones concretas de email en `providers`

## Referencias

- Contrato DI: [contracts/email-sender.md](./contracts/email-sender.md)
- Flujo transaccional: [data-model.md](./data-model.md)
- Decisiones: [research.md](./research.md)
