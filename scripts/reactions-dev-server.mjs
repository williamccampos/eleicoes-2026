// Local dev: prefer `node reactions-api/server.mjs` (PORT=8791).
import http from 'node:http';

const PORT = Number(process.env.PORT) || 8791;
const COOLDOWN_MS = 10_000;
const EVENT_TTL_MS = 5 * 60_000;
const PRESENCE_TTL_MS = 60_000;
const MAX_EVENTS = 800;

const ALLOWED = new Set(['surprise', 'sad', 'angry', 'joy', 'heart-red', 'heart-green', 'br']);

/** @type {{ id: number, reaction: string, at: number }[]} */
const events = [];
let nextId = 1;
/** @type {Map<string, number>} */
const lastSent = new Map();
/** @type {Map<string, number>} */
const presence = new Map();

function prune() {
  const cutoff = Date.now() - EVENT_TTL_MS;
  while (events.length && events[0].at < cutoff) events.shift();
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  const presenceCutoff = Date.now() - PRESENCE_TTL_MS;
  for (const [id, at] of presence) {
    if (at < presenceCutoff) presence.delete(id);
  }
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => {
      chunks.push(c);
      if (chunks.reduce((n, b) => n + b.length, 0) > 4096) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/reactions/recent') {
    prune();
    const since = Number(url.searchParams.get('since') || '0');
    const list = events.filter(e => e.id > since);
    return json(res, 200, { events: list });
  }

  if (req.method === 'POST' && url.pathname === '/presence') {
    try {
      const raw = await readBody(req);
      const data = JSON.parse(raw || '{}');
      const sessionId = String(data.sessionId || '');
      if (!/^[a-f0-9]{32}$/.test(sessionId)) return json(res, 400, { error: 'invalid_session' });
      prune();
      presence.set(sessionId, Date.now());
      return json(res, 200, { online: presence.size });
    } catch {
      return json(res, 400, { error: 'bad_request' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/reactions') {
    try {
      const raw = await readBody(req);
      const data = JSON.parse(raw || '{}');
      const sessionId = String(data.sessionId || '');
      const reaction = String(data.reaction || '');
      if (!/^[a-f0-9]{32}$/.test(sessionId)) return json(res, 400, { error: 'invalid_session' });
      if (!ALLOWED.has(reaction)) return json(res, 400, { error: 'invalid_reaction' });

      const now = Date.now();
      const prev = lastSent.get(sessionId) || 0;
      const wait = COOLDOWN_MS - (now - prev);
      if (wait > 0) {
        return json(res, 429, { error: 'cooldown', retryAfterMs: wait });
      }

      prune();
      const event = { id: nextId++, reaction, at: now };
      events.push(event);
      lastSent.set(sessionId, now);
      return json(res, 201, { ok: true, event });
    } catch {
      return json(res, 400, { error: 'bad_request' });
    }
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, { ok: true });
  }

  json(res, 404, { error: 'not_found' });
});

server.listen(PORT, () => {
  console.log(`Dev reactions/presence API on http://localhost:${PORT}`);
});
