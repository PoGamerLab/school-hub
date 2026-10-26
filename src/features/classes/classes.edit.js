/**
 * Edit Class Modal Handler (Admin).
 */

import { updateDocument } from '../../core/db/firestore.js';
import { showToast } from '../../components/toast/toast.js';
import { renderClassDetailBanner } from './classes.render.js';
import { authService } from '../../core/auth/auth.js';
import { store } from '../../core/store/store.js';
import { logAdminAction } from '../admin/admin.audit.js';
import { initFirebase } from '../../config/firebase.js';

export function initEditClassModal(getSelectedClass, onClassUpdated) {
  const editModal = document.getElementById('edit-class-modal');
  const editForm = document.getElementById('edit-class-form');
  const closeEditBtn = document.getElementById('close-edit-class-modal');

  closeEditBtn?.addEventListener('click', () => editModal?.classList.remove('active'));

  document.getElementById('class-detail-banner-root')?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('#open-edit-class-btn');
    const selectedClass = getSelectedClass();
    if (!editBtn || !selectedClass) return;

    document.getElementById('edit-class-id').value = selectedClass.id;
    document.getElementById('edit-class-name').value = selectedClass.name || '';
    document.getElementById('edit-class-grade').value = selectedClass.grade || '';
    document.getElementById('edit-class-section').value = selectedClass.section || '';
    document.getElementById('edit-class-teacher').value = selectedClass.classTeacher || '';

    const monitorSelect = document.getElementById('edit-class-monitor');
    if (monitorSelect) {
      monitorSelect.innerHTML = '<option value="">-- No Class Monitor Assigned --</option>';
      try {
        const fb = await initFirebase();
        const { collection, query, where, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const stuSnap = await getDocs(query(collection(fb.db, 'students'), where('classId', '==', selectedClass.id), limit(100)));
        stuSnap.forEach(d => {
          const s = d.data();
          const opt = document.createElement('option');
          opt.value = s.ownerUid || d.id;
          opt.textContent = `${s.name || 'Student'} (${s.category || 'Member'})`;
          if (opt.value === (selectedClass.monitorUid || '')) {
            opt.selected = true;
          }
          monitorSelect.appendChild(opt);
        });
      } catch (err) {
        console.warn('Could not load class students for monitor select:', err);
      }
    }

    editModal?.classList.add('active');
  });

  editForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const selectedClass = getSelectedClass();
    if (!selectedClass) return;

    const name = document.getElementById('edit-class-name').value.trim();
    const grade = document.getElementById('edit-class-grade').value.trim();
    const section = document.getElementById('edit-class-section').value.trim();
    const classTeacher = document.getElementById('edit-class-teacher').value.trim();
    const monitorUid = document.getElementById('edit-class-monitor')?.value || '';

    try {
      await updateDocument('classes', selectedClass.id, { name, grade, section, classTeacher, monitorUid });
      const prevMonitor = selectedClass.monitorUid || '';
      selectedClass.name = name;
      selectedClass.grade = grade;
      selectedClass.section = section;
      selectedClass.classTeacher = classTeacher;
      selectedClass.monitorUid = monitorUid;

      if (monitorUid !== prevMonitor) {
        await logAdminAction('SET_MONITOR', selectedClass.id, monitorUid ? `Assigned monitor ${monitorUid}` : 'Unassigned monitor');
      }

      const user = authService.getCurrentUser();
      const isMember = user && user.classId === selectedClass.id;
      const isAdmin = !!store.get('isAdmin');
      const bannerRoot = document.getElementById('class-detail-banner-root');
      if (bannerRoot) {
        bannerRoot.innerHTML = renderClassDetailBanner(selectedClass, isMember, isAdmin);
      }

      editModal?.classList.remove('active');
      showToast('Class information updated successfully!', 'success');
      if (onClassUpdated) await onClassUpdated();
    } catch (err) {
      showToast('Update failed. Check connection.', 'error');
    }
  });
}
