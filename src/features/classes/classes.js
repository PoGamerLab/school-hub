/**
 * Classes screen: shows the class banner and handles join / propose forms.
 * P0-9: Removed unused setOwnMapKey import.
 * P0-3 note: joins are superseded by the Phase 1 gate; the join form remains
 *   as a fallback and the join payload now sends createdAt (not joinedAt) to
 *   satisfy the current Firestore rule for joins.
 */

import { store } from '../../core/store/store.js';
import { authService } from '../../core/auth/auth.js';
import { router } from '../../core/router/router.js';
import { renderClassBanner } from './classes.render.js';
import { showToast } from '../../components/toast/toast.js';
import { createDocument, updateDocument } from '../../core/db/firestore.js';
import { fetchActiveClasses } from '../gate/gate.db.js';

export async function syncClasses() {
  try {
    const classes = await fetchActiveClasses();
    store.set('activeClasses', classes, false);

    const user = authService.getCurrentUser();
    let currentId = store.get('currentClassId');

    if (user && user.classId && classes.some(c => c.id === user.classId)) {
      currentId = user.classId;
    } else if (!currentId || !classes.some(c => c.id === currentId)) {
      if (classes.length > 0) {
        currentId = classes[0].id;
      }
    }

    const currentClass = classes.find(c => c.id === currentId) || classes[0] || null;
    if (currentClass) {
      store.set('currentClassId', currentClass.id, false);
      store.set('classInfo', currentClass, true);
    }
    return { classes, currentClass };
  } catch (err) {
    console.warn('[Classes] syncClasses failed:', err);
    return { classes: [], currentClass: null };
  }
}

export function initClasses() {
  const container = document.getElementById('class-banner-container');
  const proposeForm = document.getElementById('propose-class-form');
  const proposeModal = document.getElementById('propose-class-modal');
  const joinForm = document.getElementById('join-class-form');
  const joinModal = document.getElementById('join-class-modal');

  function render() {
    if (!container) return;
    const classInfo = store.get('classInfo');
    const classes = store.get('activeClasses') || [];
    const user = authService.getCurrentUser();
    const isMember = user && user.classId === store.get('currentClassId');
    container.innerHTML = renderClassBanner(classInfo, isMember, classes);

    const switcher = document.getElementById('class-switcher-select');
    if (switcher) {
      switcher.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        const currentList = store.get('activeClasses') || [];
        const chosen = currentList.find(c => c.id === selectedId);
        if (chosen) {
          store.set('currentClassId', chosen.id, false);
          store.set('classInfo', chosen, true);
        }
      });
    }

    const proposeBtn = document.getElementById('open-propose-class-btn');
    const modalTitle = document.querySelector('#propose-class-modal .modal-header h3');
    const submitBtn = proposeForm?.querySelector('button[type="submit"]');
    if (store.get('isAdmin')) {
      if (proposeBtn) proposeBtn.textContent = '+ Create Class';
      if (modalTitle) modalTitle.textContent = 'Create an Active Class';
      if (submitBtn) submitBtn.textContent = 'Create Class';
    }
  }

  // Propose or Direct Create Class
  if (proposeForm) {
    proposeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = authService.getCurrentUser();
      if (!user) {
        showToast('Please sign in to create or propose a class.', 'error');
        return;
      }
      const name    = document.getElementById('propose-class-name').value.trim();
      const grade   = document.getElementById('propose-class-grade').value.trim();
      const section = document.getElementById('propose-class-section').value.trim();
      const isAdmin = store.get('isAdmin');
      const slug    = (name + '-' + section).toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
      const targetId = isAdmin ? (slug || user.uid) : user.uid;
      const status  = isAdmin ? 'active' : 'pending';

      try {
        await createDocument('classes', {
          name,
          grade,
          section,
          status,
          createdBy: user.uid,
          supporterUids: [user.uid]
        }, targetId);
        proposeForm.reset();
        proposeModal?.classList.remove('active');
        if (isAdmin) {
          showToast(`Class "${name}" created and activated!`, 'success');
          store.set('currentClassId', targetId);
          store.set('classInfo', { id: targetId, name, grade, section, status: 'active' });
        } else {
          showToast('Class proposed! Get 4 more classmates to support it.', 'success');
        }
      } catch (err) {
        console.error('Failed to create/propose class:', err);
        showToast(`Error: ${err.message}`, 'error');
      }
    });
  }

  // Join Class (P0-3: send createdAt, not joinedAt)
  if (joinForm) {
    joinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = authService.getCurrentUser();
      if (!user) {
        showToast('Please sign in to join a class.', 'error');
        return;
      }
      const classId = document.getElementById('join-class-id').value.trim().toLowerCase();
      const code    = document.getElementById('join-class-code').value.trim();

      if (!classId || !code) {
        showToast('Enter both the class ID and invite code.', 'error');
        return;
      }

      try {
        // P0-3: payload uses classId + code + createdAt (rules allow these keys)
        await createDocument('joins', { classId, code }, user.uid);
        await updateDocument('users', user.uid, { classId });

        store.set('currentClassId', classId, false);
        authService.setUser({ ...user, classId });

        joinForm.reset();
        joinModal?.classList.remove('active');
        showToast(`Joined class ${classId}!`, 'success');
      } catch (err) {
        console.error('Join failed:', err);
        showToast('Incorrect class code or class not found.', 'error');
      }
    });
  }

  store.subscribe('classInfo', render);
  store.subscribe('activeClasses', render);
  store.subscribe('user', render);

  router.registerScreenHook('class', {
    onEnter: async () => {
      await syncClasses();
      render();
    }
  });

  syncClasses().then(render);
}
