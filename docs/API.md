# Veyro API

Base URL: `http://localhost:3000`. Protected routes need `Authorization: Bearer <accessToken>` (obtained from `POST /auth/login`, valid 15 minutes). Admin routes need a user with role `ADMIN`: 401 without a token, 403 for a regular user.

## Auth

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/register` | `{ email, password }` |
| POST | `/auth/login` | returns `accessToken`, `csrfToken`, sets `refresh_token` and `csrf_token` cookies |
| POST | `/auth/refresh`, `/auth/logout` | cookies + header `X-CSRF-Token` |
| GET | `/auth/profile`, `/auth/admin`, `/auth/sessions`, `/auth/security-events`, `/auth/security-analysis` | Bearer (`/auth/admin` – ADMIN) |
| DELETE | `/auth/sessions/:sessionId` | Bearer |
| POST | `/auth/sessions/logout/all-other`, `/auth/sessions/revoke-suspicious` | Bearer |

## Catalog (public)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/products` | active products only, paged; see query below |
| GET | `/products/:id` | with `images`, `variants`, `category`, `brand` |
| GET | `/categories`, `/categories/:id` | |
| GET | `/brands`, `/brands/:id` | |
| GET | `/uploads/<file>` | stored product images |

`GET /products` query: `page`, `limit` (≤100), `categoryId`, `brandId`, `search` (name/description, case-insensitive), `minPrice`, `maxPrice`, `inStock=true` (at least one variant in stock), `sort` = `newest` (default) | `oldest` | `price_asc` | `price_desc` | `name_asc`.

## Admin: catalog management

| Method | Path | Body |
| --- | --- | --- |
| GET | `/products/admin`, `/products/admin/:id` | same query as public list, includes drafts |
| POST | `/products` | `{ name, price, description?, categoryId?, brandId?, isActive? }` – created as draft by default |
| PATCH | `/products/:id` | any of the fields above; `null` clears category/brand |
| DELETE | `/products/:id` | |
| POST | `/products/:id/images/import` | `{ images: [{ url, alt? }] }`, ≤10; only Unsplash/Pexels hosts (plus `IMAGE_IMPORT_HOSTS`) |
| POST | `/products/:id/images/upload` | multipart, field `files`, ≤10 files, 5 MB each |
| PUT | `/products/:id/images/order` | `{ imageIds: [...] }` – all ids of the product |
| DELETE | `/products/:id/images/:imageId` | |
| POST | `/products/:id/variants` | `{ size, color, stock }` – size+color unique per product |
| PATCH | `/products/:id/variants/:variantId` | any of the fields above |
| DELETE | `/products/:id/variants/:variantId` | |
| POST / PATCH / DELETE | `/categories`, `/brands` (`/:id`) | `{ name }`; deleting a used one returns 409 |

Publishing (`isActive: true`) requires at least 3 images, so: create a draft → add 3+ images → `PATCH { "isActive": true }`.

## Cart (Bearer)

| Method | Path | Body |
| --- | --- | --- |
| GET | `/cart` | items with variant/product and `total` |
| POST | `/cart/items` | `{ variantId, quantity }` – merges with an existing item; quantity must not exceed stock |
| PATCH | `/cart/items/:itemId` | `{ quantity }` |
| DELETE | `/cart/items/:itemId`, `/cart` | |

## Orders (Bearer)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/orders` | `{ shippingAddress }` – creates an order from the cart, reserves stock, empties the cart |
| GET | `/orders`, `/orders/:id` | own orders (`status`, `page`, `limit`) |
| POST | `/orders/:id/cancel` | own order, only while `PENDING`; stock is returned |
| GET | `/orders/admin`, `/orders/admin/:id` | ADMIN, all orders |
| PATCH | `/orders/admin/:id/status` | ADMIN, `{ status }` |

Statuses: `PENDING → PAID → SHIPPED → DELIVERED`; `PENDING`/`PAID` → `CANCELLED` (stock is returned). Other transitions return 400. Order items are snapshots (name, size, color, price), so history survives product edits and deletion.

## Favorites (Bearer)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/favorites` | active favorite products |
| PUT | `/favorites/:productId` | idempotent, 204 |
| DELETE | `/favorites/:productId` | 204 |

## Password reset (public)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/forgot-password` | `{ email }` – always 200 (no email enumeration); 3/min. Sends a link `FRONTEND_URL/reset-password?token=...` valid 1 hour |
| POST | `/auth/reset-password` | `{ token, password }` – one-time token; revokes all refresh sessions; sends a notification email |

Local emails are caught by Mailpit: http://localhost:8025 (SMTP `localhost:1025`). With empty `SMTP_HOST` emails are only logged.

## Reviews and rating

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/products/:productId/reviews` | public, paged, author is masked |
| POST | `/products/:productId/reviews` | Bearer, `{ rating 1-5, comment? }`; only buyers with a PAID/SHIPPED/DELIVERED order (else 403); one review per user (409) |
| PATCH / DELETE | `/products/:productId/reviews/mine` | own review |
| DELETE | `/reviews/:id` | ADMIN moderation |

Products expose `ratingAvg` and `ratingCount`. `GET /products` also accepts `minRating` and `sort=rating_desc`.

## Payments (Stripe Checkout)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/orders/:id/pay` | Bearer, own `PENDING` order → `{ checkoutUrl }` (redirect the browser to this hosted Stripe page; a new session is created on each call) |
| POST | `/payments/stripe/webhook` | called by Stripe (raw body + `stripe-signature` header); signature, amount and currency are verified; marks the order `PAID` |

Required env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY` (default `usd`). Locally run `stripe listen --forward-to localhost:3000/payments/stripe/webhook` and use the printed `whsec_...`; test card `4242 4242 4242 4242`. Unpaid `PENDING` orders are auto-cancelled after `ORDER_PAYMENT_TIMEOUT_MINUTES` (default 60, 0 = off) and stock is released. A payment for an already cancelled order is only logged and needs a manual refund.

## Misc

- Swagger UI: `/api/docs` (JSON `/api/docs-json`, disable with `SWAGGER_ENABLED=false`).
- Rate limit: `RATE_LIMIT_PER_MINUTE` (default 120) per IP; stricter on login/register (10/min), forgot-password (3/min). Set `TRUST_PROXY=true` behind a reverse proxy.
