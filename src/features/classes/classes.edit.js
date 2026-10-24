/**
 * Edit Class Modal Handler (Admin).
 */

import { updateDocument } from '../../core/db/firestore.js';
import { showToast } from '../../components/toast/toast.js';
import { renderClassDetailBanner } from './classes.render.js';
import { authService } from '../../core/auth/auth.js';
import { store } from '../../core/store/store.js';

export function initEditClassModal(getSelectedClass, onClassUpdated) {
  const editModal = document.getElementById('edit-class-modal');
  const editForm = document.getElementById('edit-class-form');
  const closeEditBtn = document.getElementById('close-edit-class-modal');

  closeEditBtn?.addEventListener('click', () => editModal?.classList.remove('active'));

  document.getElementById('class-detail-banner-root')?.addEventListener('click', (e) => {
    const editBtn = e.target.closest('#open-edit-class-btn');
    const selectedClass = getSelectedClass();
    if (!editBtn || !selectedClass) return;

    document.getElementById('edit-class-id').value = selectedClass.id;
    document.getElementById('edit-class-name').value = selectedClass.name || '';
    document.getElementById('edit-class-grade').value = selectedClass.grade || '';
    document.getElementById('edit-class-section').value = selectedClass.section || '';
    document.getElementById('edit-class-teacher').value = selectedClass.classTeacher || '';
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

    try {
      await updateDocument('classes', selectedClass.id, { name, grade, section, classTeacher });
      selectedClass.name = name;
      selectedClass.grade = grade;
      selectedClass.section = section;
      selectedClass.classTeacher = classTeacher;

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
