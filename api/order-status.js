// GET /api/order-status?session_id=cs_...
// Used by success.html to show a real confirmation of what was purchased.
// Returns only safe, non-sensitive summary fields.

import Stripe from 'stripe';
import { sendJson } from './_lib/util.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return sendJson(res, 500, { error: 'Not configured' });
  }

  const url = new URL(req.url, 'http://localhost');
  const sessionId = url.searchParams.get('session_id');
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return sendJson(res, 400, { error: 'Missing or invalid session_id' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });
    const line = session.line_items?.data?.[0];
    return sendJson(res, 200, {
      status: session.status,               // 'complete' | 'open' | 'expired'
      paid: session.payment_status === 'paid' || session.status === 'complete',
      email: session.customer_details?.email || null,
      itemName: line?.description || session.metadata?.item || null,
      kind: session.metadata?.kind || null,
      amountTotal: session.amount_total,
      currency: session.currency,
      mode: session.mode,
    });
  } catch (err) {
    console.error('[order-status]', err && err.message);
    return sendJson(res, 404, { error: 'Order not found' });
  }
}
