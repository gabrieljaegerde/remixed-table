// POST /api/create-checkout-session
// Body: { item: <catalog key>, quantity?, amount?, customer?, metadata? }
// Returns: { url } — the Stripe-hosted Checkout page to redirect the browser to.
//
// The secret key is read from process.env.STRIPE_SECRET_KEY and is never sent
// to the client. Prices come from the server catalog, not the request.

import Stripe from 'stripe';
import {
  getItem, unitAmountMinor, safeQuantity, safeCustomAmount, CURRENCY,
} from './_lib/catalog.js';
import { readJson, baseUrl, sendJson, cleanMetadata } from './_lib/util.js';

const METADATA_KEYS = [
  'name', 'phone', 'participantAge', 'notes', 'emergencyContact',
  'giftRecipient', 'giftMessage', 'eventDate',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return sendJson(res, 500, { error: 'Payments are not configured yet.' });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let body;
  try { body = await readJson(req); } catch { body = {}; }

  const item = getItem(body.item);
  if (!item) return sendJson(res, 400, { error: 'Unknown item.' });

  // ---- Resolve the amount (catalog fixed price, or bounded custom amount) --
  let unitAmount;
  if (item.allowCustomAmount) {
    const chosen = safeCustomAmount(item, body.amount);
    if (chosen == null) {
      return sendJson(res, 400, {
        error: `Amount must be between $${item.minAmount} and $${item.maxAmount}.`,
      });
    }
    unitAmount = unitAmountMinor(chosen);
  } else {
    unitAmount = unitAmountMinor(item.amount);
  }

  const quantity = safeQuantity(item, body.quantity);
  const origin = baseUrl(req);

  // ---- Build the line item ------------------------------------------------
  const priceData = {
    currency: CURRENCY,
    product_data: { name: item.name, description: item.description || undefined },
    unit_amount: unitAmount,
  };
  if (item.mode === 'subscription') {
    priceData.recurring = { interval: item.interval || 'month' };
  }

  const metadata = {
    item: body.item,
    kind: item.kind,
    ...cleanMetadata(body.metadata, METADATA_KEYS),
  };

  const params = {
    mode: item.mode,
    line_items: [{ price_data: priceData, quantity }],
    success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/canceled.html`,
    metadata,
    // Let customers get a Stripe receipt / manage their subscription by email.
    ...(item.mode === 'payment' ? { payment_intent_data: { metadata } } : {}),
    ...(item.mode === 'subscription' ? { subscription_data: { metadata } } : {}),
  };

  // Collect an email so fulfillment (PDF delivery / booking confirmation) has
  // somewhere to go. If the client already knows it, prefill it.
  const email = body.customer && typeof body.customer.email === 'string'
    ? body.customer.email.slice(0, 200) : null;
  if (email) params.customer_email = email;

  // Physical small editions need a shipping address.
  if (item.shipping) {
    params.shipping_address_collection = { allowed_countries: ['TW'] };
  }

  try {
    const session = await stripe.checkout.sessions.create(params);
    return sendJson(res, 200, { url: session.url });
  } catch (err) {
    // Log server-side; return a safe message to the browser.
    console.error('[create-checkout-session]', err && err.message);
    return sendJson(res, 502, { error: 'Could not start checkout. Please try again.' });
  }
}
