const LIVE_EMBED =
  'https://www.youtube.com/embed/yn8VvjeDFXw?controls=0&autoplay=1&rel=0&modestbranding=1';

const MIN_WIDTH = 260;
const MIN_HEIGHT = 168;
const HEAD_HEIGHT = 40;

const trigger = document.getElementById('live-pip-open');
const panel = document.getElementById('live-pip-fallback');
const frame = document.getElementById('live-pip-frame');
const closeBtn = document.getElementById('live-pip-close');
const dragHandle = document.getElementById('live-pip-drag');
const resizeHandle = document.getElementById('live-pip-resize');

let dragState = null;
let resizeState = null;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function panelSize() {
  return {
    width: panel.offsetWidth,
    height: panel.offsetHeight,
  };
}

function placeDefault() {
  if (!panel || panel.dataset.placed) return;
  const width = Math.min(360, window.innerWidth - 40);
  const height = HEAD_HEIGHT + Math.round((width * 9) / 16);
  panel.style.width = `${width}px`;
  panel.style.height = `${height}px`;
  panel.style.left = '20px';
  panel.style.top = `${Math.max(12, window.innerHeight - height - 20)}px`;
  panel.dataset.placed = '1';
}

function openPanel() {
  if (!panel || !frame) return;
  placeDefault();
  panel.hidden = false;
  trigger?.setAttribute('aria-expanded', 'true');
  if (!frame.src) frame.src = LIVE_EMBED;
  closeBtn?.focus();
}

function closePanel() {
  if (!panel || !frame) return;
  panel.hidden = true;
  frame.src = '';
  trigger?.setAttribute('aria-expanded', 'false');
  trigger?.focus();
}

function onPointerMove(event) {
  if (!panel) return;
  const { width, height } = panelSize();

  if (dragState) {
    const left = clamp(
      dragState.left + event.clientX - dragState.x,
      8,
      window.innerWidth - width - 8,
    );
    const top = clamp(
      dragState.top + event.clientY - dragState.y,
      8,
      window.innerHeight - height - 8,
    );
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  if (resizeState) {
    const nextWidth = clamp(
      resizeState.width + event.clientX - resizeState.x,
      MIN_WIDTH,
      window.innerWidth - 16,
    );
    const nextHeight = clamp(
      resizeState.height + event.clientY - resizeState.y,
      MIN_HEIGHT,
      window.innerHeight - 16,
    );
    panel.style.width = `${nextWidth}px`;
    panel.style.height = `${nextHeight}px`;
  }
}

function endPointer(event) {
  if (dragState?.pointerId === event.pointerId) dragState = null;
  if (resizeState?.pointerId === event.pointerId) resizeState = null;
  panel?.classList.remove('live-pip-fallback--dragging', 'live-pip-fallback--resizing');
}

function wireDrag() {
  if (!dragHandle || !panel) return;
  dragHandle.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button')) return;
    const rect = panel.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: rect.left,
      top: rect.top,
    };
    panel.classList.add('live-pip-fallback--dragging');
    dragHandle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  dragHandle.addEventListener('pointerup', endPointer);
  dragHandle.addEventListener('pointercancel', endPointer);
}

function wireResize() {
  if (!resizeHandle || !panel) return;
  resizeHandle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const { width, height } = panelSize();
    resizeState = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      width,
      height,
    };
    panel.classList.add('live-pip-fallback--resizing');
    resizeHandle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  resizeHandle.addEventListener('pointerup', endPointer);
  resizeHandle.addEventListener('pointercancel', endPointer);
}

function wire() {
  if (!trigger) return;
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', endPointer);
  document.addEventListener('pointercancel', endPointer);

  trigger.addEventListener('click', () => {
    if (panel && !panel.hidden) closePanel();
    else openPanel();
  });
  closeBtn?.addEventListener('click', closePanel);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panel && !panel.hidden) closePanel();
  });
  wireDrag();
  wireResize();
}

wire();
