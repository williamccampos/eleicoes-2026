// Only aggregate counts are returned; inactive browser sessions expire after 60 seconds.
const ENDPOINT = 'https://quemtaganhando-presenca.willccampos.chatgpt.site/presence';
const badge = document.getElementById('online-visitors');
const label = document.getElementById('online-count');
const KEY = 'quemtaganhando-online-session-v1';
let fallbackId, busy = false;

function sessionId() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (/^[a-f0-9]{32}$/.test(saved?.id) && saved.expires > Date.now()) return saved.id;
  } catch {}
  const id = fallbackId ||= Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  try { localStorage.setItem(KEY, JSON.stringify({ id, expires: Date.now() + 86400000 })); } catch {}
  return id;
}

async function heartbeat() {
  if (!ENDPOINT || !badge || !label || busy || document.hidden) return;
  busy = true;
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId() }),
      credentials: 'omit', cache: 'no-store', signal: controller.signal,
    });
    if (!response.ok) throw new Error('Presence unavailable');
    const data = await response.json();
    if (!Number.isSafeInteger(data.online) || data.online < 0) throw new Error('Invalid count');
    label.textContent = new Intl.NumberFormat('pt-BR').format(data.online) + ' online';
    badge.hidden = false;
  } catch {
    badge.hidden = true;
  } finally {
    clearTimeout(timeout); busy = false;
  }
}

if (ENDPOINT) {
  heartbeat();
  setInterval(heartbeat, 20000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) badge.hidden = true;
    else heartbeat();
  });
  window.addEventListener('online', heartbeat);
  window.addEventListener('offline', () => { badge.hidden = true; });
}
