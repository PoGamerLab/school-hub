/**
 * Administrator Panel logic (Phase 3 Architecture).
 */

import { store } from '../../core/store/store.js';
import { router } from '../../core/router/router.js';
import { showToast } from '../../components/toast/toast.js';
import { updateDocument, deleteDocument } from '../../core/db/firestore.js';
import { logAdminAction } from '../../core/siteConfig.js';
import { loadAndRenderMembers } from './admin.members.js';
import { loadAndRenderSiteControls, loadAndRenderActivityLog } from './admin.controls.js';
import { loadAndRenderClassManager, loadAndRenderGateEditor } from './admin.gate.js';
import { loadAndRenderModerationQueue, attachModerationEvents } from './admin.moderation.js';

export function initAdmin() {
  const tabBar = document.getElementById('admin-tab-bar');

  function updateAdminVisibility() {
    const isAdmin = store.get('isAdmin');
    document.querySelectorAll('[data-screen="admin"]').forEach(el => {
      el.classList.toggle('hidden-admin', !isAdmin);
    });
  }

  function initTabs() {
    if (!tabBar) return;
    tabBar.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.admin-tab');
      if (!tabBtn) return;
      const tabKey = tabBtn.dataset.tab;
      if (!tabKey) return;

      tabBar.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tabBtn.classList.add('active');

      document.querySelectorAll('.admin-tab-pane').forEach(pane => pane.classList.remove('active'));
      const targetPane = document.getElementById(`admin-pane-${tabKey}`);
      if (targetPane) targetPane.classList.add('active');

      loadTabContent(tabKey);
    });
  }

  function loadTabContent(tabKey) {
    if (tabKey === 'classes-gate') {
      loadAndRenderClassManager();
      loadAndRenderGateEditor();
    } else if (tabKey === 'moderation') {
      loadAndRenderModerationQueue();
    } else if (tabKey === 'members') {
      loadAndRenderMembers();
    } else if (tabKey === 'controls') {
      loadAndRenderSiteControls();
    } else if (tabKey === 'activity') {
      loadAndRenderActivityLog();
    }
  }

  initTabs();
  attachModerationEvents();

  router.registerScreenHook('admin', {
    onEnter: () => {
      const activeTab = tabBar?.querySelector('.admin-tab.active')?.dataset.tab || 'classes-gate';
      loadTabContent(activeTab);
    },
    onLeave: () => {}
  });

  store.subscribe('isAdmin', updateAdminVisibility);
  updateAdminVisibility();
}
