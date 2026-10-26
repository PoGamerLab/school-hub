/**
 * Admin Panel: Members Management (Phase A4).
 */

import { initFirebase } from '../../config/firebase.js';
import { renderMembersManager, renderUserRow } from './admin.render.js';
import { showToast } from '../../components/toast/toast.js';
import { runBatchWrite, getDocument } from '../../core/db/firestore.js';
import { fetchActiveClasses } from '../gate/gate.db.js';
import { authService } from '../../core/auth/auth.js';

let cachedUsers = [];
let cachedClasses = [];
let lastUserDoc = null;
let hasMoreUsers = false;

export async function loadAndRenderMembers() {
  const container = document.getElementById('admin-members-root');
  if (!container) return;

  try {
    const fb = await initFirebase();
    if (!fb || !fb.db) return;
    const { collection, getDocs, query, orderBy, limit } =
      await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const [userSnap, classes] = await Promise.all([
      getDocs(query(collection(fb.db, 'users'), orderBy('createdAt', 'desc'), limit(50))),
      fetchActiveClasses()
    ]);

    cachedClasses = classes;
    cachedUsers = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    lastUserDoc = userSnap.docs[userSnap.docs.length - 1] || null;
    hasMoreUsers = userSnap.docs.length === 50;

    container.innerHTML = renderMembersManager(cachedUsers, classes);
    attachMemberEvents(container);
  } catch (err) {
    console.error('Failed to load members:', err);
    container.innerHTML = '<div class="admin-empty-notice">Failed to load member records.</div>';
  }
}

