import { initFirebase } from '../config/firebase.js';
import { store } from './store/store.js';
import { escapeHtml } from './utils/escapeHtml.js';
import { authService } from './auth/auth.js';

export function initSiteConfig() {
  const annBanner = document.getElementById('site-announcement-banner');
  const roBanner = document.getElementById('site-readonly-banner');

  initFirebase().then(async fb => {
    if (!fb || !fb.db) return;
    const { doc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    // 1. Status listener (Read-only mode)
    onSnapshot(doc(fb.db, 'siteConfig', 'status'), (snap) => {
      const data = snap.exists() ? snap.data() : {};
      const isReadOnly = data.readOnly === true;
      store.set('isReadOnly', isReadOnly, false);
      if (roBanner) {
        roBanner.classList.toggle('hidden', !isReadOnly);
      }
    }, (err) => {
      console.warn('siteConfig status listener warning:', err);
    });

    // 2. Announcement listener
    onSnapshot(doc(fb.db, 'siteConfig', 'announcement'), (snap) => {
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
  }).catch(err => {
    console.warn('Failed to init siteConfig:', err);
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
      adminUid: user.uid,
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
