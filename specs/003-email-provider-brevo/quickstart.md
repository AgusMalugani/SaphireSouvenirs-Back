# Quickstart: Validar 003-email-provider-brevo

Guía post-implementación para verificar migración a Brevo.

## Prerequisites

- Cuenta Brevo con API key activa
- Sender o dominio verificado para `EMAIL_FROM`
- `.env` actualizado desde `.env.example`
- `npm install` tras remover deps nodemailer

## 1. Variables `.env` locales

```env
BREVO_API_KEY=xkeysib-...
EMAIL_FROM=noreply@tudominio.com
EMAIL_CC=operador@example.com
```

Eliminar: `NODEMAILER_USER`, `NODEMAILER_PASS`, `NODEMAILER_FROM`, `NODEMAILER_CC`.

## 2. Tests unitarios (sin API real)

```bash
npm test -- brevo-email.sender
npm test -- orders.service
npm test
```

**Esperado**: Todos pasan; `fetch` mockeado en tests Brevo.

## 3. Arranque local

```bash
npm run start:dev
```

**Esperado**: App arranca sin error Zod; sin import de nodemailer.

## 4. Pedido de prueba local

Confirmar pedido desde front o curl a `POST /api/v1/orders`.

**Esperado**:

- Respuesta rápida (<3s) con orden creada
- Log: `Order confirmation email sent for <orderId>: <messageId>`
- Mail en bandeja cliente + CC

## 5. Simular fallo Brevo

Temporalmente usar `BREVO_API_KEY=invalid` y reiniciar.

**Esperado**:

- Pedido se crea igual
- Log `warn` con `orderId`
- Sin HTTP 500 en POST /orders

Restaurar API key válida después.

## 6. Deploy Render checklist

En dashboard Render, configurar:

| Variable | Acción |
|----------|--------|
| `BREVO_API_KEY` | Agregar (secret) |
| `EMAIL_FROM` | Agregar (email verificado Brevo) |
| `EMAIL_CC` | Agregar |
| `NODEMAILER_*` | **Eliminar** las 4 variables |

Redeploy → compra de prueba en Vercel.

**Esperado**:

- Toast "Orden creada ✅" + `/postShop/:id`
- Mail recibido en prod (SC-001)

## 7. Auditoría post-migración

```bash
rg "nodemailer|Nodemailer" src/
rg "nodemailer" package.json
```

**Esperado**: 0 matches en `src/`; sin `nodemailer` en dependencies.

## Referencias

- Contrato v2: [contracts/email-sender.md](./contracts/email-sender.md)
- Env vars: [data-model.md](./data-model.md)
- Decisiones: [research.md](./research.md)
