// POST /api/stripe-webhook
// Stripe calls this after events (payments, subscriptions). We verify the
// signature against the raw body, then fulfill the order.
//
// IMPORTANT: bodyParser is disabled so we can read the exact raw bytes Stripe
// signed. Set STRIPE_WEBHOOK_SECRET (from `stripe listen` locally, or the
// endpoint's signing secret in the Dashboard) in the environment.

import Stripe from 'stripe';
import { readRawBody, sendJson } from './_lib/util.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!process.env.STRIPE_SECRET_KEY || !secret) {
    return sendJson(res, 500, { error: 'Webhook not configured.' });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let event;
  try {
    const raw = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    // Signature failed = don't trust it. 400 tells Stripe to retry.
    console.error('[webhook] signature verification failed:', err && err.message);
    return sendJson(res, 400, { error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // For one-off payments this fires once payment is confirmed. For
        // subscriptions it fires when the subscription is created.
        await fulfillOrder(stripe, session);
        break;
      }
      case 'invoice.paid': {
        // Recurring supporter renewals land here — extend access here.
        // const invoice = event.data.object;
        break;
      }
      case 'customer.subscription.deleted': {
        // A supporter cancelled — revoke access here.
        // const subscription = event.data.object;
        break;
      }
      default:
        // Unhandled events are fine to acknowledge.
        break;
    }
  } catch (err) {
    console.error('[webhook] handler error:', err && err.message);
    return sendJson(res, 500, { error: 'Fulfillment error' });
  }

  return sendJson(res, 200, { received: true });
}

// ---------------------------------------------------------------------------
// Fulfillment. The Stripe half is real and complete; the delivery half needs
// external services this project doesn't have keys for yet. Each integration
// point is marked so it's a one-function drop-in, not a rewrite.
// ---------------------------------------------------------------------------
async function fulfillOrder(stripe, session) {
  const meta = session.metadata || {};
  const email = session.customer_details?.email || session.customer_email || null;
  const kind = meta.kind;

  console.log('[fulfill]', {
    item: meta.item, kind, email,
    amount_total: session.amount_total, currency: session.currency,
    session: session.id,
  });

  switch (kind) {
    case 'digital':
      // TODO(email): send the paid PDF (or a signed, expiring download link)
      // to `email` via your email provider (e.g. Resend/SendGrid) + object
      // storage. e.g. await sendGuideEmail(email, meta.item);
      break;
    case 'ticket':
      // TODO(booking): record the booking (name/notes/allergies live in
      // `meta`) in your CMS/DB and email a confirmation with event details.
      break;
    case 'physical':
      // TODO(fulfilment): notify studio to ship the small edition; shipping
      // address is on `session` (retrieve with shipping_details).
      break;
    case 'gift':
      // TODO(gift): generate a gift code and email it to the purchaser.
      break;
    case 'donation':
      // TODO(receipt): thank the donor; tally toward the current cause.
      break;
    case 'membership':
      // TODO(access): grant supporter access (paid Table Letter / Table Notes)
      // keyed to the subscription customer.
      break;
    default:
      break;
  }
}
