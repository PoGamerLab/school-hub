import { store } from '../../core/store/store.js';
import { renderTeacherCard } from './teachers.render.js';
import { extractInitials, generateId } from '../../core/utils/ids.js';
import { showToast } from '../../components/toast/toast.js';

export function initTeachers() {
  const container = document.getElementById('teachers-container');
  const addTeacherForm = document.getElementById('add-teacher-form');
  const addTeacherModal = document.getElementById('add-teacher-modal');

  function render() {
    if (!container) return;
    const teachers = store.get('teachers') || [];
    if (teachers.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
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
    addTeacherForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('teacher-name').value.trim();
      const subject = document.getElementById('teacher-subject').value.trim();
      const room = document.getElementById('teacher-room').value.trim();
      const qual = document.getElementById('teacher-qual').value.trim();
      const img = document.getElementById('teacher-img').value.trim();

      const newTeacher = {
        id: generateId('tch'),
        name,
        initials: extractInitials(name, 'TR'),
        subject,
        qualification: qual,
        room,
        img
      };

      store.update('teachers', list => [newTeacher, ...list]);
      addTeacherForm.reset();
      if (addTeacherModal) addTeacherModal.classList.remove('active');
      showToast(`Added ${name} to Faculty directory.`, 'success');
    });
  }

  store.subscribe('teachers', () => {
    render();
  });

  render();
}
