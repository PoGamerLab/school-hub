import { initFirebase } from '../../config/firebase.js';
import { renderMembersManager } from './admin.render.js';
import { showToast } from '../../components/toast/toast.js';
import { updateDocument, deleteDocument } from '../../core/db/firestore.js';
import { fetchActiveClasses } from '../gate/gate.db.js';
import { logAdminAction } from '../../core/siteConfig.js';

export async function loadAndRenderMembers() {
  const container = document.getElementById('admin-members-root');
  if (!container) return;

  try {
    const fb = await initFirebase();
    if (!fb || !fb.db) return;
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const [userSnap, classes] = await Promise.all([
      getDocs(collection(fb.db, 'users')),
      fetchActiveClasses()
    ]);

    const users = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    container.innerHTML = renderMembersManager(users, classes);
    attachMemberEvents(users, classes);
  } catch (err) {
    console.error('Failed to load members:', err);
    container.innerHTML = '<div class="admin-empty-notice">Failed to load member records.</div>';
  }
}

function attachMemberEvents(allUsers, classes) {
  const container = document.getElementById('admin-members-root');
  const searchInput = document.getElementById('admin-user-search-input');
  const rowsContainer = document.getElementById('admin-users-rows-container');

  if (searchInput && rowsContainer) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = allUsers.filter(u => 
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.classId && u.classId.toLowerCase().includes(q))
      );
      rowsContainer.innerHTML = filtered.length > 0
        ? filtered.map(u => renderSingleUserRow(u, classes)).join('')
        : '<div class="admin-empty-notice">No matching users found.</div>';
    });
  }

  if (container) {
    container.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const uid = btn.dataset.uid;
      if (!uid) return;

      btn.disabled = true;

      try {
        if (action === 'approve-user') {
          await updateDocument('users', uid, { status: 'active', banned: false });
          try {
            await updateDocument('students', uid, { verified: true });
          } catch {}
          await logAdminAction('APPROVE_USER', uid, 'Manually activated account');
          showToast('User membership approved and activated.', 'success');
          await loadAndRenderMembers();
        } else if (action === 'reset-gate') {
          if (!confirm('Reset gate verification attempts for this user?')) {
            btn.disabled = false;
            return;
          }
          await deleteDocument('gate', uid);
          await updateDocument('users', uid, { status: 'needs_gate' });
          await logAdminAction('RESET_GATE', uid, 'Cleared gate attempts');
          showToast('User gate status reset.', 'info');
          await loadAndRenderMembers();
        } else if (action === 'ban-user') {
          if (!confirm('Ban this user? They will be locked out immediately.')) {
            btn.disabled = false;
            return;
          }
          await updateDocument('users', uid, { banned: true });
          await logAdminAction('BAN_USER', uid, 'User banned from platform');
          showToast('User banned.', 'error');
          await loadAndRenderMembers();
        } else if (action === 'unban-user') {
          await updateDocument('users', uid, { banned: false });
          await logAdminAction('UNBAN_USER', uid, 'User unbanned');
          showToast('User unbanned.', 'success');
          await loadAndRenderMembers();
        } else if (action === 'revoke-user') {
          if (!confirm('Revoke access for this user?')) {
            btn.disabled = false;
            return;
          }
          await updateDocument('users', uid, { status: 'revoked' });
          await logAdminAction('REVOKE_USER', uid, 'User status set to revoked');
          showToast('User access revoked.', 'info');
          await loadAndRenderMembers();
        }
      } catch (err) {
        console.error('Member action failed:', err);
        showToast(`Action failed: ${err.message}`, 'error');
      } finally {
        btn.disabled = false;
      }
    });

    container.addEventListener('change', async (e) => {
      const select = e.target.closest('.admin-user-class-select');
      if (!select) return;
      const uid = select.dataset.uid;
      const newClassId = select.value;
      if (!uid || !newClassId) return;

      select.disabled = true;
      try {
        await updateDocument('users', uid, { classId: newClassId });
        try {
          await updateDocument('students', uid, { classId: newClassId });
        } catch {}
        await logAdminAction('MOVE_CLASS', uid, `Moved user to class: ${newClassId}`);
        showToast(`User moved to class ${newClassId}.`, 'success');
        await loadAndRenderMembers();
      } catch (err) {
        showToast(`Failed to change class: ${err.message}`, 'error');
      } finally {
        select.disabled = false;
      }
    });
  }
}

function renderSingleUserRow(u, classes) {
  const safeUid = u.id;
  const safeName = u.displayName || 'Unnamed User';
  const safeEmail = u.email || 'No email';
  const safeClass = u.classId || 'None';
  const isBanned = u.banned === true;
  const status = isBanned ? 'banned' : (u.status || 'needs_gate');

  const statusBadgeClass = {
    active: 'tag-active',
    needs_gate: 'tag-pending',
    needs_profile: 'tag-pending',
    revoked: 'tag-danger',
    banned: 'tag-danger'
  }[status] || 'tag-pending';

  const classOptions = classes.map(c => 
    `<option value="${c.id}" ${c.id === u.classId ? 'selected' : ''}>${c.name || c.id}</option>`
  ).join('');

  return `
    <div class="admin-user-row" data-uid="${safeUid}">
      <div class="admin-user-info">
        <div class="admin-user-name">${safeName} <span class="tag ${statusBadgeClass}">${status.toUpperCase()}</span></div>
        <div class="admin-user-meta">${safeEmail} &middot; Class: <strong>${safeClass}</strong> &middot; UID: <span class="mono">${safeUid.slice(0, 8)}...</span></div>
      </div>
      <div class="admin-user-actions">
        ${status !== 'active' && !isBanned ? `
          <button class="btn btn-sm btn-restore" data-action="approve-user" data-uid="${safeUid}">Approve</button>
        ` : ''}
        ${(status === 'active' || status === 'needs_profile') ? `
          <button class="btn btn-sm btn-outline" data-action="reset-gate" data-uid="${safeUid}" title="Reset gate attempts">Reset Gate</button>
        ` : ''}
        <div class="admin-move-class-box">
          <select class="admin-user-class-select" data-uid="${safeUid}">
            <option value="">Move Class...</option>
            ${classOptions}
          </select>
        </div>
        ${!isBanned ? `
          <button class="btn btn-sm btn-danger" data-action="ban-user" data-uid="${safeUid}">Ban</button>
        ` : `
          <button class="btn btn-sm btn-restore" data-action="unban-user" data-uid="${safeUid}">Unban</button>
        `}
        ${status !== 'revoked' ? `
          <button class="btn btn-sm btn-outline-danger" data-action="revoke-user" data-uid="${safeUid}">Revoke</button>
        ` : ''}
      </div>
    </div>
  `;
}
