// Adds a waitlist sign-up to Kit, tagged "Waitlist" plus their system of choice.
// Needs one environment variable in Vercel: KIT_API_KEY (a Kit v4 API key).
// Tag names can be changed with KIT_TAG_WAITLIST, KIT_TAG_CLAUDE, KIT_TAG_CHATGPT, KIT_TAG_MUSE, KIT_TAG_APP.

const KIT = 'https://api.kit.com/v4';

const TAGS = {
  waitlist: process.env.KIT_TAG_WAITLIST || 'Waitlist',
  claude: process.env.KIT_TAG_CLAUDE || 'Claude',
  chatgpt: process.env.KIT_TAG_CHATGPT || 'ChatGPT',
  muse: process.env.KIT_TAG_MUSE || 'Muse',
  app: process.env.KIT_TAG_APP || 'App',
};

async function kit(path, key, options = {}) {
  const res = await fetch(KIT + path, {
    ...options,
    headers: { 'X-Kit-Api-Key': key, 'Content-Type': 'application/json', Accept: 'application/json', ...(options.headers || {}) },
  });
  const text = await res.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch (e) { body = { raw: text }; }
  if (!res.ok) {
    const err = new Error('Kit ' + res.status + ' on ' + path);
    err.status = res.status; err.body = body;
    throw err;
  }
  return body;
}

async function tagIds(key, names) {
  const found = {};
  let after = null;
  for (let page = 0; page < 10; page++) {
    const q = '/tags?per_page=500' + (after ? '&after=' + encodeURIComponent(after) : '');
    const body = await kit(q, key, { method: 'GET' });
    for (const t of body.tags || []) found[String(t.name).toLowerCase()] = t.id;
    const p = body.pagination || {};
    if (!p.has_next_page || !p.end_cursor) break;
    after = p.end_cursor;
  }
  return names.map((n) => ({ name: n, id: found[n.toLowerCase()] }));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  const key = process.env.KIT_API_KEY;
  if (!key) return res.status(500).json({ error: 'The waitlist is not connected yet. Please try again soon.' });

  let data = req.body || {};
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) { data = {}; } }

  // Bots fill the hidden field; quietly accept and do nothing.
  if (data.website) return res.status(200).json({ ok: true });

  const email = String(data.email || '').trim().toLowerCase();
  const firstName = String(data.first_name || '').trim().slice(0, 60);
  const system = String(data.system || 'claude').toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return res.status(400).json({ error: 'Please check your email address.' });
  }

  try {
    await kit('/subscribers', key, {
      method: 'POST',
      body: JSON.stringify({ email_address: email, first_name: firstName || undefined, state: 'active' }),
    });

    const wanted = [TAGS.waitlist, TAGS[system] || TAGS.claude];
    const tags = await tagIds(key, wanted);
    const missing = tags.filter((t) => !t.id).map((t) => t.name);
    for (const t of tags.filter((t) => t.id)) {
      await kit('/tags/' + t.id + '/subscribers', key, {
        method: 'POST',
        body: JSON.stringify({ email_address: email }),
      });
    }
    if (missing.length) console.warn('Kit tags not found, create them in Kit:', missing.join(', '));

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Waitlist sign-up failed:', e.message, JSON.stringify(e.body || {}));
    return res.status(502).json({ error: 'Something went wrong on our side. Please try again in a minute.' });
  }
};