function attachMemberEvents(container) {
  const searchInput = document.getElementById('admin-user-search-input');
  const rowsContainer = document.getElementById('admin-users-rows-container');

  if (searchInput && rowsContainer) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = cachedUsers.filter(u =>
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.classId && u.classId.toLowerCase().includes(q))
      );
      rowsContainer.innerHTML = filtered.length > 0
        ? filtered.map(u => renderUserRow(u, cachedClasses)).join('')
        : '<div class="admin-empty-notice">No matching users found.</div>';
    });
  }

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const uid = btn.dataset.uid;
    if (!uid) return;

    btn.disabled = true;
    const adminUser = authService.getCurrentUser();
    const adminUid = adminUser?.uid || 'admin';
    const logId = () => `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      if (action === 'approve-user') {
        if (!confirm('Approve membership for this user?')) { btn.disabled = false; return; }
        const stu = await getDocument('students', uid);
        const u = cachedUsers.find(x => x.id === uid);
        if (!u?.classId) {
          showToast('Move this user to a class first.', 'error');
          btn.disabled = false;
          return;
        }
        await runBatchWrite([
          { type: 'set', collection: 'users', id: uid, data: { status: stu ? 'active' : 'needs_profile', banned: false }, merge: true },
          ...(stu ? [{ type: 'set', collection: 'students', id: uid, data: { verified: true }, merge: true }] : []),
          { type: 'set', collection: 'adminLog', id: logId(), data: { action: 'APPROVE_USER', actorUid: adminUid, targetUid: uid }, withTimestamp: true, timestampField: 'createdAt' }
        ]);
        showToast('User membership approved.', 'success');
        await loadAndRenderMembers();
      } else if (action === 'reset-gate') {
        if (!confirm('Reset gate verification attempts for this user?')) { btn.disabled = false; return; }
        const u = cachedUsers.find(x => x.id === uid);
        const ops = [{ type: 'delete', collection: 'gate', id: uid }];
        if (u?.status !== 'needs_gate') {
          ops.push({ type: 'set', collection: 'users', id: uid, data: { status: 'needs_gate' }, merge: true });
        }
        ops.push({ type: 'set', collection: 'adminLog', id: logId(), data: { action: 'RESET_GATE', actorUid: adminUid, targetUid: uid, note: 'Cleared gate attempts' }, withTimestamp: true, timestampField: 'createdAt' });
        await runBatchWrite(ops);
        showToast('User gate status reset.', 'info');
        await loadAndRenderMembers();
      } else if (action === 'ban-user') {
        if (!confirm('Ban this user? They will be locked out immediately.')) { btn.disabled = false; return; }
        await runBatchWrite([
          { type: 'set', collection: 'users', id: uid, data: { banned: true }, merge: true },
          { type: 'set', collection: 'adminLog', id: logId(), data: { action: 'BAN_USER', actorUid: adminUid, targetUid: uid, note: 'User banned from platform' }, withTimestamp: true, timestampField: 'createdAt' }
        ]);
        showToast('User banned.', 'error');
        await loadAndRenderMembers();
      } else if (action === 'unban-user') {
        if (!confirm('Unban this user?')) { btn.disabled = false; return; }
        await runBatchWrite([
          { type: 'set', collection: 'users', id: uid, data: { banned: false }, merge: true },
          { type: 'set', collection: 'adminLog', id: logId(), data: { action: 'UNBAN_USER', actorUid: adminUid, targetUid: uid, note: 'User unbanned' }, withTimestamp: true, timestampField: 'createdAt' }
        ]);
        showToast('User unbanned.', 'success');
        await loadAndRenderMembers();
      } else if (action === 'revoke-user') {
        if (!confirm('Revoke access for this user?')) { btn.disabled = false; return; }
        await runBatchWrite([
          { type: 'set', collection: 'users', id: uid, data: { status: 'revoked' }, merge: true },
          { type: 'set', collection: 'adminLog', id: logId(), data: { action: 'REVOKE_USER', actorUid: adminUid, targetUid: uid, note: 'User status set to revoked' }, withTimestamp: true, timestampField: 'createdAt' }
        ]);
        showToast('User access revoked.', 'info');
        await loadAndRenderMembers();
      } else if (action === 'delete-profile') {
        const reason = prompt('Why are you deleting this student profile?\n(This reason will be displayed to the student when they log in so they can recreate their profile properly)');
        if (!reason || !reason.trim()) {
          showToast('Deletion cancelled. A reason is required.', 'info');
          btn.disabled = false;
          return;
        }
        await runBatchWrite([
          { type: 'delete', collection: 'students', id: uid },
          { type: 'delete', collection: 'avatars', id: uid },
          { type: 'set', collection: 'users', id: uid, data: { status: 'needs_profile', profileDeletedReason: reason.trim(), profileDeletedAt: Date.now() }, merge: true },
          { type: 'set', collection: 'adminLog', id: logId(), data: { action: 'DELETE_PROFILE', actorUid: adminUid, targetUid: uid, reason: reason.trim() }, withTimestamp: true, timestampField: 'createdAt' }
        ]);
        showToast('Student profile deleted. Student must recreate it on next visit.', 'success');
        await loadAndRenderMembers();
      }
    } catch (err) {
      console.error('Member action failed:', err);
      showToast('Action failed. Check permissions.', 'error');
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
    const adminUser = authService.getCurrentUser();
    const adminUid = adminUser?.uid || 'admin';

    try {
      const stu = await getDocument('students', uid);
      const ops = [
        { type: 'set', collection: 'users', id: uid, data: { classId: newClassId }, merge: true },
        ...(stu ? [{ type: 'set', collection: 'students', id: uid, data: { classId: newClassId }, merge: true }] : []),
        { type: 'set', collection: 'adminLog', id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, data: { action: 'MOVE_CLASS', actorUid: adminUid, targetUid: uid, newClassId }, withTimestamp: true, timestampField: 'createdAt' }
      ];
      await runBatchWrite(ops);
      showToast(`User moved to class ${newClassId}.`, 'success');
      await loadAndRenderMembers();
    } catch (err) {
      console.error('Failed to change class:', err);
      showToast('Failed to change class.', 'error');
    } finally {
      select.disabled = false;
    }
  });
}
