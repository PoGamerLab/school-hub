import { store } from '../../core/store/store.js';
import { renderReportedMemoryRow } from './admin.render.js';
import { showToast } from '../../components/toast/toast.js';
import { updateDocument, deleteDocument } from '../../core/db/firestore.js';

export function initAdmin() {
  const reportsContainer = document.getElementById('admin-reports-list');
  const adminNavBtn = document.querySelector('[data-screen="admin"]');

  function updateAdminVisibility() {
    const isAdmin = store.get('isAdmin');
    if (adminNavBtn) {
      if (isAdmin) {
        adminNavBtn.classList.remove('hidden-admin');
      } else {
        adminNavBtn.classList.add('hidden-admin');
      }
    }
  }

  function renderReports() {
    if (!reportsContainer) return;
    const memories = store.get('memories') || [];
    const flagged = memories.filter(m => Object.keys(m.reports || {}).length > 0);

    if (flagged.length === 0) {
      reportsContainer.innerHTML = '<div class="admin-empty-notice">No reported items. Community is happy!</div>';
      return;
    }

    reportsContainer.innerHTML = flagged.map(m => renderReportedMemoryRow(m)).join('');
  }

  if (reportsContainer) {
    reportsContainer.addEventListener('click', async (e) => {
      const restoreBtn = e.target.closest('[data-action="restore"]');
      if (restoreBtn) {
        const id = restoreBtn.dataset.id;
        try {
          // Set adminReviewed: true and clear reports
          await updateDocument('memories', id, { reports: {}, adminReviewed: true });
          showToast('Item restored to public wall.', 'success');
        } catch (err) {
          showToast(`Restore failed: ${err.message}`, 'error');
        }
        return;
      }

      const deleteBtn = e.target.closest('[data-action="delete"]');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        try {
          await deleteDocument('memories', id);
          showToast('Flagged item permanently deleted.', 'info');
        } catch (err) {
          showToast(`Delete failed: ${err.message}`, 'error');
        }
      }
    });
  }

  store.subscribe('isAdmin', updateAdminVisibility);
  store.subscribe('memories', renderReports);

  updateAdminVisibility();
  renderReports();
}
