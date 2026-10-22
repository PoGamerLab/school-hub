import { store } from '../../core/store/store.js';
import { router } from '../../core/router/router.js';
import { renderStudentCard, renderProfileView } from './students.render.js';
import { extractInitials, getRandomGradient, generateId } from '../../core/utils/ids.js';
import { showToast } from '../../components/toast/toast.js';

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
    const searchQuery = store.get('searchQuery').toLowerCase();

    return students.filter(student => {
      const matchesCategory = (activeCategory === 'All' || student.category.toLowerCase() === activeCategory.toLowerCase());
      const matchesSearch = student.name.toLowerCase().includes(searchQuery) ||
                            student.tags.toLowerCase().includes(searchQuery) ||
                            student.roll.toString().includes(searchQuery);
      return matchesCategory && matchesSearch;
    });
  }

  function renderGrid() {
    if (!gridContainer) return;
    const list = getFilteredStudents();

    if (list.length === 0) {
      gridContainer.innerHTML = `
        <div class="empty-state">
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
      `<option value="${s.id}">Roll ${s.roll} — ${s.name}</option>`
    ).join('');
    studentSelect.value = store.get('currentStudentId') || students[0].id;
  }

  function updateProfile(studentId) {
    const students = store.get('students') || [];
    if (students.length === 0) {
      store.set('currentStudentId', null, false);
      renderProfileView(null);
      return;
    }
    const current = students.find(s => s.id === studentId) || students[0];
    if (current) {
      store.set('currentStudentId', current.id, false);
      if (studentSelect) studentSelect.value = current.id;
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
    addStudentForm.addEventListener('submit', (e) => {
      e.preventDefault();
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

      const newStudent = {
        id: generateId('std'),
        classId: store.get('currentClassId'),
        name,
        initials: extractInitials(name),
        roll,
        role: `GRADE 10 · SECTION B · ROLL NO. ${roll}`,
        category,
        tags,
        gradient: getRandomGradient(),
        bio,
        favSubject,
        hobbies: tags,
        favQuote: favQuote ? (favQuote.startsWith('"') ? favQuote : `"${favQuote}"`) : '',
        birthday,
        showBirthday,
        funFact,
        contact,
        showContact
      };

      store.update('students', list => [newStudent, ...list]);
      addStudentForm.reset();
      if (addStudentModal) addStudentModal.classList.remove('active');

      showToast(`Profile created for ${name}!`, 'success');
      router.navigate('profile', { id: newStudent.id });
    });
  }

  // Subscribe to store updates
  store.subscribe('students', () => {
    updateDropdown();
    renderGrid();
    updateProfile(store.get('currentStudentId'));
  });

  store.subscribe('currentStudentId', (id) => {
    updateProfile(id);
  });

  // Initial render
  updateDropdown();
  renderGrid();
  updateProfile(store.get('currentStudentId'));
}
