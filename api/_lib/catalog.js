// =============================================================================
// REMIXED TABLE — server-side price catalog (the single source of truth)
//
// The browser NEVER sends a price. It sends only an `item` key (and, for a few
// donation-style items, a customer-chosen amount within enforced bounds). The
// server looks the price up here, so a tampered client cannot change what is
// charged.
//
// Amounts are in MAJOR currency units (whole US$). Stripe wants the smallest
// unit, so `unitAmountMinor()` multiplies by 100 (USD cents). Keep catalog
// values as integers (whole dollars).
// =============================================================================

export const CURRENCY = 'usd';

// mode: 'payment' = one-off · 'subscription' = recurring
export const CATALOG = {
  // ---- Event tickets (one-off) ------------------------------------------
  'ticket-inner-landscapes': {
    mode: 'payment',
    name: 'Inner Landscapes — Adult Art Night',
    description: 'Saturday, 12 September 2026 · 7:00–9:30 PM',
    amount: 38,
    kind: 'ticket',
    maxQuantity: 6,
  },
  'ticket-salient-series': {
    mode: 'payment',
    name: 'Salient — Shadows & Edges',
    description: '4 Saturdays · Ages 7–10 · materials included',
    amount: 115,
    kind: 'ticket',
    maxQuantity: 4,
  },
  'ticket-family-session': {
    mode: 'payment',
    name: 'At the Same Table — Family Session',
    description: 'Sunday, 28 September 2026 · All ages',
    amount: 25,
    kind: 'ticket',
    maxQuantity: 8,
  },

  // ---- Paid field guides & digital products (one-off, delivered digitally)
  'guide-salient-at-home': {
    mode: 'payment', name: 'Salient at Home', description: 'Printable field guide (PDF)',
    amount: 6, kind: 'digital', maxQuantity: 1,
  },
  'guide-onus-educators': {
    mode: 'payment', name: 'Onus for Educators', description: 'Framework & unit-planning kit (PDF)',
    amount: 10, kind: 'digital', maxQuantity: 1,
  },
  'guide-inner-landscapes-deck': {
    mode: 'payment', name: 'Inner Landscapes Prompt Deck', description: 'Printable prompt deck (PDF)',
    amount: 7, kind: 'digital', maxQuantity: 1,
  },
  'kit-family-sketchbook': {
    mode: 'payment', name: 'Family Sketchbook Starter Kit', description: 'Digital starter kit',
    amount: 8, kind: 'digital', maxQuantity: 1,
  },
  'prompt-salient-pack': {
    mode: 'payment', name: 'Salient Prompt Pack', description: 'Downloadable prompt pack',
    amount: 6, kind: 'digital', maxQuantity: 1,
  },
  'workshop-recording': {
    mode: 'payment', name: 'Workshop Recording', description: 'On-demand recording',
    amount: 5, kind: 'digital', maxQuantity: 1,
  },
  'seasonal-pack': {
    mode: 'payment', name: 'Seasonal Creative Activity Pack', description: 'Downloadable activity pack',
    amount: 6, kind: 'digital', maxQuantity: 1,
  },
  'zine-recipe-drawing': {
    mode: 'payment', name: 'Recipe & Drawing Mini-Zine', description: 'Small edition (print)',
    amount: 12, kind: 'physical', maxQuantity: 10, shipping: true,
  },
  'prompt-cards': {
    mode: 'payment', name: 'Prompt Cards', description: 'Small edition (print)',
    amount: 10, kind: 'physical', maxQuantity: 10, shipping: true,
  },

  // ---- Gift card & charity donation (customer-chosen amount) -------------
  'gift-card': {
    mode: 'payment', name: 'Gift a Visit — Gift Card', description: 'Give a place at the table',
    kind: 'gift', allowCustomAmount: true, minAmount: 10, maxAmount: 500, maxQuantity: 1,
  },
  'imaginary-worlds-donation': {
    mode: 'payment', name: 'Imaginary Worlds — Charity Edition', description: 'Support the current cause',
    kind: 'donation', allowCustomAmount: true, minAmount: 5, maxAmount: 1000, maxQuantity: 1,
  },

  // ---- Membership (recurring) -------------------------------------------
  'supporter-monthly': {
    mode: 'subscription', name: 'The Table Letter — Paid Supporter',
    description: 'Monthly supporter membership',
    amount: 6, interval: 'month', kind: 'membership', maxQuantity: 1,
  },
};

export function getItem(key) {
  return Object.prototype.hasOwnProperty.call(CATALOG, key) ? CATALOG[key] : null;
}

export function unitAmountMinor(majorUnits) {
  // USD is a 2-decimal currency in Stripe: smallest unit = 1 cent = 1/100 $.
  return Math.round(Number(majorUnits) * 100);
}

// Clamp a requested quantity to [1, item.maxQuantity].
export function safeQuantity(item, requested) {
  const q = Math.floor(Number(requested) || 1);
  const max = item.maxQuantity || 1;
  return Math.min(Math.max(q, 1), max);
}

// For gift/donation items: validate the customer-chosen amount (in major units).
export function safeCustomAmount(item, requested) {
  const a = Math.floor(Number(requested));
  if (!Number.isFinite(a)) return null;
  if (a < item.minAmount || a > item.maxAmount) return null;
  return a;
}
