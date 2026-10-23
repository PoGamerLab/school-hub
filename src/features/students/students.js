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
    const user = authService.getCurrentUser();
    const isAdmin = !!store.get('isAdmin');

    return students.filter(student => {
      // Hide admin or student profile if showInDirectory is false, unless viewing own or is admin
      const isOwn = user && (student.id === user.uid || student.ownerUid === user.uid);
      if (student.showInDirectory === false && !isAdmin && !isOwn) {
        return false;
      }

      const matchesCategory = (activeCategory === 'All' || (student.category && student.category.toLowerCase() === activeCategory.toLowerCase()));
      const matchesSearch = !searchQuery ||
                            (student.name && student.name.toLowerCase().includes(searchQuery)) ||
                            (student.tags && student.tags.toLowerCase().includes(searchQuery)) ||
                            (student.house && student.house.toLowerCase().includes(searchQuery)) ||
                            (student.group && student.group.toLowerCase().includes(searchQuery));
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

  function openProfileModal(existingProfile = null) {
    const user = authService.getCurrentUser();
    if (!user) return;

    const nameEl = document.getElementById('student-name');
    const houseEl = document.getElementById('student-house');
    const groupEl = document.getElementById('student-group');
    const catEl = document.getElementById('student-category');
    const tagsEl = document.getElementById('student-tags');
    const bioEl = document.getElementById('student-bio');
    const subjEl = document.getElementById('student-subject');
    const bdayMonthEl = document.getElementById('student-bday-month');
    const bdayDayEl = document.getElementById('student-bday-day');
    const quoteEl = document.getElementById('student-quote');
    const factEl = document.getElementById('student-fact');
    const contactEl = document.getElementById('student-contact');
    const showBdayEl = document.getElementById('student-show-birthday');
    const showContactEl = document.getElementById('student-show-contact');
    const showDirEl = document.getElementById('student-show-directory');
    const adminDirRow = document.getElementById('student-admin-dir-row');

    if (adminDirRow) {
      adminDirRow.classList.toggle('hidden-admin', !store.get('isAdmin'));
    }

    if (existingProfile) {
      if (nameEl) nameEl.value = existingProfile.name || '';
      if (houseEl) houseEl.value = existingProfile.house || 'Unity';
      if (groupEl) groupEl.value = existingProfile.group || 'Pre-Medical';
      if (catEl) catEl.value = existingProfile.category || 'Sports';
      if (tagsEl) tagsEl.value = existingProfile.tags || 'Cricket';
      if (bioEl) bioEl.value = existingProfile.bio || '';
      if (subjEl) subjEl.value = existingProfile.favSubject || 'Computer Science';
      if (existingProfile.birthday) {
        const parts = existingProfile.birthday.split(' ');
        if (parts.length === 2) {
          if (bdayDayEl) bdayDayEl.value = parts[0];
          if (bdayMonthEl) bdayMonthEl.value = parts[1];
        }
      }
      if (quoteEl) quoteEl.value = (existingProfile.favQuote || '').replace(/^"|"$/g, '');
      if (factEl) factEl.value = existingProfile.funFact || '';
      if (contactEl) contactEl.value = existingProfile.contact || '';
      if (showBdayEl) showBdayEl.checked = !!existingProfile.showBirthday;
      if (showContactEl) showContactEl.checked = !!existingProfile.showContact;
      if (showDirEl) showDirEl.checked = existingProfile.showInDirectory !== false;
    } else {
      if (nameEl) nameEl.value = user.displayName || '';
      if (houseEl) houseEl.value = 'Unity';
      if (groupEl) groupEl.value = 'Pre-Medical';
      if (catEl) catEl.value = 'Sports';
      if (tagsEl) tagsEl.value = 'Cricket';
      if (bioEl) bioEl.value = '';
      if (subjEl) subjEl.value = 'Computer Science';
      if (bdayDayEl) bdayDayEl.value = '';
      if (bdayMonthEl) bdayMonthEl.value = '';
      if (quoteEl) quoteEl.value = '';
      if (factEl) factEl.value = '';
      if (contactEl) contactEl.value = '';
      if (showBdayEl) showBdayEl.checked = false;
      if (showContactEl) showContactEl.checked = false;
      if (showDirEl) showDirEl.checked = true;
    }

    const modalTitle = document.querySelector('#add-student-modal .modal-header h3');
    if (modalTitle) modalTitle.textContent = existingProfile ? 'Edit Your Student Profile' : 'Create Your Profile';
    addStudentModal?.classList.add('active');
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
        showToast('Please sign in with Google.', 'error');
        return;
      }

      const name = document.getElementById('student-name').value.trim();
      const house = document.getElementById('student-house')?.value || 'Unity';
      const group = document.getElementById('student-group')?.value || 'Pre-Medical';
      const category = document.getElementById('student-category')?.value || 'Sports';
      const tags = document.getElementById('student-tags')?.value || 'Cricket';
      const bio = document.getElementById('student-bio').value.trim();
      const favSubject = document.getElementById('student-subject')?.value || 'Computer Science';
      const bdayMonth = document.getElementById('student-bday-month')?.value || '';
      const bdayDay = document.getElementById('student-bday-day')?.value || '';
      const birthday = (bdayMonth && bdayDay) ? `${bdayDay} ${bdayMonth}` : '';
      const favQuote = document.getElementById('student-quote').value.trim();
      const funFact = document.getElementById('student-fact').value.trim();
      const contact = document.getElementById('student-contact').value.trim();
      const showBirthday = document.getElementById('student-show-birthday')?.checked ?? false;
      const showContact = document.getElementById('student-show-contact')?.checked ?? false;
      const showDirEl = document.getElementById('student-show-directory');
      const showInDirectory = showDirEl ? !!showDirEl.checked : true;

      if (!name || name.length < 3 || !/^[a-zA-Z\s\.\-]{3,60}$/.test(name)) {
        showToast('Please enter a valid full name (at least 3 letters, no numbers or special symbols).', 'error');
        return;
      }
      if (!bio || bio.length < 15) {
        showToast('Please write a short bio & ambition (at least 15 characters).', 'error');
        return;
      }
      if (!favQuote || favQuote.length < 8) {
        showToast('Please enter a favourite quote (at least 8 characters).', 'error');
        return;
      }
      if (!funFact || funFact.length < 8) {
        showToast('Please enter a fun fact (at least 8 characters).', 'error');
        return;
      }

      const payload = {
        classId: store.get('currentClassId') || '',
        ownerUid: user.uid,
        name,
        house,
        group,
        category,
        tags,
        bio,
        favSubject,
        favQuote: favQuote ? (favQuote.startsWith('"') ? favQuote : `"${favQuote}"`) : '',
        funFact,
        gradientIndex: Math.floor(Math.random() * 8),
        initials: extractInitials(name),
        showBirthday,
        showContact,
        showInDirectory,
        verified: true
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

        // Update user's displayName in users/{uid} and in authService so top-right shows new name
        const updatedUser = {
          ...user,
          displayName: name
        };
        authService.setUser(updatedUser);
        try {
          await updateDocument('users', user.uid, { displayName: name });
        } catch (e) {
          console.warn('Update user doc displayName error:', e);
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
