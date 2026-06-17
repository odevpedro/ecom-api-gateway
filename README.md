# ecom-api-gateway

> API Gateway centralizado para o ecossistema ecom — roteamento unificado, autenticação JWT e propagação de X-Request-ID.

## Roteamento

| Prefixo | Serviço | Porta | Auth |
|---------|---------|:-----:|:----:|
| `/api/products` | Product Catalog | 3001 | — |
| `/api/cart` | Cart Service | 3002 | — |
| `/api/orders` | Order Service | 3003 | — |
| `/api/payments` | Payment Service | 3004 | — |
| `/api/shipping` | Shipping Service | 3005 | — |
| `/invoices` | Invoice Service | 3006 | — |
| `/api/users/auth` | User Service (auth) | 3007 | — |
| `/api/users` | User Service (protegido) | 3007 | JWT |
| `/api/notifications` | Notification Service | 3008 | — |

## Setup

```bash
cp .env.example .env
npm install
npm start
```
