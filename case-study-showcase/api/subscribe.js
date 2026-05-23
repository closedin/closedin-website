// /api/subscribe — proxy to Beehiiv API
// Subscribes email to closed:in newsletter and tags with lead magnet source.
//
// Env vars (set in Vercel project settings):
//   BEEHIIV_API_KEY        - Beehiiv API key (Settings > Integrations > API)
//   BEEHIIV_PUBLICATION_ID - Beehiiv publication ID (Settings > Publication)
//
// Body: { email: string, magnet?: string, source?: string, utm?: object }

const ALLOWED_ORIGINS = [
  'https://www.closedin.io',
  'https://closedin.io',
  'http://localhost:3000',
  'http://localhost:5173',
];

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://www.closedin.io');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

module.exports = async (req, res) => {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.BEEHIIV_API_KEY;
  const pubId = process.env.BEEHIIV_PUBLICATION_ID;
  if (!apiKey || !pubId) {
    res.status(500).json({ error: 'Newsletter service not configured' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Invalid email' });
    return;
  }

  const magnet = typeof body.magnet === 'string' ? body.magnet.slice(0, 80) : '';
  const source = typeof body.source === 'string' ? body.source.slice(0, 80) : '';
  const utm = body.utm && typeof body.utm === 'object' ? body.utm : {};

  const customFields = [];
  if (magnet) customFields.push({ name: 'lead_magnet', value: magnet });
  if (source) customFields.push({ name: 'signup_source', value: source });

  const utmCleaned = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => {
    if (typeof utm[k] === 'string' && utm[k]) utmCleaned[k] = utm[k].slice(0, 100);
  });

  const payload = {
    email,
    reactivate_existing: false,
    send_welcome_email: true,
    utm_source: utmCleaned.utm_source || source || 'closedin.io',
    utm_medium: utmCleaned.utm_medium || 'website',
    utm_campaign: utmCleaned.utm_campaign || magnet || 'organic',
    referring_site: 'https://www.closedin.io',
    custom_fields: customFields,
  };

  try {
    const upstream = await fetch(
      `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const msg = data && (data.message || data.error) ? (data.message || data.error) : 'Beehiiv error';
      res.status(upstream.status).json({ error: msg });
      return;
    }

    res.status(200).json({ ok: true, status: data.data && data.data.status ? data.data.status : 'active' });
  } catch (err) {
    res.status(502).json({ error: 'Upstream error' });
  }
};
