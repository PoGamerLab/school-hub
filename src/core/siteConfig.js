import { initFirebase } from '../config/firebase.js';
import { store } from './store/store.js';
import { escapeHtml } from './utils/escapeHtml.js';
import { authService } from './auth/auth.js';

let _lastReadOnlyData = null;
let unsubStatus = null;
let unsubAnnouncement = null;
let _fbInstance = null;

function _renderReadOnlyBanner(data, roBanner, fb) {
  if (!roBanner) return;
  const isReadOnly = data && data.readOnly === true;
  store.set('isReadOnly', isReadOnly, false);

  if (isReadOnly) {
    const isAdmin = !!store.get('isAdmin');
    roBanner.innerHTML = `
      <span>⚠️ <strong>Site Read-Only:</strong> Posting and voting are temporarily paused by administration.</span>
      ${isAdmin ? `<button class="btn btn-sm btn-outline banner-action-btn" id="ro-quick-disable-btn">Turn Off Read-Only</button>` : ''}
    `;
    roBanner.classList.remove('hidden');

    document.getElementById('ro-quick-disable-btn')?.addEventListener('click', async () => {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      await setDoc(doc(fb.db, 'siteConfig', 'status'), { readOnly: false }, { merge: true });
    });
  } else {
    roBanner.classList.add('hidden');
  }
}

export function initSiteConfig() {
  const annBanner = document.getElementById('site-announcement-banner');
  const roBanner = document.getElementById('site-readonly-banner');

  async function start() {
    if (unsubStatus || unsubAnnouncement) return;

    try {
      if (!_fbInstance) {
        _fbInstance = await initFirebase();
      }
      if (!_fbInstance?.db) return;

      const { doc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

      // 1. Status listener (Read-only mode)
      unsubStatus = onSnapshot(doc(_fbInstance.db, 'siteConfig', 'status'), (snap) => {
        _lastReadOnlyData = snap.exists() ? snap.data() : {};
        _renderReadOnlyBanner(_lastReadOnlyData, roBanner, _fbInstance);
      }, (err) => {
        console.warn('siteConfig status listener warning:', err);
        if (roBanner) roBanner.classList.add('hidden');
      });

      // 2. Announcement listener
      unsubAnnouncement = onSnapshot(doc(_fbInstance.db, 'siteConfig', 'announcement'), (snap) => {
        const data = snap.exists() ? snap.data() : {};
        const isActive = data.active === true && !!data.text;
        if (annBanner) {
          if (isActive) {
            annBanner.innerHTML = `📢 <strong>Announcement:</strong> ${escapeHtml(data.text)}`;
            annBanner.classList.remove('hidden');
          } else {
            annBanner.classList.add('hidden');
          }
        }
      }, (err) => {
        console.warn('siteConfig announcement listener warning:', err);
      });
    } catch (err) {
      console.warn('Failed to start siteConfig listeners:', err);
    }
  }

  function stop() {
    if (unsubStatus) {
      unsubStatus();
      unsubStatus = null;
    }
    if (unsubAnnouncement) {
      unsubAnnouncement();
      unsubAnnouncement = null;
    }
    _lastReadOnlyData = null;
    store.set('isReadOnly', false, false);
    if (roBanner) roBanner.classList.add('hidden');
    if (annBanner) annBanner.classList.add('hidden');
  }

  // Re-render banner when admin state changes
  store.subscribe('isAdmin', () => {
    if (_lastReadOnlyData !== null && _fbInstance) {
      _renderReadOnlyBanner(_lastReadOnlyData, roBanner, _fbInstance);
    }
  });

  // Start listeners only after sign-in; stop on sign-out (Phase A8)
  store.subscribe('user', (u) => {
    if (u) {
      start();
    } else {
      stop();
    }
  });
}

export async function logAdminAction(action, targetId = '', detail = '') {
  try {
    const fb = await initFirebase();
    if (!fb || !fb.db) return;
    const user = authService.getCurrentUser();
    if (!user) return;

    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    await addDoc(collection(fb.db, 'adminLog'), {
      actorUid: user.uid,
      adminName: user.displayName || 'Administrator',
      action,
      targetId: String(targetId || ''),
      detail: String(detail || ''),
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Failed to write adminLog:', err);
  }
}
