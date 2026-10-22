import { store } from '../../core/store/store.js';
import { renderReportedMemoryRow } from './admin.render.js';
import { showToast } from '../../components/toast/toast.js';

export function initAdmin() {
  const adminScreen = document.getElementById('admin');
  const reportsContainer = document.getElementById('admin-reports-list');
  const adminNavBtn = document.querySelector('[data-screen="admin"]');

  function updateAdminVisibility() {
    const isAdmin = store.get('isAdmin');
    if (adminNavBtn) {
      adminNavBtn.style.display = isAdmin ? 'inline-block' : 'none';
    }
  }

  function renderReports() {
    if (!reportsContainer) return;
    const memories = store.get('memories') || [];
    const flagged = memories.filter(m => (m.reportUids && m.reportUids.length > 0) || m.hidden);

    if (flagged.length === 0) {
      reportsContainer.innerHTML = '<div style="font-size:13px; color:#6b7268;">No reported items. Community is happy!</div>';
      return;
    }

    reportsContainer.innerHTML = flagged.map(m => renderReportedMemoryRow(m)).join('');
  }

  if (reportsContainer) {
    reportsContainer.addEventListener('click', (e) => {
      const restoreBtn = e.target.closest('[data-action="restore"]');
      if (restoreBtn) {
        const id = restoreBtn.dataset.id;
        store.update('memories', list => list.map(m => m.id === id ? { ...m, hidden: false, reportUids: [] } : m));
        showToast('Item restored to public wall.', 'success');
        return;
      }

      const deleteBtn = e.target.closest('[data-action="delete"]');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        store.update('memories', list => list.filter(m => m.id !== id));
        showToast('Inappropriate item permanently removed.', 'info');
      }
    });
  }

  store.subscribe('isAdmin', () => {
    updateAdminVisibility();
  });

  store.subscribe('memories', () => {
    renderReports();
  });

  updateAdminVisibility();
  renderReports();
}
