import { store } from '../../core/store/store.js';
import { router } from '../../core/router/router.js';
import { authService } from '../../core/auth/auth.js';
import { renderStudentCard, renderProfileView } from './students.render.js';
import { showToast } from '../../components/toast/toast.js';
import { subscribeClassCollection, unsubscribeCollection } from '../../core/db/firestore.js';
import { openProfileModal, initProfileForm } from './students.modal.js';

export function initStudents() {
  const gridContainer = document.querySelector('.grid');
  const searchInput = document.querySelector('.search input');
  const chipButtons = document.querySelectorAll('.chips .chip');
  const studentSelect = document.getElementById('profile-student-select');
  const backToStudentsBtn = document.getElementById('back-to-students-btn');
  const addStudentForm = document.getElementById('add-student-form');
  const addStudentModal = document.getElementById('add-student-modal');
  const loadMoreContainer = document.getElementById('students-load-more-container');
  const loadMoreBtn = document.getElementById('students-load-more-btn');

  let activeSub = null;

  function getFilteredStudents() {
    const students = store.get('students') || [];
    const activeCategory = store.get('activeCategory');
    const searchQuery = (store.get('searchQuery') || '').toLowerCase();
    const user = authService.getCurrentUser();
    const isAdmin = !!store.get('isAdmin');

    return students.filter(student => {
      // Hide admin or student profile if showInDirectory is false, unless viewing own or is admin
      const isOwn = user && (student.id === user.uid || student.ownerUid === user.uid);
      if (student.showInDirectory === false && !isAdmin && !isOwn) {
        return false;
      }

      const filter = (activeCategory || 'All').toLowerCase();
      const matchesCategory = filter === 'all' ||
                              (student.category && student.category.toLowerCase() === filter) ||
                              (student.house && student.house.toLowerCase() === filter);
      const matchesSearch = !searchQuery ||
                            (student.name && student.name.toLowerCase().includes(searchQuery)) ||
                            (student.tags && student.tags.toLowerCase().includes(searchQuery)) ||
                            (student.house && student.house.toLowerCase().includes(searchQuery)) ||
                            (student.group && student.group.toLowerCase().includes(searchQuery)) ||
                            (student.favSubject && student.favSubject.toLowerCase().includes(searchQuery));
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
    const students = getFilteredStudents();
    if (students.length === 0) {
      studentSelect.innerHTML = '<option value="">No profiles yet</option>';
      studentSelect.disabled = true;
      return;
    }
    studentSelect.disabled = false;
    studentSelect.innerHTML = students.map(s => 
      `<option value="${s.id || s.uid}">${s.name} (${s.house || 'Unity'} House)</option>`
    ).join('');
    studentSelect.value = store.get('currentStudentId') || (students[0].id || students[0].uid);
  }

  function updateProfile(studentId) {
    const students = store.get('students') || [];
    const user = authService.getCurrentUser();
    const isViewingOwn = !studentId || (user && (studentId === user.uid || studentId === 'my-profile'));

    let current = null;
    if (studentId && studentId !== 'my-profile') {
      current = students.find(s => (s.id || s.uid) === studentId);
    } else if (user) {
      current = students.find(s => (s.id || s.uid) === user.uid || s.ownerUid === user.uid);
    }

    if (!current && isViewingOwn) {
      // Current user has not created a profile yet (e.g. admin who skipped onboarding)
      store.set('currentStudentId', user?.uid || null, false);
      renderProfileView({ isUncreated: true }, user ? user.uid : null);
      return;
    }

    if (!current && students.length > 0) {
      current = students[0];
    }

    if (current) {
      const id = current.id || current.uid;
      store.set('currentStudentId', id, false);
      if (studentSelect) studentSelect.value = id;
      renderProfileView(current, user ? user.uid : null);
    } else {
      store.set('currentStudentId', null, false);
      renderProfileView(null);
    }
  }

  // Profile action buttons (Edit Profile or Create Profile) on #profile
  document.querySelector('#profile')?.addEventListener('click', (e) => {
    const editBtn = e.target.closest('#edit-my-profile-btn');
    const createBtn = e.target.closest('#create-my-profile-btn');
    if (!editBtn && !createBtn) return;
    const user = authService.getCurrentUser();
    const students = store.get('students') || [];
    const myProfile = students.find(s => (s.id || s.uid) === user?.uid || s.ownerUid === user?.uid);
    openProfileModal(myProfile);
  });

  initProfileForm();

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', async () => {
      if (activeSub && activeSub.loadMore) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = 'Loading...';
        await activeSub.loadMore();
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load More Students';
      }
    });
  }

  if (searchInput) {
    let searchTimer = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        store.set('searchQuery', e.target.value, false);
        renderGrid();
      }, 120);
    });
  }

  chipButtons.forEach(chip => {
    chip.addEventListener('click', () => {
      chipButtons.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filterVal = chip.dataset.filter || chip.textContent.trim();
      store.set('activeCategory', filterVal, false);
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
      router.navigate('class');
    });
  }

  // P0-6: Screen-scoped subscription functions
  async function startSubscription() {
    const classId = store.get('currentClassId') || '';
    activeSub = await subscribeClassCollection('students', classId, (_items, hasMore) => {
      renderGrid();
      updateDropdown();
      updateProfile(store.get('currentStudentId'));
      if (loadMoreContainer) {
        loadMoreContainer.classList.toggle('hidden', !hasMore);
      }
    });
  }

  function stopSubscription() {
    unsubscribeCollection('students');
    activeSub = null;
    if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
  }

  router.registerScreenHook('students', {
    onEnter: startSubscription,
    onLeave: stopSubscription
  });

  router.registerScreenHook('profile', {
    onEnter: () => { if (!activeSub) startSubscription(); },
    onLeave: () => { if (router.activeScreenId !== 'students') stopSubscription(); }
  });

  store.subscribe('currentClassId', () => {
    if (router.activeScreenId === 'students' || router.activeScreenId === 'profile') {
      startSubscription();
    }
  });

  store.subscribe('currentStudentId', (id) => updateProfile(id));
}
