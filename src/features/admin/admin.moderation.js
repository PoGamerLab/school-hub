/**
 * Unified Admin Moderation Queue (Phase A6).
 * Single reportQueue query, grouped by target, with on-demand preview fetch.
 */

import { initFirebase } from '../../config/firebase.js';
import { authService } from '../../core/auth/auth.js';
import { showToast } from '../../components/toast/toast.js';
import { logAdminAction } from './admin.audit.js';
import { renderModerationRow } from './admin.moderation.render.js';
import { updateDocument } from '../../core/db/firestore.js';

const groupsMap = new Map();
let lastVisibleQueueDoc = null;
let eventsAttached = false;

function renderCurrentGroups() {
  const container = document.getElementById('admin-moderation-list');
  if (!container) return;

  if (groupsMap.size === 0) {
    container.innerHTML = '<div class="admin-empty-notice">No open reports. All clear! ✨</div>';
    return;
  }

  container.innerHTML = Array.from(groupsMap.values()).map(renderModerationRow).join('');
}

export async function loadAndRenderModerationQueue(isLoadMore = false) {
  const container = document.getElementById('admin-moderation-list');
  const loadMoreBox = document.getElementById('admin-moderation-load-more');
  if (!container) return;

  if (!isLoadMore) {
    groupsMap.clear();
    lastVisibleQueueDoc = null;
    container.innerHTML = '<div class="admin-empty-notice">Loading moderation reports…</div>';
  }

  try {
    const fb = await initFirebase();
    if (!fb?.db) return;
    const { collection, query, orderBy, limit, startAfter, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    let q = query(collection(fb.db, 'reportQueue'), orderBy('createdAt', 'desc'), limit(100));
    if (isLoadMore && lastVisibleQueueDoc) {
      q = query(collection(fb.db, 'reportQueue'), orderBy('createdAt', 'desc'), startAfter(lastVisibleQueueDoc), limit(100));
    }

    const snap = await getDocs(q);

    if (snap.empty) {
      if (!isLoadMore) {
        container.innerHTML = '<div class="admin-empty-notice">No open reports. All clear! ✨</div>';
      }
      if (loadMoreBox) loadMoreBox.classList.add('hidden');
      return;
    }

    lastVisibleQueueDoc = snap.docs[snap.docs.length - 1];

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const groupKey = `${data.kind}_${data.targetId}`;

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          key: groupKey,
          kind: data.kind,
          targetId: data.targetId,
          targetPath: data.targetPath,
          classId: data.classId || '',
          reports: [],
          expanded: false,
          targetLoaded: false,
          targetData: null
        });
      }

      groupsMap.get(groupKey).reports.push({
        id: docSnap.id,
        reporterUid: data.reporterUid,
        reason: data.reason,
        details: data.details,
        createdAt: data.createdAt
      });
    });

    renderCurrentGroups();

    if (loadMoreBox) {
      loadMoreBox.classList.toggle('hidden', snap.docs.length < 100);
    }
  } catch (err) {
    console.error('Failed to load reportQueue:', err);
    container.innerHTML = '<div class="admin-empty-notice admin-error-notice">Could not load moderation reports. Please check connection.</div>';
    if (loadMoreBox) loadMoreBox.classList.add('hidden');
  }
}

