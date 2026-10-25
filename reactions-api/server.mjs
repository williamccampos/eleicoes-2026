import http from 'node:http';

const PORT = Number(process.env.PORT) || 8791;
const COOLDOWN_MS = Number(process.env.REACTION_COOLDOWN_MS) || 10_000;
const EVENT_TTL_MS = 5 * 60_000;
const MAX_EVENTS = 800;

const ALLOWED_ORIGINS = new Set([
  'https://quemtaganhando2turno.online',
  'https://www.quemtaganhando2turno.online',
  'https://williamccampos.github.io',
  'http://localhost:8766',
  'http://127.0.0.1:8766',
]);

const ALLOWED_REACTIONS = new Set([
  'surprise', 'sad', 'angry', 'joy', 'heart-red', 'heart-green', 'br',
]);

/** @type {{ id: number, reaction: string, at: number }[]} */
const events = [];
let nextId = 1;
/** @type {Map<string, number>} */
const lastSent = new Map();

function prune() {
  const cutoff = Date.now() - EVENT_TTL_MS;
  while (events.length && events[0].at < cutoff) events.shift();
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
}

function corsOrigin(request) {
  const origin = request.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) return origin;
  return null;
}

function json(res, status, body, origin) {
  const payload = JSON.stringify(body);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  res.writeHead(status, headers);
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => {
      chunks.push(chunk);
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
  const origin = corsOrigin(req);
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    if (!origin) {
      res.writeHead(403).end();
      return;
    }
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '3600',
      Vary: 'Origin',
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, { ok: true }, origin || '*');
  }

  if (!origin && url.pathname !== '/health') {
    return json(res, 403, { error: 'origin_not_allowed' }, null);
  }

  if (req.method === 'GET' && url.pathname === '/reactions/recent') {
    prune();
    const since = Number(url.searchParams.get('since') || '0');
    const list = events.filter(event => event.id > since);
    return json(res, 200, { events: list }, origin);
  }

  if (req.method === 'POST' && url.pathname === '/reactions') {
    try {
      const raw = await readBody(req);
      const data = JSON.parse(raw || '{}');
      const sessionId = String(data.sessionId || '');
      const reaction = String(data.reaction || '');
      if (!/^[a-f0-9]{32}$/.test(sessionId)) return json(res, 400, { error: 'invalid_session' }, origin);
      if (!ALLOWED_REACTIONS.has(reaction)) return json(res, 400, { error: 'invalid_reaction' }, origin);

      const now = Date.now();
      const prev = lastSent.get(sessionId) || 0;
      const wait = COOLDOWN_MS - (now - prev);
      if (wait > 0) {
        return json(res, 429, { error: 'cooldown', retryAfterMs: wait }, origin);
      }

      prune();
      const event = { id: nextId++, reaction, at: now };
      events.push(event);
      lastSent.set(sessionId, now);
      return json(res, 201, { ok: true, event }, origin);
    } catch {
      return json(res, 400, { error: 'bad_request' }, origin);
    }
  }

  json(res, 404, { error: 'not_found' }, origin);
});

server.listen(PORT, () => {
  console.log(`Reactions API listening on port ${PORT}`);
});
