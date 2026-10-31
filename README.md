<div align="center">

# Veyro

### A modern full-stack fashion store

Browse the collection, save favorites, manage a cart, and complete secure payments with Stripe.
Veyro pairs a responsive Next.js storefront with a NestJS API and an admin dashboard.
Authentication is built on the [nestjs-jwt-redis-auth](https://github.com/spikedeeev/nestjs-jwt-redis-auth) project.

<p>
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-149eca?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/NestJS-12-ea2845?logo=nestjs" alt="NestJS 12" />
  <img src="https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-4169e1?logo=postgresql" alt="PostgreSQL 17" />
  <img src="https://img.shields.io/badge/Stripe-Checkout-635bff?logo=stripe" alt="Stripe Checkout" />
</p>

[Features](#features) · [Technology](#technology) · [Getting started](#getting-started) · [Payments](#stripe-test-payments) · [Documentation](#documentation)

</div>

---

## Features

### Storefront

- **Product discovery** — browse categories and brands; search, filter, sort, and paginate the catalog.
- **Product pages** — image gallery, size/color availability, stock-aware quantities, ratings, and reviews.
- **Quick add** — choose an in-stock size and color and add an item directly from a product card.
- **Favorites** — save products to a personal list and remove them when you like.
- **Shopping cart** — change quantities, remove items, clear the cart, and review the total.
- **Checkout** — submit a shipping address, create an order, and continue to hosted Stripe Checkout.
- **Order history** — view order details and status; pay pending orders or cancel them when allowed.
- **Account security** — password reset by email, active session review and revocation, and recent security activity.
- **Responsive interface** — mobile-friendly product browsing, account pages, and admin lists.

### Admin dashboard

- **Products** — search and manage products, create drafts, edit descriptions and prices, and publish or unpublish.
- **Images** — upload and remove product photos, reorder them, and choose the primary image.
- **Variants and inventory** — manage size/color combinations and stock counts.
- **Categories and brands** — create, rename, and delete catalog classifications.
- **Orders** — filter by status and progress orders through valid fulfillment transitions.
- **Users** — search accounts, filter by role, and view registration dates and order counts.

Publishing a product requires at least three images. Admin API routes are protected by JWT authentication and the `ADMIN` role.

## Technology

| Area | Technologies |
| --- | --- |
| Storefront | Next.js 16 App Router, React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui-style components, Radix UI, Lucide icons |
| Client state and API | TanStack Query, same-origin Next.js rewrites |
| Backend | NestJS 12, TypeScript, REST API, Swagger/OpenAPI |
| Database | PostgreSQL 17, Prisma 7 |
| Sessions and security | Redis 7, JWT access tokens, rotating refresh sessions, CSRF protection, bcrypt |
| Payments and email | Stripe Checkout and signed webhooks, Nodemailer, Mailpit for local email |
| Local infrastructure | Docker Compose |

## Getting started

### Prerequisites

- Node.js 22 or later and npm
- Docker Desktop with Docker Compose
- Stripe CLI (only needed to test local payment webhooks)

### 1. Configure environment files

From the repository root, create the Compose environment file:

```powershell
Copy-Item .env.example .env
```

Set a unique `POSTGRES_PASSWORD` in the root `.env`. Then create the backend environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

Set unique `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values in `backend\.env`. For local development, the example values for the database connection, Redis, Mailpit, and frontend URL are already configured. Keep real secrets in ignored `.env` files; never commit them.

### 2. Start the backend and infrastructure

From the repository root:

```powershell
docker compose up --build -d
docker compose ps
```

Compose starts PostgreSQL, Redis, Mailpit, and the NestJS API. The backend applies Prisma migrations before starting. The API and Swagger UI are available at:

- API: <http://localhost:3000>
- Swagger: <http://localhost:3000/api/docs>
- Mailpit inbox: <http://localhost:8025>

Follow backend logs with `docker compose logs -f backend`.

### 3. Start the storefront

In a second terminal:

```powershell
Set-Location frontend
npm ci
npm run dev
```

Open <http://localhost:5173>. The Next.js app proxies `/api/*` and `/uploads/*` to the backend at `http://localhost:3000` by default. To use another backend URL, set `BACKEND_URL` for the frontend before starting it.

For a production frontend build, run `npm run build` and then `npm run start` from `frontend`.

### 4. Seed sample catalog data (optional)

The base Prisma seed adds demo categories and brands:

```powershell
Set-Location backend
npm ci
npm run build
npm run seed
```

To load the larger sample product catalog, start the backend first and run the catalog script with credentials for an existing admin account:

```powershell
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = "your-admin-password"
node scripts/seed-catalog.mjs
```

The catalog script is idempotent and skips products that already exist by name.

## Stripe test payments

Use Stripe test keys first. In `backend\.env`, set:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=usd
```

Start a local webhook listener in another terminal:

```powershell
stripe login
stripe listen --events "checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired" --forward-to http://localhost:3000/payments/stripe/webhook
```

Copy the `whsec_...` value printed by the CLI into `STRIPE_WEBHOOK_SECRET`, then restart the backend so it reloads the environment. Keep the listener running while testing. Use Stripe's test card `4242 4242 4242 4242`, a future expiry date, and any CVC.

The checkout session is hosted by Stripe. A signed webhook confirms payment and updates the order. The storefront returns to the order page and refreshes its status while webhook confirmation arrives.

## Useful commands

| Task | Command | Directory |
| --- | --- | --- |
| Start backend and dependencies | `docker compose up --build -d` | Repository root |
| Stop containers (keep persistent data) | `docker compose down` | Repository root |
| Run backend in watch mode | `npm run start:dev` | `backend` |
| Build backend | `npm run build` | `backend` |
| Lint backend | `npm run lint` | `backend` |
| Run backend tests | `npm test` | `backend` |
| Start frontend in development | `npm run dev` | `frontend` |
| Type-check frontend | `npm run lint` | `frontend` |
| Build frontend | `npm run build` | `frontend` |

> **Data warning:** `docker compose down -v` deletes the persistent database, Redis, and uploaded-image volumes. Use it only when you intentionally want to remove local data.

## Documentation

- [Backend and API reference](docs/API.md) — endpoints, authentication, catalog, orders, reviews, and payments.
- [Postman collection](docs/clothingstore.postman_collection.json) — import into Postman to exercise the API.
- [Backend setup notes](backend/README.md) — backend configuration and development details.

## Security notes

- Do not commit `.env` files, API keys, webhook secrets, or production credentials.
- Use separate, randomly generated JWT secrets for access and refresh tokens.
- Keep Stripe test and live keys in the corresponding Stripe mode; never expose secret keys in frontend code.
- The Stripe webhook endpoint verifies the signature against the raw request body.
- Admin routes require a valid authenticated session and the `ADMIN` role.

