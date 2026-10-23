import { store } from '../../core/store/store.js';
import { router } from '../../core/router/router.js';
import { authService } from '../../core/auth/auth.js';
import { renderMemoryCard } from './memories.render.js';
import { showToast } from '../../components/toast/toast.js';
import { subscribeClassCollection, unsubscribeCollection, createDocument, setOwnMapKey } from '../../core/db/firestore.js';

export function initMemories() {
  const container = document.getElementById('memories-container');
  const addMemoryForm = document.getElementById('add-memory-form');
  const addMemoryModal = document.getElementById('add-memory-modal');
  const loadMoreContainer = document.getElementById('memories-load-more-container');
  const loadMoreBtn = document.getElementById('memories-load-more-btn');

  let activeSub = null;

  function render() {
    if (!container) return;
    const memories = store.get('memories') || [];
    const user = authService.getCurrentUser();
    const uid = user ? user.uid : null;
    const isAdmin = store.get('isAdmin');

    const visibleMemories = memories.filter(m => {
      const reportCount = Object.keys(m.reports || {}).length;
      return isAdmin || m.adminReviewed || reportCount < 3;
    });

    if (visibleMemories.length === 0) {
      container.innerHTML = `
        <div class="empty-state full-width-empty">
          <div class="empty-state-icon">💭</div>
          <div class="empty-state-title">Memory Wall is Quiet</div>
          <div class="empty-state-desc">Click "+ Add Memory" to post quotes and moments from class.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = visibleMemories.map(mem => renderMemoryCard(mem, uid)).join('');
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', async () => {
      if (activeSub && activeSub.loadMore) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = 'Loading...';
        await activeSub.loadMore();
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load More Memories';
      }
    });
  }

  if (container) {
    container.addEventListener('click', async (e) => {
      const user = authService.getCurrentUser();

      const reactionBtn = e.target.closest('[data-action="reaction"]');
      if (reactionBtn) {
        if (!user) {
          showToast('Please sign in with Google to react to memories.', 'error');
          return;
        }

        const memoryId = reactionBtn.dataset.id;
        const reactionType = reactionBtn.dataset.code;
        const hasReacted = reactionBtn.classList.contains('user-reacted');

        try {
          if (hasReacted) {
            await setOwnMapKey('memories', memoryId, 'reactions', user.uid, null);
          } else {
            await setOwnMapKey('memories', memoryId, 'reactions', user.uid, reactionType);
          }
          render();
        } catch (err) {
          console.error('Reaction failed:', err);
          showToast(`Action failed: ${err.message}`, 'error');
        }
        return;
      }

      const reportBtn = e.target.closest('[data-action="report"]');
      if (reportBtn) {
        if (!user) {
          showToast('Please sign in with Google to report a post.', 'error');
          return;
        }

        const memoryId = reportBtn.dataset.id;
        if (!confirm('Are you sure you want to flag this entry for moderator review?')) {
          return;
        }

        try {
          await setOwnMapKey('memories', memoryId, 'reports', user.uid, true);
          showToast('Thank you. Entry flagged for moderator review.');
          render();
        } catch (err) {
          console.error('Report failed:', err);
          showToast(`Report failed: ${err.message}`, 'error');
        }
      }
    });
  }

  if (addMemoryForm) {
    addMemoryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = authService.getCurrentUser();
      if (!user) {
        showToast('Please sign in to add a memory.', 'error');
        return;
      }

      const quote = document.getElementById('memory-quote').value.trim();
      const author = document.getElementById('memory-author').value.trim();
      const context = document.getElementById('memory-context').value.trim();

      const payload = {
        classId: store.get('currentClassId') || '',
        authorUid: user.uid,
        quote,
        author,
        context,
        reactions: {},
        reports: {}
      };

      try {
        await createDocument('memories', payload);
        addMemoryForm.reset();
        if (addMemoryModal) addMemoryModal.classList.remove('active');
        showToast('Memory added to the wall!', 'success');
      } catch (err) {
        console.error('Failed to post memory:', err);
        showToast(`Error: ${err.message}`, 'error');
      }
    });
  }

  // P0-6: Screen-scoped subscription
  async function startSubscription() {
    const classId = store.get('currentClassId') || '';
    activeSub = await subscribeClassCollection('memories', classId, (_items, hasMore) => {
      render();
      if (loadMoreContainer) {
        loadMoreContainer.classList.toggle('hidden', !hasMore);
      }
    });
  }

  function stopSubscription() {
    unsubscribeCollection('memories');
    activeSub = null;
    if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
  }

  router.registerScreenHook('memories', {
    onEnter: startSubscription,
    onLeave: stopSubscription
  });

  store.subscribe('currentClassId', () => {
    if (router.activeScreenId === 'memories') startSubscription();
  });
  store.subscribe('user', render);
}
