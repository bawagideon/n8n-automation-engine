/**
 * AutoOps Serverless Proxy Hook: /api/hook/[key]
 * Enforces key allowlist, CORS headers, honeypot validation, rate limiting, and secret forwarding.
 * NEVER exposes n8n credentials or Railway URLs to the client browser.
 */

const ALLOWED_KEYS = new Set([
  'inquiry',
  'cv',
  'booking',
  'transcript',
  'payment',
  'stock',
  'debt',
  'chat',
  'voice',
  'outbound',
  'content',
  'email',
  'error'
]);

// In-memory rate limiting map for basic protection on serverless instances
const rateLimitMap = new Map();

function isRateLimited(ip, limit = 15, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  record.count += 1;
  rateLimitMap.set(ip, record);

  return record.count > limit;
}

export default async function handler(req, res) {
  // 1. CORS Preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-autoops-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Extract and validate key
  const { key } = req.query;
  if (!key || !ALLOWED_KEYS.has(key)) {
    return res.status(400).json({ error: 'Invalid or unauthorized automation key' });
  }

  // 3. Honeypot check (bot prevention)
  const body = req.body || {};
  if (body._hp || body.website_url) {
    return res.status(200).json({ status: 'ok', filtered: true });
  }

  // 4. Rate Limiting by IP
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anonymous';
  if (isRateLimited(clientIp, 20, 60 * 60 * 1000)) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Maximum 20 requests per hour per visitor.',
      retryAfterSeconds: 3600
    });
  }

  // 5. Payload size cap (e.g. 2.5 MB)
  const rawBodyLength = JSON.stringify(body).length;
  if (rawBodyLength > 2.5 * 1024 * 1024) {
    return res.status(413).json({ error: 'Payload too large. Maximum size is 2MB.' });
  }

  // 6. Forward to upstream n8n Railway instance if configured
  const n8nBase = process.env.N8N_BASE_URL;
  const n8nSecret = process.env.N8N_HOOK_SECRET;

  if (n8nBase) {
    try {
      const upstreamUrl = `${n8nBase.replace(/\/$/, '')}/webhook/${key}`;
      const response = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-autoops-secret': n8nSecret || ''
        },
        body: JSON.stringify({
          ...body,
          proxiedAt: Date.now(),
          clientIp
        })
      });

      const data = await response.json().catch(() => ({ status: 'ok' }));
      return res.status(response.status).json(data);
    } catch (err) {
      console.error('[AutoOps Proxy Error]:', err);
      return res.status(502).json({
        error: 'Upstream automation webhook unreachable',
        details: err.message
      });
    }
  }

  // Fallback simulation acknowledgment if N8N_BASE_URL is not set yet
  return res.status(200).json({
    status: 'simulated',
    key,
    message: 'Proxied in simulation mode. Set N8N_BASE_URL in Vercel to route to Railway.',
    timestamp: Date.now()
  });
}
