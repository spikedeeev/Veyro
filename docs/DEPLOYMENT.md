# Production deployment (student demo)

This guide is for the `production` branch. The default `main` branch and the root Docker Compose setup remain the local-development path.

The example deployment uses Vercel for Next.js, Render for the NestJS Docker service, Neon for PostgreSQL, Upstash for Redis, and Cloudinary for uploaded product images. Free plans have quotas and can change; verify the provider's current pricing before creating resources. Render free services may sleep while idle. This setup is a demo, not a production availability or backup guarantee.

## 1. Push the production branch to GitHub

After reviewing and committing the branch locally, publish it:

```powershell
git push -u origin production
```

This does not merge or modify `main`. Connect the hosting services to the `production` branch.

## 2. Create the managed PostgreSQL database

1. Sign up at [Neon](https://console.neon.tech/signup) and create a project in a region near the backend.
2. Copy the PostgreSQL connection string. Use the direct (non-pooled) connection string for this small deployment because the backend applies Prisma migrations during startup.
3. Keep it private; set it as `DATABASE_URL` in Render. Neon connection strings normally include `sslmode=require`.

Do not put the live connection string in this repository or in Vercel.

## 3. Create managed Redis

1. Sign up at [Upstash](https://console.upstash.com/) and create a Redis database near the backend.
2. Copy the TLS connection URL (`rediss://...`) from the connection details. Do not copy the Redis REST URL or REST token.
3. Set this URL as `REDIS_URL` in Render.

The backend uses `REDIS_URL` when present. Without it, it retains the local `REDIS_HOST`/`REDIS_PORT` behavior used by Docker Compose.

## 4. Create persistent image storage

1. Sign up at [Cloudinary](https://cloudinary.com/users/register_free) and open the dashboard.
2. Copy the cloud name, API key, and API secret into Render as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
3. Configure all three values together. The backend then uploads product photos to the Cloudinary `veyro` folder and stores their HTTPS URLs in PostgreSQL.

If any one Cloudinary value is set without the other two, backend startup fails with a configuration error. If none are set, the app uses local disk storage, which is not persistent on a typical free web service. Never add Cloudinary credentials to frontend variables.

## 5. Deploy the backend on Render

1. Sign up at [Render](https://dashboard.render.com/register).
2. Choose **New → Web Service**, connect this GitHub repository, and select the `production` branch.
3. Select the **Docker** runtime. Set **Root Directory** to `backend`; use `Dockerfile` as the Dockerfile path.
4. Choose the free instance if available. Set the health check path to `/`; the API root responds without authentication.
5. Add the following service environment variables:

   | Variable | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Direct Neon PostgreSQL connection string |
   | `REDIS_URL` | Upstash TLS URL beginning with `rediss://` |
   | `JWT_ACCESS_SECRET` | New random secret |
   | `JWT_REFRESH_SECRET` | A different new random secret |
   | `JWT_ACCESS_EXPIRES` | `15m` |
   | `JWT_REFRESH_EXPIRES` | `30d` |
   | `PUBLIC_BASE_URL` | The public Render service URL, e.g. `https://veyro-api.onrender.com` |
   | `FRONTEND_URL` | Set after the Vercel deployment, e.g. `https://veyro.vercel.app` |
   | `CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard value |
   | `CLOUDINARY_API_KEY` | Cloudinary dashboard value |
   | `CLOUDINARY_API_SECRET` | Cloudinary dashboard value |
   | `TRUST_PROXY` | `true` |
   | `SWAGGER_ENABLED` | `false` |
   | `STRIPE_CURRENCY` | `usd` |

Generate JWT secrets on your computer by running this command twice and using two different results:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Let Render provide `PORT`; do not hard-code it. Do not set `SMTP_HOST` to `mailpit` in the hosted service. The included Dockerfile runs `prisma migrate deploy` before the NestJS server starts. Wait for the first deployment to complete, then copy its public URL into `PUBLIC_BASE_URL`.

For password-reset email, configure a real SMTP provider and add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, and a verified `MAIL_FROM` sender. If SMTP is omitted, emails are not delivered; Mailpit is only for local development.

## 6. Deploy the frontend on Vercel

1. Sign up at [Vercel](https://vercel.com/signup), choose **Add New → Project**, and import the same GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Add `BACKEND_URL` with the full Render service URL, without a trailing slash, for example `https://veyro-api.onrender.com`.
4. Deploy the project.
5. Copy the resulting Vercel URL and update Render's `FRONTEND_URL` to that exact origin. Redeploy/restart the backend.

The Next.js rewrites in `frontend/next.config.ts` proxy both `/api/*` and `/uploads/*` through the Vercel origin. This keeps authentication cookies same-origin; the browser should use the storefront URL, not call the Render API directly.

## 7. Configure Stripe test payments (optional)

1. Create a [Stripe](https://dashboard.stripe.com/register) account and enable **Test mode**.
2. Copy the test secret key (`sk_test_...`) to Render as `STRIPE_SECRET_KEY`.
3. In Stripe's test-mode webhook settings, add:

   ```text
   https://<your-render-host>/payments/stripe/webhook
   ```

4. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `checkout.session.expired`.
5. Copy the endpoint signing secret (`whsec_...`) to Render as `STRIPE_WEBHOOK_SECRET`, then redeploy the backend.
6. Test with Stripe's test card `4242 4242 4242 4242`, a future expiry date, and any CVC.

Use test keys only. Do not enable live payments for the student demo.

## 8. Create the first admin account

1. Register an account through the deployed storefront.
2. In Neon's SQL Editor, replace the email below with that account's exact email:

   ```sql
   UPDATE "User"
   SET role = 'ADMIN'
   WHERE email = 'your-account@example.com';
   ```

3. Sign out and sign back in, then visit `/admin`.
4. Create categories and brands, then add products. Published products require at least three images.

## Verify the deployment

- Open the Vercel URL and confirm the catalog loads.
- Register, sign in, and verify that the session remains active after navigation.
- As admin, upload and remove a product image; confirm the image URL uses Cloudinary.
- If Stripe is configured, place a test order and confirm the signed webhook updates its status.
- Check Render logs for startup, migration, database, Redis, and mail errors.

## Security and operations

- Enter service secrets only in Render's backend environment settings. The Vercel project should only need `BACKEND_URL`.
- Never commit `.env` files, API keys, database URLs, webhook signing secrets, or JWT secrets. If a secret was pushed to GitHub, revoke or rotate it.
- The root `docker-compose.yml` is for local development, not hosted production. Do not expose its PostgreSQL or Redis ports publicly.
- Free hosting may sleep, impose quotas, or change availability and pricing. Keep backups of any demo data or images that matter, and do not select a paid plan unless you intend to pay.
