import { store } from '../../core/store/store.js';
import { router } from '../../core/router/router.js';
import { authService } from '../../core/auth/auth.js';
import { renderSuperlativeCard } from './superlatives.render.js';
import { showToast } from '../../components/toast/toast.js';
import { subscribeClassCollection, unsubscribeCollection, createDocument, setOwnMapKey } from '../../core/db/firestore.js';

export function initSuperlatives() {
  const container = document.getElementById('superlatives-container');
  const addSuperlativeForm = document.getElementById('add-superlative-form');
  const addSuperlativeModal = document.getElementById('add-superlative-modal');
  const loadMoreContainer = document.getElementById('superlatives-load-more-container');
  const loadMoreBtn = document.getElementById('superlatives-load-more-btn');

  let activeSub = null;

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

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', async () => {
      if (activeSub && activeSub.loadMore) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = 'Loading...';
        await activeSub.loadMore();
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load More Superlatives';
      }
    });
  }

  if (container) {
    container.addEventListener('click', async (e) => {
      const user = authService.getCurrentUser();

      const reportBtn = e.target.closest('[data-action="report-superlative"]');
      if (reportBtn) {
        if (!user) {
          showToast('Please sign in with Google to report a category.', 'error');
          return;
        }

        const superlativeId = reportBtn.dataset.id;
        const reason = prompt('Why are you reporting this superlative category to the administrator?\n(e.g., Inappropriate content, Bullying, Other)');
        if (!reason || !reason.trim()) {
          showToast('Report cancelled. A reason is required.', 'info');
          return;
        }

        const reportPayload = {
          reason: reason.trim().slice(0, 200),
          reporterName: user.displayName || 'Classmate',
          reportedAt: Date.now()
        };

        try {
          await setOwnMapKey('superlatives', superlativeId, 'reports', user.uid, reportPayload);
          showToast('Thank you. Report sent to administrator for review.');
          render();
        } catch (err) {
          console.error('Report failed:', err);
          showToast(`Report failed: ${err.message}`, 'error');
        }
        return;
      }

      const nomineeRow = e.target.closest('.nominee-row');
      if (!nomineeRow) return;

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
          await setOwnMapKey('superlatives', superlativeId, 'votes', user.uid, null);
          showToast('Vote removed.');
        } else {
          await setOwnMapKey('superlatives', superlativeId, 'votes', user.uid, nomineeName);
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
        classId: store.get('currentClassId') || '',
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

  // P0-6: Screen-scoped subscription
  async function startSubscription() {
    const classId = store.get('currentClassId') || '';
    activeSub = await subscribeClassCollection('superlatives', classId, (_items, hasMore) => {
      render();
      if (loadMoreContainer) {
        loadMoreContainer.classList.toggle('hidden', !hasMore);
      }
    });
  }

  function stopSubscription() {
    unsubscribeCollection('superlatives');
    activeSub = null;
    if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
  }

  router.registerScreenHook('superlatives', {
    onEnter: startSubscription,
    onLeave: stopSubscription
  });

  store.subscribe('currentClassId', () => {
    if (router.activeScreenId === 'superlatives') startSubscription();
  });
  store.subscribe('user', render);
}
