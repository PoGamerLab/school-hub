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
    const uid = user ? user.uid : null;

    if (superlatives.length === 0) {
      container.innerHTML = `
        <div class="empty-state full-width-empty">
          <div class="empty-state-icon">🏆</div>
          <div class="empty-state-title">No Superlatives Added Yet</div>
          <div class="empty-state-desc">Click "+ Add Superlative" to propose an award category for the class to vote on!</div>
        </div>
      `;
      return;
    }
    container.innerHTML = superlatives.map(sup => renderSuperlativeCard(sup, uid)).join('');
  }

  // Voting and un-voting via event delegation
  if (container) {
    container.addEventListener('click', async (e) => {
      const row = e.target.closest('[data-action="vote"]');
      if (!row) return;

      const user = authService.getCurrentUser();
      if (!user) {
        showToast('Please sign in with Google to cast your vote.', 'error');
        return;
      }

      const id = row.dataset.id;
      const nominee = row.dataset.nominee;
      const superlatives = store.get('superlatives') || [];
      const sup = superlatives.find(s => s.id === id);
      if (!sup) return;

      const currentVote = (sup.votes || {})[user.uid];

      try {
        if (currentVote === nominee) {
          // Un-vote: remove own key
          await setOwnMapKey('superlatives', id, 'votes', user.uid, null);
          showToast(`Vote removed for ${nominee}.`, 'info');
        } else {
          // Vote for nominee
          await setOwnMapKey('superlatives', id, 'votes', user.uid, nominee);
          showToast(`Voted for ${nominee}!`, 'success');
        }
      } catch (err) {
        console.error('Vote failed:', err);
        showToast(`Vote error: ${err.message}`, 'error');
      }
    });
  }

  // Proposing a new superlative
  if (addSuperlativeForm) {
    addSuperlativeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = authService.getCurrentUser();
      if (!user) {
        showToast('Please sign in to add a superlative.', 'error');
        return;
      }

      const icon = document.getElementById('superlative-icon').value.trim() || '🏆';
      const title = document.getElementById('superlative-title').value.trim();
      const nomineesRaw = document.getElementById('superlative-nominees')?.value || document.getElementById('superlative-winner')?.value || '';
      
      // Parse comma or newline separated nominees
      const nominees = nomineesRaw.split(/[,\n]/).map(n => n.trim()).filter(Boolean);
      if (nominees.length < 2) {
        showToast('Please provide at least 2 nominees for the class to vote on.', 'error');
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
    subscribeClassCollection('superlatives', classId, (list) => {
      store.set('superlatives', list, false);
      render();
    });
  }

  store.subscribe('currentClassId', attachSubscription);
  store.subscribe('user', render);
  attachSubscription();
}
