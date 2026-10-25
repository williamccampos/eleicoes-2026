const VERSION_KEY = 'quemtaganhando-app-version-v1';
const CHECK_MS = 30_000;
let checking = false;

async function checkAppVersion() {
  if (checking || document.hidden) return;
  checking = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`./version.json?ts=${Date.now()}`, {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    });
    if (!response.ok) return;
    const data = await response.json();
    const remote = String(data.version || '').trim();
    if (!remote) return;

    const local = localStorage.getItem(VERSION_KEY);
    if (local && local !== remote) {
      localStorage.setItem(VERSION_KEY, remote);
      location.reload();
      return;
    }
    localStorage.setItem(VERSION_KEY, remote);
  } catch {
    // Mantém a sessão atual se a checagem falhar.
  } finally {
    clearTimeout(timeout);
    checking = false;
  }
}

checkAppVersion();
setInterval(checkAppVersion, CHECK_MS);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) checkAppVersion();
});
window.addEventListener('pageshow', event => {
  if (event.persisted) checkAppVersion();
});
window.addEventListener('online', checkAppVersion);
