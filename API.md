# Soul Economy API — one owned backend for the shop + the family

The FamilyRoom WebSocket chat and the store API run from the SAME process
(`server.mjs`) on Render at:

```
https://family-chat-qb18.onrender.com
```

## Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/` `/healthz` | liveness ("FamilyChat room alive") — keepalive target |
| GET | `/api/v1/meta` | version + what's configured |
| GET | `/api/v1/products` | all active products (cache 5 min) |
| GET | `/api/v1/products/:slug` | one product |
| POST | `/api/v1/checkout` | create Stripe Checkout session → `{url}` |
| POST | `/api/v1/mint-free` | free license for a slug ($0 order, no card) |
| POST | `/api/v1/webhooks/stripe` | Stripe event → marks order paid + mints licenses |
| POST | `/api/v1/webhooks/solana` | Helius webhook → marks order paid (memo `soul:<order-uuid>`) |
| GET | `/api/v1/orders/:id` | order status + license keys (paid only) |
| POST | `/api/v1/profile` | upsert profile from Supabase JWT (social) |

## Checkout flow

1. Browser sends `{items:[{slug, qty, cents}], return_to}` to `/api/v1/checkout`.
2. Server validates against Supabase, creates the Stripe session, redirects the
   buyer to `session.url`, and stores a pending `orders` row.
3. Stripe (or Helius) webhook marks the order paid and mints
   `BUYASOUL-XXXX-XXXX-XXXX-XXXX` license keys into `orders.licenses`.
4. Buyer lands back on `?shop=thanks&order=<id>`; the page polls
   `/api/v1/orders/<id>` until `status: paid`, then shows the keys.

`cents` is the pay-what-you-want amount per item. Products in `fixed` mode
ignore it. Free minting goes through `/api/v1/mint-free` (no card required).

## Env vars

See `.env.example`. The Render dashboard is the live source. `STRIPE_SECRET_KEY`
and the service key are secrets — never commit, never ship to the browser.

## Reprovision (Render Blueprint)

`render.yaml` describes the exact service. The live service already matches it.

## Seed / resync (GitHub Actions)

`.github/workflows/seed.yml` upserts `data/catalog.json` (282 items) nightly and
on demand. Needs repo secrets `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`.

## Schema

`schema.sql` — run it once in the Supabase SQL Editor, then seed.