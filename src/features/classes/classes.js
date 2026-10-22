import { store } from '../../core/store/store.js';
import { authService } from '../../core/auth/auth.js';
import { renderClassBanner, renderPendingProposals } from './classes.render.js';
import { showToast } from '../../components/toast/toast.js';
import { createDocument, updateDocument, setOwnMapKey } from '../../core/db/firestore.js';

export function initClasses() {
  const container = document.getElementById('class-banner-container');
  const proposalsContainer = document.getElementById('class-proposals-container');
  const proposeForm = document.getElementById('propose-class-form');
  const proposeModal = document.getElementById('propose-class-modal');
  const joinForm = document.getElementById('join-class-form');
  const joinModal = document.getElementById('join-class-modal');

  function render() {
    if (container) {
      const classInfo = store.get('classInfo');
      const user = authService.getCurrentUser();
      const isMember = user && user.classId === store.get('currentClassId');
      container.innerHTML = renderClassBanner(classInfo, isMember);
    }
  }

  // Handle Propose Class Form
  if (proposeForm) {
    proposeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = authService.getCurrentUser();
      if (!user) {
        showToast('Please sign in with Google to propose a class.', 'error');
        return;
      }

      const name = document.getElementById('propose-class-name').value.trim();
      const grade = document.getElementById('propose-class-grade').value.trim();
      const section = document.getElementById('propose-class-section').value.trim();

      const payload = {
        name,
        grade,
        section,
        status: 'pending',
        createdBy: user.uid,
        supporterUids: [user.uid]
      };

      try {
        // Document ID is user.uid (1 proposal per account)
        await createDocument('classes', payload, user.uid);
        proposeForm.reset();
        if (proposeModal) proposeModal.classList.remove('active');
        showToast('Class proposed! Get 4 more classmates to support it for activation.', 'success');
      } catch (err) {
        console.error('Failed to propose class:', err);
        showToast(`Proposal error: ${err.message}`, 'error');
      }
    });
  }

  // Handle Join Class Form
  if (joinForm) {
    joinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = authService.getCurrentUser();
      if (!user) {
        showToast('Please sign in to join a class.', 'error');
        return;
      }

      const classId = document.getElementById('join-class-id').value.trim().toLowerCase();
      const code = document.getElementById('join-class-code').value.trim();

      try {
        // 1. Write joins/{uid} doc
        await createDocument('joins', { classId, code, joinedAt: Date.now() }, user.uid);
        // 2. Update users/{uid}.classId
        await updateDocument('users', user.uid, { classId });

        store.set('currentClassId', classId, false);
        const updatedUser = { ...user, classId };
        authService.setUser(updatedUser);

        joinForm.reset();
        if (joinModal) joinModal.classList.remove('active');
        showToast(`Successfully joined class ${classId}!`, 'success');
      } catch (err) {
        console.error('Failed to join class:', err);
        showToast(`Join failed: Invalid class code or permissions.`, 'error');
      }
    });
  }

  store.subscribe('classInfo', render);
  store.subscribe('user', render);
  render();
}
