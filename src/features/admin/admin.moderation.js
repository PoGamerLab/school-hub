/**
 * Admin Moderation Queue (Phase C5, 6.7).
 * Handles moderation of reported memories, superlatives, chat messages, and student photos.
 */

import { initFirebase } from '../../config/firebase.js';
import { store } from '../../core/store/store.js';
import { showToast } from '../../components/toast/toast.js';
import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';
import { logAdminAction } from '../../core/siteConfig.js';
import { renderReportedMemoryRow } from './admin.render.js';
import { renderAvatarHtml, bindAvatarFallbacks } from '../../components/avatar/avatar.js';

export async function loadAndRenderModerationQueue() {
  renderMemoriesAndSuperlatives();
  await loadAndRenderChatReports();
  await loadAndRenderPhotoReports();
}

function renderMemoriesAndSuperlatives() {
  const container = document.getElementById('admin-reports-list');
  if (!container) return;

  const memories = store.get('memories') || [];
  const superlatives = store.get('superlatives') || [];

  const flaggedMemories = memories.filter(m => m.reports && Object.keys(m.reports).length > 0).map(m => ({ ...m, itemType: 'memories' }));
  const flaggedSuperlatives = superlatives.filter(s => s.reports && Object.keys(s.reports).length > 0).map(s => ({ ...s, itemType: 'superlatives', quote: s.title, author: 'Superlative' }));

  const allFlagged = [...flaggedMemories, ...flaggedSuperlatives];

  if (allFlagged.length === 0) {
    container.innerHTML = '<div class="admin-empty-notice">No reported memories or superlatives. Clean board! ✨</div>';
    return;
  }

  container.innerHTML = allFlagged.map(renderReportedMemoryRow).join('');
}

