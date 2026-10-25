const KEY = 'quemtaganhando-online-session-v1';
let fallbackId;

export function sessionId() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (/^[a-f0-9]{32}$/.test(saved?.id) && saved.expires > Date.now()) return saved.id;
  } catch {}
  const id = fallbackId ||= Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  try { localStorage.setItem(KEY, JSON.stringify({ id, expires: Date.now() + 86400000 })); } catch {}
  return id;
}
