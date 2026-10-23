import { initFirebase } from '../../config/firebase.js';
import { renderSiteControls, renderAuditLog } from './admin.render.js';
import { showToast } from '../../components/toast/toast.js';
import { getDocument, setDocument } from '../../core/db/firestore.js';
import { logAdminAction } from '../../core/siteConfig.js';

export async function loadAndRenderSiteControls() {
  const container = document.getElementById('admin-controls-root');
  if (!container) return;

  try {
    const [status, announcement] = await Promise.all([
      getDocument('siteConfig', 'status'),
      getDocument('siteConfig', 'announcement')
    ]);

    container.innerHTML = renderSiteControls(status, announcement);
    attachControlEvents();
  } catch (err) {
    console.error('Failed to load site controls:', err);
    container.innerHTML = '<div class="admin-empty-notice">Failed to load site controls.</div>';
  }
}

function attachControlEvents() {
  const roToggle = document.getElementById('admin-readonly-toggle');
  const annForm = document.getElementById('admin-announcement-form');

  if (roToggle) {
    roToggle.addEventListener('change', async (e) => {
      const readOnly = e.target.checked;
      try {
        await setDocument('siteConfig', 'status', { readOnly });
        await logAdminAction('TOGGLE_READONLY', '', `ReadOnly set to ${readOnly}`);
        showToast(`Site read-only mode ${readOnly ? 'ENABLED' : 'DISABLED'}.`, readOnly ? 'info' : 'success');
      } catch (err) {
        showToast(`Failed to update mode: ${err.message}`, 'error');
        roToggle.checked = !readOnly;
      }
    });
  }

  if (annForm) {
    annForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = document.getElementById('admin-ann-text').value.trim();
      const active = document.getElementById('admin-ann-active').checked;
      const saveBtn = document.getElementById('admin-ann-save-btn');

      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Updating...';
      }

      try {
        await setDocument('siteConfig', 'announcement', { text, active });
        await logAdminAction('UPDATE_ANNOUNCEMENT', '', active ? `Active: "${text}"` : 'Announcement deactivated');
        showToast('Site announcement updated successfully!', 'success');
      } catch (err) {
        showToast(`Announcement save failed: ${err.message}`, 'error');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Update Announcement';
        }
      }
    });
  }
}

export async function loadAndRenderActivityLog() {
  const container = document.getElementById('admin-activity-root');
  if (!container) return;

  try {
    const fb = await initFirebase();
    if (!fb || !fb.db) return;
    const { collection, getDocs, query, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const q = query(collection(fb.db, 'adminLog'), orderBy('createdAt', 'desc'), limit(100));
    const snap = await getDocs(q);
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    container.innerHTML = renderAuditLog(logs);
  } catch (err) {
    console.error('Failed to load audit logs:', err);
    container.innerHTML = '<div class="admin-empty-notice">No audit log records found or index initializing.</div>';
  }
}