async function loadAndRenderChatReports() {
  const container = document.getElementById('admin-chat-reports-list');
  if (!container) return;
  container.innerHTML = '<div class="admin-empty-notice">Checking class chats for reports…</div>';

  try {
    const fb = await initFirebase();
    if (!fb?.db) return;
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const classes = store.get('activeClasses') || [];
    const reportedMessages = [];

    for (const c of classes) {
      try {
        const msgsSnap = await getDocs(collection(fb.db, 'classChats', c.id, 'messages'));
        msgsSnap.forEach(d => {
          const data = d.data();
          if (data.reports && Object.keys(data.reports).length > 0) {
            reportedMessages.push({ id: d.id, classId: c.id, className: c.name || c.id, ...data });
          }
        });
      } catch (e) {
        console.warn(`Could not check chat for class ${c.id}:`, e);
      }
    }

    if (reportedMessages.length === 0) {
      container.innerHTML = '<div class="admin-empty-notice">No flagged chat messages across any class! 💬✨</div>';
      return;
    }

    container.innerHTML = reportedMessages.map(msg => {
      const reports = Object.entries(msg.reports || {});
      const reasonsList = reports.map(([reporterUid, r]) => {
        const reason = typeof r === 'object' && r?.reason ? r.reason : 'Flagged';
        const details = typeof r === 'object' && r?.details ? ` - ${r.details}` : '';
        return `<div><strong>Report:</strong> ${escapeHtml(reason)}${escapeHtml(details)}</div>`;
      }).join('');

      return `
        <div class="admin-item-row" data-id="${escapeAttr(msg.id)}" data-class="${escapeAttr(msg.classId)}">
          <div>
            <div class="admin-item-quote">
              <span class="tag tag-gold">${escapeHtml(msg.className)}</span> "${escapeHtml(msg.text)}"
            </div>
            <div class="admin-item-meta">Author: <strong>${escapeHtml(msg.authorName || 'Student')}</strong> &middot; Flagged by ${reports.length} student(s)</div>
            <div class="admin-report-reasons">${reasonsList}</div>
          </div>
          <div class="admin-actions">
            <button class="btn-restore" data-action="dismiss-chat" data-id="${escapeAttr(msg.id)}" data-class="${escapeAttr(msg.classId)}">Dismiss</button>
            <button class="btn-danger" data-action="delete-chat" data-id="${escapeAttr(msg.id)}" data-class="${escapeAttr(msg.classId)}">Delete Msg</button>
            <button class="btn-secondary" data-action="mute-user" data-uid="${escapeAttr(msg.authorUid)}" data-name="${escapeAttr(msg.authorName || 'Student')}">Mute 24h</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load chat reports:', err);
    container.innerHTML = '<div class="admin-empty-notice">Error loading chat reports.</div>';
  }
}

async function loadAndRenderPhotoReports() {
  const container = document.getElementById('admin-photo-reports-list');
  if (!container) return;
  container.innerHTML = '<div class="admin-empty-notice">Scanning for photo reports…</div>';

  try {
    const fb = await initFirebase();
    if (!fb?.db) return;
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const snap = await getDocs(collection(fb.db, 'students'));
    const reportedStudents = [];

    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.photoReports && Object.keys(data.photoReports).length > 0) {
        reportedStudents.push({ id: docSnap.id, ...data });
      }
    });

    if (reportedStudents.length === 0) {
      container.innerHTML = '<div class="admin-empty-notice">No profile photos reported. Everything looks good! 📷✨</div>';
      return;
    }

    container.innerHTML = reportedStudents.map(st => {
      const reports = Object.entries(st.photoReports || {});
      const reasonsList = reports.map(([uid, r]) => {
        const reason = typeof r === 'object' && r?.reason ? r.reason : 'Inappropriate';
        const details = typeof r === 'object' && r?.details ? ` - ${r.details}` : '';
        return `<div><strong>Report:</strong> ${escapeHtml(reason)}${escapeHtml(details)}</div>`;
      }).join('');

      const avatarHtml = renderAvatarHtml({
        photoSource: st.photoSource,
        photoThumb: st.photoThumb,
        googlePhotoUrl: st.googlePhotoUrl,
        initials: st.initials,
        gradientIndex: st.gradientIndex,
        size: 'md'
      });

      return `
        <div class="admin-item-row" data-id="${escapeAttr(st.id)}">
          <div class="d-flex align-items-center gap-3">
            <div>${avatarHtml}</div>
            <div>
              <div class="admin-item-quote"><strong>${escapeHtml(st.name)}</strong> (${escapeHtml(st.classId || 'No Class')})</div>
              <div class="admin-item-meta">Photo Source: ${escapeHtml(st.photoSource || 'none')} &middot; ${reports.length} report(s)</div>
              <div class="admin-report-reasons">${reasonsList}</div>
            </div>
          </div>
          <div class="admin-actions">
            <button class="btn-restore" data-action="dismiss-photo" data-id="${escapeAttr(st.id)}">Dismiss</button>
            <button class="btn-danger" data-action="remove-photo" data-id="${escapeAttr(st.id)}" data-name="${escapeAttr(st.name)}">Remove Photo</button>
          </div>
        </div>
      `;
    }).join('');

    bindAvatarFallbacks(container);
  } catch (err) {
    console.error('Failed to load photo reports:', err);
    container.innerHTML = '<div class="admin-empty-notice">Error loading photo reports.</div>';
  }
}

export function attachModerationEvents() {
  const chatContainer = document.getElementById('admin-chat-reports-list');
  const photoContainer = document.getElementById('admin-photo-reports-list');

  chatContainer?.addEventListener('click', async (e) => {
    const dismissBtn = e.target.closest('[data-action="dismiss-chat"]');
    const deleteBtn = e.target.closest('[data-action="delete-chat"]');
    const muteBtn = e.target.closest('[data-action="mute-user"]');

    if (dismissBtn) {
      const { id, class: classId } = dismissBtn.dataset;
      try {
        const fb = await initFirebase();
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        await updateDoc(doc(fb.db, 'classChats', classId, 'messages', id), { reports: {} });
        await logAdminAction('DISMISS_CHAT_REPORT', id, `Dismissed chat report in ${classId}`);
        showToast('Chat reports dismissed.', 'success');
        await loadAndRenderChatReports();
      } catch (err) {
        showToast(`Action failed: ${err.message}`, 'error');
      }
    }

    if (deleteBtn) {
      const { id, class: classId } = deleteBtn.dataset;
      if (!confirm('Permanently delete this reported chat message?')) return;
      try {
        const fb = await initFirebase();
        const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        await deleteDoc(doc(fb.db, 'classChats', classId, 'messages', id));
        await logAdminAction('DELETE_CHAT_MSG', id, `Deleted reported message in ${classId}`);
        showToast('Message deleted.', 'info');
        await loadAndRenderChatReports();
      } catch (err) {
        showToast(`Delete failed: ${err.message}`, 'error');
      }
    }

    if (muteBtn) {
      const { uid, name } = muteBtn.dataset;
      if (!confirm(`Mute ${name} from sending chat messages for 24 hours?`)) return;
      try {
        const fb = await initFirebase();
        const { doc, updateDoc, Timestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const muteExpiry = Timestamp.fromDate(new Date(Date.now() + 24 * 3600 * 1000));
        await updateDoc(doc(fb.db, 'users', uid), { mutedUntil: muteExpiry });
        await logAdminAction('MUTE_USER', uid, `Muted student ${name} for 24 hours`);
        showToast(`${name} is now muted for 24 hours.`, 'info');
      } catch (err) {
        showToast(`Mute failed: ${err.message}`, 'error');
      }
    }
  });

  photoContainer?.addEventListener('click', async (e) => {
    const dismissBtn = e.target.closest('[data-action="dismiss-photo"]');
    const removeBtn = e.target.closest('[data-action="remove-photo"]');

    if (dismissBtn) {
      const id = dismissBtn.dataset.id;
      try {
        const fb = await initFirebase();
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        await updateDoc(doc(fb.db, 'students', id), { photoReports: {} });
        await logAdminAction('DISMISS_PHOTO_REPORT', id, 'Dismissed photo reports');
        showToast('Photo reports dismissed.', 'success');
        await loadAndRenderPhotoReports();
      } catch (err) {
        showToast(`Action failed: ${err.message}`, 'error');
      }
    }

    if (removeBtn) {
      const { id, name } = removeBtn.dataset;
      if (!confirm(`Remove reported profile photo of ${name}?`)) return;
      try {
        const fb = await initFirebase();
        const { doc, writeBatch, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const batch = writeBatch(fb.db);
        batch.update(doc(fb.db, 'students', id), { photoSource: 'none', photoThumb: '', googlePhotoUrl: '', photoReports: {} });
        batch.update(doc(fb.db, 'users', id), { photoRemovedNotice: 'Your profile photo was removed by administration for violating community guidelines.' });
        await batch.commit();

        try {
          await deleteDoc(doc(fb.db, 'avatars', id));
        } catch (_) {}

        await logAdminAction('REMOVE_PHOTO', id, `Removed photo for ${name}`);
        showToast(`Profile photo removed for ${name}.`, 'info');
        await loadAndRenderPhotoReports();
      } catch (err) {
        showToast(`Removal failed: ${err.message}`, 'error');
      }
    }
  });
}
