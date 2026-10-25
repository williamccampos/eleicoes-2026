import { sessionId } from './session.js';

const COOLDOWN_MS = 10_000;
const POLL_MS = 1500;

const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:8791'
  : 'https://quemtaganhando-presenca.willccampos.chatgpt.site';

const REACTIONS = [
  { id: 'surprise', emoji: '😮', label: 'Surpresa' },
  { id: 'sad', emoji: '😢', label: 'Tristeza' },
  { id: 'angry', emoji: '😠', label: 'Bravo' },
  { id: 'joy', emoji: '😄', label: 'Alegria' },
  { id: 'heart-red', emoji: '❤️', label: 'Coração vermelho' },
  { id: 'heart-green', emoji: '💚', label: 'Coração verde' },
  { id: 'br', emoji: '🇧🇷', label: 'Bandeira do Brasil' },
];

const emojiById = new Map(REACTIONS.map(r => [r.id, r.emoji]));
const stage = document.getElementById('reaction-stage');
const fab = document.getElementById('reaction-fab');
const panel = document.getElementById('reaction-panel');
const cooldownEl = document.getElementById('reaction-cooldown');

let lastEventId = 0;
let cooldownUntil = 0;
let pollTimer = null;
let cooldownTimer = null;
let panelOpen = false;
let apiOk = false;

function reactionEmoji(id) {
  return emojiById.get(id) || '✨';
}

function remainingCooldown() {
  return Math.max(0, cooldownUntil - Date.now());
}

function updateCooldownUi() {
  const left = remainingCooldown();
  if (!fab || !cooldownEl) return;
  if (left > 0) {
    fab.disabled = true;
    fab.setAttribute('aria-disabled', 'true');
    cooldownEl.hidden = false;
    cooldownEl.textContent = `${Math.ceil(left / 1000)}s`;
  } else {
    fab.disabled = false;
    fab.removeAttribute('aria-disabled');
    cooldownEl.hidden = true;
    cooldownEl.textContent = '';
  }
}

function scheduleCooldownTick() {
  clearInterval(cooldownTimer);
  updateCooldownUi();
  cooldownTimer = setInterval(() => {
    updateCooldownUi();
    if (!remainingCooldown()) clearInterval(cooldownTimer);
  }, 250);
}

function startCooldown(ms = COOLDOWN_MS) {
  cooldownUntil = Date.now() + ms;
  scheduleCooldownTick();
}

function spawnFloating(reactionId) {
  if (!stage) return;
  const bubble = document.createElement('span');
  bubble.className = 'reaction-float';
  bubble.textContent = reactionEmoji(reactionId);
  bubble.setAttribute('role', 'presentation');
  const left = 4 + Math.random() * 92;
  const size = 1.6 + Math.random() * 1.1;
  const duration = 3.2 + Math.random() * 1.4;
  const drift = (Math.random() - 0.5) * 48;
  bubble.style.left = `${left}%`;
  bubble.style.fontSize = `${size}rem`;
  bubble.style.setProperty('--drift', `${drift}px`);
  bubble.style.setProperty('--duration', `${duration}s`);
  stage.appendChild(bubble);
  bubble.addEventListener('animationend', () => bubble.remove(), { once: true });
}

async function sendReaction(reactionId) {
  if (remainingCooldown() > 0) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`${API_BASE}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId(), reaction: reactionId }),
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (response.status === 429) {
      const data = await response.json().catch(() => ({}));
      startCooldown(Number(data.retryAfterMs) || COOLDOWN_MS);
      return;
    }
    if (!response.ok) throw new Error('send failed');
    const data = await response.json();
    startCooldown();
    if (data.event) {
      lastEventId = Math.max(lastEventId, data.event.id);
      spawnFloating(data.event.reaction);
    }
    closePanel();
  } catch {
    fab?.classList.add('reaction-fab--offline');
  } finally {
    clearTimeout(timeout);
  }
}

async function pollReactions() {
  if (!apiOk && document.hidden) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`${API_BASE}/reactions/recent?since=${lastEventId}`, {
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('poll failed');
    const data = await response.json();
    apiOk = true;
    fab?.classList.remove('reaction-fab--offline');
    for (const event of data.events || []) {
      if (event.id <= lastEventId) continue;
      lastEventId = event.id;
      spawnFloating(event.reaction);
    }
  } catch {
    apiOk = false;
    fab?.classList.add('reaction-fab--offline');
  } finally {
    clearTimeout(timeout);
  }
}

function openPanel() {
  if (!panel || panelOpen) return;
  panel.hidden = false;
  fab?.setAttribute('aria-expanded', 'true');
  panelOpen = true;
}

function closePanel() {
  if (!panel || !panelOpen) return;
  panel.hidden = true;
  fab?.setAttribute('aria-expanded', 'false');
  panelOpen = false;
}

function togglePanel() {
  if (panelOpen) closePanel();
  else openPanel();
}

function wireUi() {
  if (!fab || !panel) return;

  fab.addEventListener('click', () => {
    if (remainingCooldown() > 0) return;
    togglePanel();
  });

  panel.addEventListener('click', event => {
    const btn = event.target.closest('[data-reaction]');
    if (!btn) return;
    sendReaction(btn.dataset.reaction);
  });

  document.addEventListener('click', event => {
    if (!panelOpen) return;
    if (event.target.closest('.reaction-widget')) return;
    closePanel();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closePanel();
  });
}

function startPolling() {
  pollReactions();
  clearInterval(pollTimer);
  pollTimer = setInterval(pollReactions, POLL_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) pollReactions();
  });
}

if (stage && fab && panel) {
  panel.innerHTML = REACTIONS.map(r =>
    `<button type="button" class="reaction-choice" data-reaction="${r.id}" aria-label="${r.label}">${r.emoji}</button>`
  ).join('');
  wireUi();
  startPolling();
  updateCooldownUi();
}
