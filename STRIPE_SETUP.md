# Stripe payments — setup

Payments run through **Stripe Checkout** (Stripe-hosted payment pages) with
**Vercel serverless functions**. Your secret key stays in a server env var —
it never appears in the browser, the code, or this repo. Card details are
entered only on Stripe's own page.

> **Do not paste your secret key into chat, code, or a committed file.** You add
> it yourself in the two places below. Only the *publishable* key would ever be
> safe client-side, and this setup doesn't even need that.

## What's included

| File | Role |
|---|---|
| `api/create-checkout-session.js` | Builds a Checkout Session and returns its URL |
| `api/stripe-webhook.js` | Verifies Stripe's signature, runs fulfillment |
| `api/order-status.js` | Lets `success.html` show what was purchased |
| `api/_lib/catalog.js` | **Server-side price list — the source of truth** |
| `assets/js/checkout.js` | Wires buttons/forms → redirect to Stripe |
| `success.html` / `canceled.html` | Post-checkout pages |

Prices live only in `api/_lib/catalog.js`. The browser sends an item *key*, never
a price, so a tampered client can't change what's charged. Amounts are whole US$.

## 1. Install

```bash
cd remixed-table
npm install
```

## 2. Get your keys (test mode first)

In the Stripe Dashboard, toggle **Test mode** (top right), then
**Developers → API keys** → copy the **Secret key** (`sk_test_…`).

## 3. Local development

Create `.env.local` (already git-ignored) from the example:

```bash
cp .env.example .env.local
```

Fill in `STRIPE_SECRET_KEY=sk_test_…`. For the webhook secret, run the Stripe
CLI in a second terminal — it prints a `whsec_…` and forwards events locally:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

Put that `whsec_…` into `.env.local` as `STRIPE_WEBHOOK_SECRET`, then run the
site with the Vercel dev server (serves the static pages **and** the functions):

```bash
npx vercel dev
```

Open the printed URL, go to **Shop** or **Visits**, click a buy/reserve button —
you'll land on Stripe Checkout. Pay with test card **4242 4242 4242 4242**, any
future expiry, any CVC, any postal code.

## 4. Deploy to Vercel

1. Push this repo to GitHub and **Import** it in Vercel (framework preset:
   *Other* — it's static + functions, no build step).
2. **Project → Settings → Environment Variables**, add:
   - `STRIPE_SECRET_KEY` = your `sk_test_…` (swap to `sk_live_…` when live)
   - `STRIPE_WEBHOOK_SECRET` = filled in step 5
3. Deploy.

## 5. Production webhook

In the Dashboard: **Developers → Webhooks → Add endpoint**
- URL: `https://YOUR-DOMAIN/api/stripe-webhook`
- Events: `checkout.session.completed`, `invoice.paid`,
  `customer.subscription.deleted`
- Copy the endpoint's **Signing secret** (`whsec_…`) into the Vercel env var
  `STRIPE_WEBHOOK_SECRET`, then redeploy.

## 6. Go live

- Complete Stripe onboarding (business details / payout bank account).
- Replace the test keys with **live** keys (`sk_live_…`) in Vercel and add a
  **live-mode** webhook endpoint + its signing secret.
- Do one real low-value purchase to confirm end-to-end.

## Changing prices / adding products

Edit `api/_lib/catalog.js` (whole US$ amounts). To add a button anywhere:

```html
<button data-checkout-item="guide-onus-educators">Buy — $10</button>
```

Customer-chosen amounts (gift cards / donations) use bounds from the catalog:

```html
<input id="gift-amt" type="number">
<button data-checkout-item="gift-card" data-amount-input="#gift-amt">Gift</button>
```

## Still to wire (needs external services, not Stripe)

The Stripe half is complete. Fulfillment side-effects have clearly marked
`TODO`s in `api/stripe-webhook.js → fulfillOrder()`:

- **Paid PDF delivery** — needs an email provider (e.g. Resend/SendGrid) + file
  storage to email a download link for `kind: 'digital'` orders.
- **Booking records / confirmations** — write `kind: 'ticket'` orders (name,
  allergies, etc. are in `session.metadata`) to a CMS/DB and email details.
- **Supporter access** — grant/revoke on `membership` subscription events.

Tell me which of these to build next and I'll wire it in.

## Note on the webhook raw body

`api/stripe-webhook.js` disables body parsing (`export const config = { api: {
bodyParser: false } }`) so the exact bytes Stripe signed reach
`constructEvent`. If signature verification ever fails in production, confirm
the platform isn't pre-parsing the body for that route.