export function attachModerationEvents() {
  if (eventsAttached) return;
  eventsAttached = true;

  const container = document.getElementById('admin-moderation-list');
  const refreshBtn = document.getElementById('admin-refresh-moderation-btn');
  const loadMoreBtn = document.getElementById('admin-moderation-more-btn');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadAndRenderModerationQueue(false));
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => loadAndRenderModerationQueue(true));
  }

  if (container) {
    container.addEventListener('click', async (e) => {
      const previewBtn = e.target.closest('[data-action="toggle-preview"]');
      const dismissBtn = e.target.closest('[data-action="dismiss-group"]');
      const deleteBtn = e.target.closest('[data-action="delete-content"]');
      const removePhotoBtn = e.target.closest('[data-action="remove-photo"]');
      const muteBtn = e.target.closest('[data-action="mute-author"]');
      const banBtn = e.target.closest('[data-action="ban-user"]');

      if (previewBtn) {
        const key = previewBtn.dataset.key;
        const group = groupsMap.get(key);
        if (!group) return;

        group.expanded = !group.expanded;
        if (group.expanded && !group.targetLoaded) {
          renderCurrentGroups();
          try {
            const fb = await initFirebase();
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
            const targetSnap = await getDoc(doc(fb.db, group.targetPath));
            group.targetData = targetSnap.exists() ? targetSnap.data() : null;
          } catch (_) {
            group.targetData = null;
          }
          group.targetLoaded = true;
        }
        renderCurrentGroups();
        return;
      }

      if (dismissBtn) {
        const key = dismissBtn.dataset.key;
        const group = groupsMap.get(key);
        if (!group) return;

        try {
          const fb = await initFirebase();
          const { doc, writeBatch } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
          const batch = writeBatch(fb.db);

          group.reports.forEach(r => batch.delete(doc(fb.db, 'reportQueue', r.id)));

          if (group.kind === 'photo') {
            batch.update(doc(fb.db, group.targetPath), { photoReports: {} });
          } else if (['chat', 'memory', 'superlative'].includes(group.kind)) {
            batch.update(doc(fb.db, group.targetPath), { reports: {} });
          }

          await batch.commit();
          await logAdminAction('DISMISS_REPORTS', group.targetId, `Dismissed ${group.reports.length} report(s) on ${group.kind}`);
          showToast('Reports dismissed.', 'success');
          groupsMap.delete(key);
          renderCurrentGroups();
        } catch (err) {
          showToast(`Dismiss failed: ${err.message}`, 'error');
        }
        return;
      }

      if (deleteBtn) {
        const key = deleteBtn.dataset.key;
        const group = groupsMap.get(key);
        if (!group) return;

        if (!confirm(`Permanently delete this reported ${group.kind} item?`)) return;

        try {
          const fb = await initFirebase();
          const { doc, writeBatch } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
          const batch = writeBatch(fb.db);

          group.reports.forEach(r => batch.delete(doc(fb.db, 'reportQueue', r.id)));
          batch.delete(doc(fb.db, group.targetPath));

          await batch.commit();
          await logAdminAction(`DELETE_REPORTED_${group.kind.toUpperCase()}`, group.targetId, `Deleted reported ${group.kind}`);
          showToast('Content permanently deleted.', 'info');
          groupsMap.delete(key);
          renderCurrentGroups();
        } catch (err) {
          showToast(`Delete failed: ${err.message}`, 'error');
        }
        return;
      }

      if (removePhotoBtn) {
        const key = removePhotoBtn.dataset.key;
        const group = groupsMap.get(key);
        if (!group) return;
        const name = removePhotoBtn.dataset.name || 'this student';

        if (!confirm(`Remove reported profile photo of ${name}?`)) return;

        try {
          const fb = await initFirebase();
          const user = authService.getCurrentUser();
          const { doc, writeBatch, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
          const batch = writeBatch(fb.db);

          batch.update(doc(fb.db, 'students', group.targetId), {
            photoSource: 'none',
            photoThumb: '',
            googlePhotoUrl: '',
            photoReports: {}
          });
          batch.delete(doc(fb.db, 'avatars', group.targetId));
          batch.update(doc(fb.db, 'users', group.targetId), {
            photoRemovedNotice: 'Your profile photo was removed by administration for violating community guidelines.'
          });
          group.reports.forEach(r => batch.delete(doc(fb.db, 'reportQueue', r.id)));

          const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          batch.set(doc(fb.db, 'adminLog', logId), {
            actorUid: user.uid,
            action: 'REMOVE_PHOTO',
            targetUid: group.targetId,
            details: `Removed photo for ${name}`,
            createdAt: serverTimestamp()
          });

          await batch.commit();
          showToast(`Profile photo removed for ${name}.`, 'info');
          groupsMap.delete(key);
          renderCurrentGroups();
        } catch (err) {
          showToast(`Removal failed: ${err.message}`, 'error');
        }
        return;
      }

      if (muteBtn) {
        const { uid, name } = muteBtn.dataset;
        if (!confirm(`Mute ${name} from sending chat messages for 24 hours?`)) return;

        try {
          const { Timestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
          const muteExpiry = Timestamp.fromDate(new Date(Date.now() + 24 * 3600 * 1000));
          await updateDocument('users', uid, { mutedUntil: muteExpiry });
          await logAdminAction('MUTE_USER', uid, `Muted student ${name} for 24 hours`);
          showToast(`${name} is now muted for 24 hours.`, 'info');
        } catch (err) {
          showToast(`Mute failed: ${err.message}`, 'error');
        }
        return;
      }

      if (banBtn) {
        const { uid, name } = banBtn.dataset;
        if (!confirm(`Are you sure you want to revoke membership and ban ${name}?`)) return;

        try {
          const fb = await initFirebase();
          const user = authService.getCurrentUser();
          const { doc, writeBatch, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
          const batch = writeBatch(fb.db);

          batch.update(doc(fb.db, 'users', uid), { banned: true, status: 'revoked' });
          const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          batch.set(doc(fb.db, 'adminLog', logId), {
            actorUid: user.uid,
            action: 'BAN_USER',
            targetUid: uid,
            details: `Banned from moderation queue`,
            createdAt: serverTimestamp()
          });

          await batch.commit();
          showToast(`Account for ${name} banned.`, 'info');
        } catch (err) {
          showToast(`Ban failed: ${err.message}`, 'error');
        }
      }
    });
  }
}
