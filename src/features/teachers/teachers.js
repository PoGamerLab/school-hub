import { store } from '../../core/store/store.js';
import { authService } from '../../core/auth/auth.js';
import { renderTeacherCard } from './teachers.render.js';
import { extractInitials } from '../../core/utils/ids.js';
import { showToast } from '../../components/toast/toast.js';
import { subscribeClassCollection, createDocument } from '../../core/db/firestore.js';

export function initTeachers() {
  const container = document.getElementById('teachers-container');
  const addTeacherForm = document.getElementById('add-teacher-form');
  const addTeacherModal = document.getElementById('add-teacher-modal');

  function render() {
    if (!container) return;
    const teachers = store.get('teachers') || [];
    if (teachers.length === 0) {
      container.innerHTML = `
        <div class="empty-state full-width-empty">
          <div class="empty-state-icon">👨‍🏫</div>
          <div class="empty-state-title">No Faculty Members Added Yet</div>
          <div class="empty-state-desc">Click "+ Add Teacher" to add faculty members.</div>
        </div>
      `;
      return;
    }
    container.innerHTML = teachers.map(tch => renderTeacherCard(tch)).join('');
  }

  if (addTeacherForm) {
    addTeacherForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = authService.getCurrentUser();
      if (!user) {
        showToast('Please sign in to add a teacher.', 'error');
        return;
      }

      const name = document.getElementById('teacher-name').value.trim();
      const subject = document.getElementById('teacher-subject').value.trim();
      const room = document.getElementById('teacher-room').value.trim();
      const qual = document.getElementById('teacher-qual').value.trim();
      const img = document.getElementById('teacher-img').value.trim();

      const payload = {
        classId: store.get('currentClassId') || '10-b',
        ownerUid: user.uid,
        name,
        subject,
        room,
        qualification: qual,
        img: img || '',
        initials: extractInitials(name, 'TR')
      };

      try {
        await createDocument('teachers', payload);
        addTeacherForm.reset();
        if (addTeacherModal) addTeacherModal.classList.remove('active');
        showToast(`Added ${name} to Faculty directory.`, 'success');
      } catch (err) {
        console.error('Failed to add teacher:', err);
        showToast(`Error: ${err.message}`, 'error');
      }
    });
  }

  function attachSubscription() {
    const classId = store.get('currentClassId') || '10-b';
    subscribeClassCollection('teachers', classId, () => {
      render();
    });
  }

  store.subscribe('currentClassId', attachSubscription);
  attachSubscription();
}
