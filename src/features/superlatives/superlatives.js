import { store } from '../../core/store/store.js';
import { authService } from '../../core/auth/auth.js';
import { renderSuperlativeCard } from './superlatives.render.js';
import { showToast } from '../../components/toast/toast.js';
import { subscribeClassCollection, createDocument, setOwnMapKey } from '../../core/db/firestore.js';

export function initSuperlatives() {
  const container = document.getElementById('superlatives-container');
  const addSuperlativeForm = document.getElementById('add-superlative-form');
  const addSuperlativeModal = document.getElementById('add-superlative-modal');

  function render() {
    if (!container) return;
    const superlatives = store.get('superlatives') || [];
    const user = authService.getCurrentUser();
    const currentUid = user ? user.uid : null;

    if (superlatives.length === 0) {
      container.innerHTML = `
        <div class="empty-state full-width-empty">
          <div class="empty-state-icon">🏆</div>
          <div class="empty-state-title">No Superlatives Active</div>
          <div class="empty-state-desc">Click "+ Add Award" to create peer awards for your class to vote on.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = superlatives.map(item => renderSuperlativeCard(item, currentUid)).join('');
  }

  // Handle single-vote voting and un-voting via event delegation
  if (container) {
    container.addEventListener('click', async (e) => {
      const nomineeRow = e.target.closest('.nominee-row');
      if (!nomineeRow) return;

      const user = authService.getCurrentUser();
      if (!user) {
        showToast('Please sign in with Google to vote on superlatives.', 'error');
        return;
      }

      const card = nomineeRow.closest('.superlative-card');
      const superlativeId = card.dataset.id;
      const nomineeName = nomineeRow.dataset.nominee;
      const isCurrentlyVoted = nomineeRow.classList.contains('voted');

      try {
        if (isCurrentlyVoted) {
          await setOwnMapKey('superlatives', superlativeId, 'votes', null);
          showToast('Vote removed.');
        } else {
          await setOwnMapKey('superlatives', superlativeId, 'votes', nomineeName);
          showToast(`Voted for ${nomineeName}!`, 'success');
        }
        render();
      } catch (err) {
        console.error('Voting failed:', err);
        showToast(`Vote failed: ${err.message}`, 'error');
      }
    });
  }

  if (addSuperlativeForm) {
    addSuperlativeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = authService.getCurrentUser();
      if (!user) {
        showToast('Please sign in to add a superlative category.', 'error');
        return;
      }

      const title = document.getElementById('superlative-title').value.trim();
      const icon = document.getElementById('superlative-icon').value.trim() || '🏆';
      const nomineesRaw = document.getElementById('superlative-nominees').value.trim();

      const nominees = nomineesRaw.split(',').map(n => n.trim()).filter(Boolean);
      if (nominees.length === 0) {
        showToast('Please list at least one nominee.', 'error');
        return;
      }

      const payload = {
        classId: store.get('currentClassId') || '10-b',
        createdBy: user.uid,
        title,
        icon,
        nominees: nominees.slice(0, 10),
        votes: {}
      };

      try {
        await createDocument('superlatives', payload);
        addSuperlativeForm.reset();
        if (addSuperlativeModal) addSuperlativeModal.classList.remove('active');
        showToast(`Superlative "${title}" added for voting!`, 'success');
      } catch (err) {
        console.error('Failed to create superlative:', err);
        showToast(`Error: ${err.message}`, 'error');
      }
    });
  }

  function attachSubscription() {
    const classId = store.get('currentClassId') || '10-b';
    subscribeClassCollection('superlatives', classId, () => {
      render();
    });
  }

  store.subscribe('currentClassId', attachSubscription);
  store.subscribe('user', render);
  attachSubscription();
}
