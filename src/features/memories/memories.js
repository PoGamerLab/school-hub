import { store } from '../../core/store/store.js';
import { authService } from '../../core/auth/auth.js';
import { renderMemoryCard } from './memories.render.js';
import { showToast } from '../../components/toast/toast.js';
import { subscribeClassCollection, createDocument, setOwnMapKey } from '../../core/db/firestore.js';

export function initMemories() {
  const container = document.getElementById('memories-container');
  const addMemoryForm = document.getElementById('add-memory-form');
  const addMemoryModal = document.getElementById('add-memory-modal');

  function render() {
    if (!container) return;
    const memories = store.get('memories') || [];
    const user = authService.getCurrentUser();
    const uid = user ? user.uid : null;
    const isAdmin = store.get('isAdmin');

    // Dynamic auto-hide: 3 or more reports hide from public view unless admin reviewed
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

  // Handle reactions and reports via event delegation
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
        const reactionType = reactionBtn.dataset.type; // 'laugh' | 'heart' | 'fire'
        const hasReacted = reactionBtn.classList.contains('active');

        try {
          if (hasReacted) {
            await setOwnMapKey('memories', memoryId, 'reactions', null);
          } else {
            await setOwnMapKey('memories', memoryId, 'reactions', reactionType);
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
          await setOwnMapKey('memories', memoryId, 'reports', true);
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
        classId: store.get('currentClassId') || '10-b',
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

  function attachSubscription() {
    const classId = store.get('currentClassId') || '10-b';
    subscribeClassCollection('memories', classId, () => {
      render();
    });
  }

  store.subscribe('currentClassId', attachSubscription);
  store.subscribe('user', render);
  attachSubscription();
}
