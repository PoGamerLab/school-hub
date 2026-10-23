/**
 * Classes screen: shows the class banner and handles join / propose forms.
 * P0-9: Removed unused setOwnMapKey import.
 * P0-3 note: joins are superseded by the Phase 1 gate; the join form remains
 *   as a fallback and the join payload now sends createdAt (not joinedAt) to
 *   satisfy the current Firestore rule for joins.
 */

import { store } from '../../core/store/store.js';
import { authService } from '../../core/auth/auth.js';
import { renderClassBanner } from './classes.render.js';
import { showToast } from '../../components/toast/toast.js';
import { createDocument, updateDocument } from '../../core/db/firestore.js';

export function initClasses() {
  const container = document.getElementById('class-banner-container');
  const proposeForm = document.getElementById('propose-class-form');
  const proposeModal = document.getElementById('propose-class-modal');
  const joinForm = document.getElementById('join-class-form');
  const joinModal = document.getElementById('join-class-modal');

  function render() {
    if (!container) return;
    const classInfo = store.get('classInfo');
    const user = authService.getCurrentUser();
    const isMember = user && user.classId === store.get('currentClassId');
    container.innerHTML = renderClassBanner(classInfo, isMember);
  }

  // Propose Class
  if (proposeForm) {
    proposeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = authService.getCurrentUser();
      if (!user) {
        showToast('Please sign in to propose a class.', 'error');
        return;
      }
      const name    = document.getElementById('propose-class-name').value.trim();
      const grade   = document.getElementById('propose-class-grade').value.trim();
      const section = document.getElementById('propose-class-section').value.trim();

      try {
        await createDocument('classes', {
          name,
          grade,
          section,
          status: 'pending',
          createdBy: user.uid,
          supporterUids: [user.uid]
        }, user.uid);
        proposeForm.reset();
        proposeModal?.classList.remove('active');
        showToast('Class proposed! Get 4 more classmates to support it.', 'success');
      } catch (err) {
        console.error('Failed to propose class:', err);
        showToast(`Proposal error: ${err.message}`, 'error');
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
  store.subscribe('user', render);
  render();
}
