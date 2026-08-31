// Small shared helpers for the serverless functions.

// Read the exact raw request bytes (needed for Stripe webhook signature
// verification, where any re-serialization would break the signature).
export async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// Parse a JSON body from a function where the platform did NOT pre-parse it.
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body; // already parsed
  const raw = await readRawBody(req);
  if (!raw.length) return {};
  try { return JSON.parse(raw.toString('utf8')); } catch { return {}; }
}

// Reconstruct the site's base URL from the incoming request (works on any
// Vercel deployment/preview without hardcoding a domain). SITE_URL overrides.
export function baseUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

// Keep only whitelisted, length-capped strings for Stripe metadata (max 500
// chars/value, 50 keys). Never trust arbitrary client input verbatim.
export function cleanMetadata(input, allowedKeys) {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const key of allowedKeys) {
    const v = input[key];
    if (v == null) continue;
    out[key] = String(v).slice(0, 450);
  }
  return out;
}
