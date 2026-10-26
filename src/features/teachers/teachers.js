import { store } from '../../core/store/store.js';
import { router } from '../../core/router/router.js';
import { authService } from '../../core/auth/auth.js';
import { renderTeacherCard } from './teachers.render.js';
import { extractInitials } from '../../core/utils/ids.js';
import { showToast } from '../../components/toast/toast.js';
import { subscribeClassCollection, unsubscribeCollection, createDocument, updateDocument, deleteDocument } from '../../core/db/firestore.js';
import { logAdminAction } from '../admin/admin.audit.js';

export function initTeachers() {
  const container = document.getElementById('teachers-container');
  const addTeacherForm = document.getElementById('add-teacher-form');
  const addTeacherModal = document.getElementById('add-teacher-modal');
  const loadMoreContainer = document.getElementById('teachers-load-more-container');
  const loadMoreBtn = document.getElementById('teachers-load-more-btn');
  const openTeacherModalBtn = document.getElementById('open-add-teacher-modal');

  let activeSub = null;
  let editingTeacherId = null;

  const modalTitle = addTeacherModal?.querySelector('h3');
  const submitBtn = addTeacherForm?.querySelector('button[type="submit"]');

  function resetTeacherModal() {
    editingTeacherId = null;
    if (modalTitle) modalTitle.textContent = 'Add Faculty Member';
    if (submitBtn) submitBtn.textContent = 'Add Teacher';
    if (addTeacherForm) addTeacherForm.reset();
  }

  if (openTeacherModalBtn) {
    openTeacherModalBtn.addEventListener('click', () => {
      resetTeacherModal();
    });
  }

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
    const isAdmin = Boolean(store.get('isAdmin'));
    container.innerHTML = teachers.map(tch => renderTeacherCard(tch, { isAdmin })).join('');
    container.querySelectorAll('.teacher-photo-img').forEach(img => {
      img.addEventListener('error', () => {
        img.remove();
      }, { once: true });
    });
  }

  // Delegated click listener for admin Edit and Delete actions
  if (container) {
    container.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('[data-action="edit-teacher"]');
      const delBtn = e.target.closest('[data-action="delete-teacher"]');
      const isAdmin = Boolean(store.get('isAdmin'));

      if (editBtn) {
        if (!isAdmin) {
          showToast('Only administrators can edit faculty.', 'error');
          return;
        }
        const id = editBtn.dataset.id;
        const teachers = store.get('teachers') || [];
        const tch = teachers.find(t => t.id === id);
        if (!tch) return;

        editingTeacherId = id;
        if (modalTitle) modalTitle.textContent = 'Edit Faculty Member';
        if (submitBtn) submitBtn.textContent = 'Save Changes';

        const nameInput = document.getElementById('teacher-name');
        const subjectInput = document.getElementById('teacher-subject');
        const roomInput = document.getElementById('teacher-room');
        const qualInput = document.getElementById('teacher-qual');
        const imgInput = document.getElementById('teacher-img');

        if (nameInput) nameInput.value = tch.name || '';
        if (subjectInput) subjectInput.value = tch.subject || '';
        if (roomInput) roomInput.value = tch.room || '';
        if (qualInput) qualInput.value = tch.qualification || '';
        if (imgInput) imgInput.value = tch.img || '';

        if (addTeacherModal) addTeacherModal.classList.add('active');
        return;
      }

      if (delBtn) {
        if (!isAdmin) {
          showToast('Only administrators can delete faculty.', 'error');
          return;
        }
        const id = delBtn.dataset.id;
        const name = delBtn.dataset.name || 'this teacher';
        if (!confirm(`Are you sure you want to remove ${name} from the faculty directory?`)) return;

        try {
          await deleteDocument('teachers', id);
          await logAdminAction('DELETE_TEACHER', id, name);
          showToast(`Removed ${name} from faculty directory.`, 'info');
        } catch (err) {
          console.error('Failed to delete teacher:', err);
          showToast('Could not remove teacher.', 'error');
        }
      }
    });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', async () => {
      if (activeSub && activeSub.loadMore) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = 'Loading...';
        await activeSub.loadMore();
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load More Faculty';
      }
    });
  }

  if (addTeacherForm) {
    addTeacherForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = authService.getCurrentUser();
      const isAdmin = Boolean(store.get('isAdmin'));
      if (!user || !isAdmin) {
        showToast('Only administrators can modify faculty members.', 'error');
        return;
      }

      const name = document.getElementById('teacher-name').value.trim();
      const subject = document.getElementById('teacher-subject').value.trim();
      const room = document.getElementById('teacher-room').value.trim();
      const qual = document.getElementById('teacher-qual').value.trim();
      const img = document.getElementById('teacher-img').value.trim();

      if (img && !img.startsWith('https://')) {
        showToast('Teacher photo URL must start with https://', 'error');
        return;
      }

      const payload = {
        name,
        subject,
        room,
        qualification: qual,
        img: img || '',
        initials: extractInitials(name, 'TR')
      };

      try {
        if (editingTeacherId) {
          await updateDocument('teachers', editingTeacherId, payload);
          await logAdminAction('EDIT_TEACHER', editingTeacherId, name);
          showToast(`Updated ${name} in Faculty directory.`, 'success');
        } else {
          payload.classId = store.get('currentClassId') || '';
          payload.ownerUid = user.uid;
          await createDocument('teachers', payload);
          showToast(`Added ${name} to Faculty directory.`, 'success');
        }
        resetTeacherModal();
        if (addTeacherModal) addTeacherModal.classList.remove('active');
      } catch (err) {
        console.error('Failed to save teacher:', err);
        showToast(`Error: ${err.message}`, 'error');
      }
    });
  }

  // P0-6: Screen-scoped subscription on school screen (school-wide faculty)
  async function startSubscription() {
    activeSub = await subscribeClassCollection('teachers', '', (_items, hasMore) => {
      render();
      if (loadMoreContainer) {
        loadMoreContainer.classList.toggle('hidden', !hasMore);
      }
    });
  }

  function stopSubscription() {
    unsubscribeCollection('teachers');
    activeSub = null;
    if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
  }

  router.registerScreenHook('school', {
    onEnter: startSubscription,
    onLeave: stopSubscription
  });

  store.subscribe('currentClassId', () => {
    if (router.activeScreenId === 'school') startSubscription();
  });
}
