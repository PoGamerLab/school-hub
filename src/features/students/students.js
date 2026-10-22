import { store } from '../../core/store/store.js';
import { router } from '../../core/router/router.js';
import { authService } from '../../core/auth/auth.js';
import { renderStudentCard, renderProfileView } from './students.render.js';
import { extractInitials } from '../../core/utils/ids.js';
import { showToast } from '../../components/toast/toast.js';
import { subscribeClassCollection, createDocument } from '../../core/db/firestore.js';

let unsubscribeStudents = null;

export function initStudents() {
  const gridContainer = document.querySelector('.grid');
  const searchInput = document.querySelector('.search input');
  const chipButtons = document.querySelectorAll('.chips .chip');
  const studentSelect = document.getElementById('profile-student-select');
  const backToStudentsBtn = document.getElementById('back-to-students-btn');
  const addStudentForm = document.getElementById('add-student-form');
  const addStudentModal = document.getElementById('add-student-modal');

  function getFilteredStudents() {
    const students = store.get('students') || [];
    const activeCategory = store.get('activeCategory');
    const searchQuery = (store.get('searchQuery') || '').toLowerCase();

    return students.filter(student => {
      const matchesCategory = (activeCategory === 'All' || (student.category && student.category.toLowerCase() === activeCategory.toLowerCase()));
      const matchesSearch = (student.name && student.name.toLowerCase().includes(searchQuery)) ||
                            (student.tags && student.tags.toLowerCase().includes(searchQuery)) ||
                            (student.roll && student.roll.toString().includes(searchQuery));
      return matchesCategory && matchesSearch;
    });
  }

  function renderGrid() {
    if (!gridContainer) return;
    const list = getFilteredStudents();

    if (list.length === 0) {
      gridContainer.innerHTML = `
        <div class="empty-state full-width-empty">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-title">No Classmates Found</div>
          <div class="empty-state-desc">Try clearing the search box or selecting "All" categories.</div>
        </div>
      `;
      return;
    }

    gridContainer.innerHTML = list.map(s => renderStudentCard(s)).join('');
  }

  function updateDropdown() {
    if (!studentSelect) return;
    const students = store.get('students') || [];
    if (students.length === 0) {
      studentSelect.innerHTML = '<option value="">No profiles yet</option>';
      studentSelect.disabled = true;
      return;
    }
    studentSelect.disabled = false;
    studentSelect.innerHTML = students.map(s => 
      `<option value="${s.id || s.uid}">Roll ${s.roll} — ${s.name}</option>`
    ).join('');
    studentSelect.value = store.get('currentStudentId') || (students[0].id || students[0].uid);
  }

  function updateProfile(studentId) {
    const students = store.get('students') || [];
    if (students.length === 0) {
      store.set('currentStudentId', null, false);
      renderProfileView(null);
      return;
    }
    const current = students.find(s => (s.id || s.uid) === studentId) || students[0];
    if (current) {
      const id = current.id || current.uid;
      store.set('currentStudentId', id, false);
      if (studentSelect) studentSelect.value = id;
      renderProfileView(current);
    }
  }

  // Event Listeners
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      store.set('searchQuery', e.target.value, false);
      renderGrid();
    });
  }

  chipButtons.forEach(chip => {
    chip.addEventListener('click', () => {
      chipButtons.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      store.set('activeCategory', chip.textContent.trim(), false);
      renderGrid();
    });
  });

  if (gridContainer) {
    gridContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (card) {
        const studentId = card.dataset.id;
        router.navigate('profile', { id: studentId });
      }
    });
  }

  if (studentSelect) {
    studentSelect.addEventListener('change', (e) => {
      router.navigate('profile', { id: e.target.value });
    });
  }

  if (backToStudentsBtn) {
    backToStudentsBtn.addEventListener('click', () => {
      router.navigate('students');
    });
  }

  // Handle Form Submission
  if (addStudentForm) {
    addStudentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = authService.getCurrentUser();
      if (!user) {
        showToast('Please sign in with Google to create your student profile.', 'error');
        return;
      }

      const name = document.getElementById('student-name').value.trim();
      const roll = document.getElementById('student-roll').value.trim();
      const category = document.getElementById('student-category').value;
      const tags = document.getElementById('student-tags').value.trim();
      const bio = document.getElementById('student-bio').value.trim();
      const favSubject = document.getElementById('student-subject').value.trim();
      const birthday = document.getElementById('student-birthday').value.trim();
      const favQuote = document.getElementById('student-quote').value.trim();
      const funFact = document.getElementById('student-fact').value.trim();
      const contact = document.getElementById('student-contact').value.trim();

      const showBirthday = document.getElementById('student-show-birthday')?.checked ?? false;
      const showContact = document.getElementById('student-show-contact')?.checked ?? false;

      // Construct compliant document payload
      const payload = {
        classId: store.get('currentClassId') || '10-b',
        ownerUid: user.uid,
        name,
        roll,
        category,
        tags,
        bio,
        favSubject,
        favQuote: favQuote ? (favQuote.startsWith('"') ? favQuote : `"${favQuote}"`) : '',
        funFact,
        gradientIndex: Math.floor(Math.random() * 8),
        initials: extractInitials(name),
        showBirthday,
        showContact
      };

      // Strict privacy rule enforcement: only include birthday/contact if show is true
      if (showBirthday && birthday) {
        payload.birthday = birthday;
      }
      if (showContact && contact) {
        payload.contact = contact;
      }

      try {
        await createDocument('students', payload, user.uid);
        addStudentForm.reset();
        if (addStudentModal) addStudentModal.classList.remove('active');
        showToast(`Profile published for ${name}!`, 'success');
        router.navigate('profile', { id: user.uid });
      } catch (err) {
        console.error('Failed to publish profile:', err);
        showToast(`Error: ${err.message}`, 'error');
      }
    });
  }

  // Subscribe to students in current class
  function attachSubscription() {
    const classId = store.get('currentClassId') || '10-b';
    subscribeClassCollection('students', classId, (list) => {
      store.set('students', list, false);
      renderGrid();
      updateDropdown();
      updateProfile(store.get('currentStudentId'));
    });
  }

  store.subscribe('currentClassId', () => {
    attachSubscription();
  });

  store.subscribe('currentStudentId', (id) => {
    updateProfile(id);
  });

  attachSubscription();
}
