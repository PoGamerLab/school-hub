import { store } from '../../core/store/store.js';
import { router } from '../../core/router/router.js';
import { authService } from '../../core/auth/auth.js';
import { renderSuperlativeCard } from './superlatives.render.js';
import { showToast } from '../../components/toast/toast.js';
import { subscribeClassCollection, unsubscribeCollection, createDocument, deleteDocument, setOwnMapKey } from '../../core/db/firestore.js';
import { logAdminAction } from '../admin/admin.audit.js';

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
    const isAdmin = Boolean(store.get('isAdmin'));

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

    container.innerHTML = superlatives.map(item => renderSuperlativeCard(item, currentUid, { isAdmin })).join('');
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

      const delBtn = e.target.closest('[data-action="delete-superlative"]');
      if (delBtn) {
        if (!user) {
          showToast('Please sign in to delete superlatives.', 'error');
          return;
        }
        const id = delBtn.dataset.id;
        const createdBy = delBtn.dataset.creator || '';
        const isAdmin = Boolean(store.get('isAdmin'));

        if (!isAdmin && user.uid !== createdBy) {
          showToast('You can only delete your own superlatives.', 'error');
          return;
        }

        if (!confirm('Are you sure you want to delete this superlative category?')) return;

        try {
          await deleteDocument('superlatives', id);
          if (isAdmin && user.uid !== createdBy) {
            await logAdminAction('DELETE_SUPERLATIVE', id, 'Deleted superlative category');
          }
          showToast('Superlative category deleted.', 'info');
        } catch (err) {
          console.error('Failed to delete superlative:', err);
          showToast('Could not delete superlative category.', 'error');
        }
        return;
      }

      const reportBtn = e.target.closest('[data-action="report-superlative"]');
      if (reportBtn) {
        if (!user) {
          showToast('Please sign in with Google to report a category.', 'error');
          return;
        }

        const superlativeId = reportBtn.dataset.id;
        const rawReason = prompt('Why are you reporting this superlative category? (inappropriate, harassment, spam, other):', 'inappropriate');
        if (!rawReason) return;
        const safeReason = ['inappropriate', 'harassment', 'spam', 'other'].includes(rawReason.toLowerCase().trim())
          ? rawReason.toLowerCase().trim()
          : 'other';
        const details = (prompt('Optional details (up to 200 characters):') || '').slice(0, 200);

        try {
          const { initFirebase } = await import('../../config/firebase.js');
          const fb = await initFirebase();
          const { doc, writeBatch, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
          const batch = writeBatch(fb.db);
          batch.update(doc(fb.db, 'superlatives', superlativeId), {
            [`reports.${user.uid}`]: { reason: safeReason, details, createdAt: serverTimestamp() }
          });
          const classId = (store.get('currentClassId') || '').slice(0, 30);
          batch.set(doc(fb.db, 'reportQueue', `superlative_${superlativeId}_${user.uid}`), {
            kind: 'superlative', classId, targetId: superlativeId.slice(0, 100), targetPath: `superlatives/${superlativeId}`,
            reporterUid: user.uid, reason: safeReason, details, createdAt: serverTimestamp()
          });
          await batch.commit();
          showToast('Thank you. Report sent to administrator for review.', 'info');
          render();
        } catch (err) {
          console.error('Report failed:', err);
          showToast('Could not submit report.', 'error');
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
        votes: {},
        reports: {}
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
