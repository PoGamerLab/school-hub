/**
 * Toast notification system.
 * - Timer-based removal (not transitionend).
 * - Max 3 toasts at once; oldest removed first.
 * - Tap/click dismisses immediately.
 * - Fallback hard-remove timer in case CSS transition stalls.
 */

const MAX_TOASTS = 3;
const FADE_DURATION_MS = 280;

let container = null;
let lastToastMessage = '';
let lastToastTime = 0;

function ensureContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function removeToast(toast) {
  if (toast._removed) return;
  toast._removed = true;

  toast.classList.add('toast-exit');

  // Remove from DOM after fade completes, with a hard fallback
  const hardTimer = setTimeout(() => toast.remove(), FADE_DURATION_MS + 50);
  toast.addEventListener('transitionend', () => {
    clearTimeout(hardTimer);
    toast.remove();
  }, { once: true });
}

/**
 * @param {string} message
 * @param {'info'|'success'|'error'} type
 * @param {number} duration  ms before auto-dismiss
 */
export function showToast(message, type = 'info', duration = 3500) {
  if (!message) return;
  const now = Date.now();
  if (message === lastToastMessage && (now - lastToastTime) < 1500) {
    return; // Prevent duplicate rapid toasts
  }
  lastToastMessage = message;
  lastToastTime = now;

  const root = ensureContainer();

  // Enforce max 3: remove oldest excess toasts immediately
  const existing = Array.from(root.querySelectorAll('.toast'));
  if (existing.length >= MAX_TOASTS) {
    existing.slice(0, existing.length - MAX_TOASTS + 1).forEach(t => removeToast(t));
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast._removed = false;

  // Tap/click dismisses
  toast.addEventListener('click', () => removeToast(toast), { once: true });

  root.appendChild(toast);

  // Auto-dismiss after duration, then fade+remove
  const autoTimer = setTimeout(() => removeToast(toast), duration);

  // If removed early by click, clear auto timer
  toast.addEventListener('click', () => clearTimeout(autoTimer), { once: true });
}
