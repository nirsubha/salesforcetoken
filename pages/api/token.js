export const config = { runtime: 'nodejs' };

let cached = null;
let inflight = null;

async function fetchTokenFromSalesforce() {
  const SF_INSTANCE = process.env.SF_INSTANCE_URL;
  const CLIENT_ID = process.env.SF_CLIENT_ID;
  const CLIENT_SECRET = process.env.SF_CLIENT_SECRET;

  if (!SF_INSTANCE || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing SF_INSTANCE_URL / SF_CLIENT_ID / SF_CLIENT_SECRET env vars');
  }

  const tokenUrl = `${SF_INSTANCE.replace(/\/$/, '')}/services/oauth2/token`;
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);

  const resp = await fetch(tokenUrl, {
    method: 'POST',
    body: params.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Token endpoint returned ${resp.status}: ${text}`);
  }

  const data = JSON.parse(text);
  if (!data.access_token) throw new Error('No access_token in response');

  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 300;
  data.expires_at = Date.now() + expiresIn * 1000;
  return data;
}

async function getToken() {
  if (cached && Date.now() + 10000 < cached.expires_at) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const token = await fetchTokenFromSalesforce();
      cached = token;
      return token;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = await getToken();
    return res.status(200).json({
      access_token: token.access_token,
      token_type: token.token_type,
      expires_at: token.expires_at,
      issued_at: token.issued_at || Date.now(),
    });
  } catch (err) {
    return res.status(500).json({ error: 'token_fetch_failed', detail: String(err.message) });
  }
}
