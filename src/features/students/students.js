import { store } from '../../core/store/store.js';
import { router } from '../../core/router/router.js';
import { authService } from '../../core/auth/auth.js';
import { renderStudentCard, renderProfileView } from './students.render.js';
import { extractInitials } from '../../core/utils/ids.js';
import { showToast } from '../../components/toast/toast.js';
import { subscribeClassCollection, unsubscribeCollection, createDocument, updateDocument } from '../../core/db/firestore.js';

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

    return students.filter(student => {
      const matchesCategory = (activeCategory === 'All' || (student.category && student.category.toLowerCase() === activeCategory.toLowerCase()));
      const matchesSearch = !searchQuery ||
                            (student.name && student.name.toLowerCase().includes(searchQuery)) ||
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
    const user = authService.getCurrentUser();
    if (students.length === 0) {
      store.set('currentStudentId', null, false);
      renderProfileView(null);
      return;
    }
    let current = null;
    if (studentId) {
      current = students.find(s => (s.id || s.uid) === studentId);
    }
    if (!current && user) {
      current = students.find(s => (s.id || s.uid) === user.uid || s.ownerUid === user.uid);
    }
    if (!current) {
      current = students[0];
    }
    if (current) {
      const id = current.id || current.uid;
      store.set('currentStudentId', id, false);
      if (studentSelect) studentSelect.value = id;
      renderProfileView(current, user ? user.uid : null);
    }
  }

  // Edit Profile button handler on #profile
  document.querySelector('#profile')?.addEventListener('click', (e) => {
    const editBtn = e.target.closest('#edit-my-profile-btn');
    if (!editBtn) return;
    const user = authService.getCurrentUser();
    const students = store.get('students') || [];
    const myProfile = students.find(s => (s.id || s.uid) === user?.uid || s.ownerUid === user?.uid);
    if (!myProfile) return;

    // Pre-populate form with existing profile data
    const nameEl = document.getElementById('student-name');
    const rollEl = document.getElementById('student-roll');
    const catEl = document.getElementById('student-category');
    const tagsEl = document.getElementById('student-tags');
    const bioEl = document.getElementById('student-bio');
    const subjEl = document.getElementById('student-subject');
    const bdayEl = document.getElementById('student-birthday');
    const quoteEl = document.getElementById('student-quote');
    const factEl = document.getElementById('student-fact');
    const contactEl = document.getElementById('student-contact');
    const showBdayEl = document.getElementById('student-show-birthday');
    const showContactEl = document.getElementById('student-show-contact');

    if (nameEl) nameEl.value = myProfile.name || '';
    if (rollEl) rollEl.value = myProfile.roll || '';
    if (catEl) catEl.value = myProfile.category || 'Sports';
    if (tagsEl) tagsEl.value = myProfile.tags || '';
    if (bioEl) bioEl.value = myProfile.bio || '';
    if (subjEl) subjEl.value = myProfile.favSubject || '';
    if (bdayEl) bdayEl.value = myProfile.birthday || '';
    if (quoteEl) quoteEl.value = (myProfile.favQuote || '').replace(/^"|"$/g, '');
    if (factEl) factEl.value = myProfile.funFact || '';
    if (contactEl) contactEl.value = myProfile.contact || '';
    if (showBdayEl) showBdayEl.checked = !!myProfile.showBirthday;
    if (showContactEl) showContactEl.checked = !!myProfile.showContact;

    const modalTitle = document.querySelector('#add-student-modal .modal-header h3');
    if (modalTitle) modalTitle.textContent = 'Edit Your Student Profile';
    addStudentModal?.classList.add('active');
  });

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

      const payload = {
        classId: store.get('currentClassId') || '',
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

      if (showBirthday && birthday) payload.birthday = birthday;
      if (showContact && contact) payload.contact = contact;

      const isExisting = (store.get('students') || []).some(s => (s.id || s.uid) === user.uid || s.ownerUid === user.uid);

      try {
        if (isExisting) {
          await updateDocument('students', user.uid, payload);
          showToast('Profile updated successfully!', 'success');
        } else {
          await createDocument('students', payload, user.uid);
          showToast(`Profile published for ${name}!`, 'success');
        }
        addStudentForm.reset();
        if (addStudentModal) addStudentModal.classList.remove('active');
        router.navigate('profile', { id: user.uid });
      } catch (err) {
        console.error('Failed to save profile:', err);
        showToast(`Error: ${err.message}`, 'error');
      }
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
