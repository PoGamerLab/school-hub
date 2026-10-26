import { store } from '../../core/store/store.js';
import { router } from '../../core/router/router.js';
import { authService } from '../../core/auth/auth.js';
import { renderStudentCard, renderProfileView } from './students.render.js';
import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';
import { showToast } from '../../components/toast/toast.js';
import { subscribeClassCollection, unsubscribeCollection, deleteDocument, updateDocument, runBatchWrite } from '../../core/db/firestore.js';
import { openProfileModal, initProfileForm } from './students.modal.js';
import { openPhotoUploadModal } from '../profile/photoUpload.modal.js';
import { fetchProfile, setCachedProfile, clearProfileCache, getCachedProfile } from './students.cache.js';

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
  let profileToken = 0;

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
      const matchesCategory = filter === 'all' || (student.category && student.category.toLowerCase() === filter) || (student.house && student.house.toLowerCase() === filter);
      const matchesSearch = !searchQuery || [student.name, student.tags, student.house, student.group, student.favSubject].some(s => s && s.toLowerCase().includes(searchQuery));
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
    studentSelect.innerHTML = students.map(s => {
      const safeVal = escapeAttr(s.id || s.uid);
      const safeName = escapeHtml(s.name || 'Student');
      const safeHouse = escapeHtml(s.house || 'Unity');
      return `<option value="${safeVal}">${safeName} (${safeHouse} House)</option>`;
    }).join('');
    studentSelect.value = store.get('currentStudentId') || (students[0].id || students[0].uid);
  }

  function updateProfile(studentId) {
    const user = authService.getCurrentUser();
    const wantedId = (!studentId || studentId === 'my-profile') ? user?.uid : studentId;
    if (!wantedId) {
      renderProfileView({ isLoading: true });
      return;
    }

    const list = store.get('students') || [];
    const hit = list.find(s => (s.id || s.uid) === wantedId);
    if (hit) {
      setCachedProfile(wantedId, hit);
      show(hit);
      return;
    }

    const cached = getCachedProfile(wantedId);
    if (cached) {
      show(cached);
      return;
    }

    const token = ++profileToken;
    renderProfileView({ isLoading: true });

    fetchProfile(wantedId).then(p => {
      if (token !== profileToken) return;
      if (p) {
        show(p);
      } else if (user && wantedId === user.uid) {
        renderProfileView({ isUncreated: true }, user.uid);
      } else {
        renderProfileView({ notFound: true });
      }
    }).catch(() => {
      if (token === profileToken) renderProfileView({ loadFailed: true });
    });

    function show(p) {
      const id = p.id || wantedId;
      store.set('currentStudentId', id, false);
      if (studentSelect) studentSelect.value = id;
      renderProfileView(p, user ? user.uid : null);
    }
  }

  window._reloadProfile = (id) => {
    clearProfileCache(id);
    updateProfile(id);
  };

  // Profile action buttons (Edit Profile, Change Photo, Report Photo, Create Profile, or Admin Delete)
  document.querySelector('#profile')?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('#edit-my-profile-btn');
    const createBtn = e.target.closest('#create-my-profile-btn');
    const changePhotoBtn = e.target.closest('#change-photo-btn');
    const reportPhotoBtn = e.target.closest('#report-profile-photo-btn');
    const deleteBtn = e.target.closest('#admin-delete-student-btn');

    const user = authService.getCurrentUser();
    const students = store.get('students') || [];
    const myProfile = getCachedProfile(user?.uid) || students.find(s => (s.id || s.uid) === user?.uid || s.ownerUid === user?.uid);

    if (editBtn || createBtn) {
      openProfileModal(myProfile);
      return;
    }

    if (changePhotoBtn) {
      openPhotoUploadModal(myProfile);
      return;
    }

    if (reportPhotoBtn) {
      const targetUid = reportPhotoBtn.dataset.uid;
      if (!user || !targetUid) return;

      const reason = prompt('Why are you reporting this profile photo? (inappropriate, harassment, spam, other):', 'inappropriate');
      if (!reason) return;
      const safeReason = ['inappropriate', 'harassment', 'spam', 'other'].includes(reason.toLowerCase().trim())
        ? reason.toLowerCase().trim()
        : 'other';
      const details = (prompt('Optional details (up to 200 characters):') || '').slice(0, 200);

      try {
        const { initFirebase } = await import('../../config/firebase.js');
        const fb = await initFirebase();
        const { doc, writeBatch, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const batch = writeBatch(fb.db);
        batch.update(doc(fb.db, 'students', targetUid), {
          [`photoReports.${user.uid}`]: { reason: safeReason, details, createdAt: serverTimestamp() }
        });
        const classId = (reportPhotoBtn.dataset.classId || store.get('currentClassId') || '').slice(0, 30);
        batch.set(doc(fb.db, 'reportQueue', `photo_${targetUid}_${user.uid}`), {
          kind: 'photo', classId, targetId: targetUid.slice(0, 100), targetPath: `students/${targetUid}`,
          reporterUid: user.uid, reason: safeReason, details, createdAt: serverTimestamp()
        });
        await batch.commit();
        showToast('Photo reported to school administration.', 'info');
      } catch (err) {
        console.error('Photo report failed:', err);
        showToast('Could not submit report.', 'error');
      }
      return;
    }

    if (deleteBtn) {
      const targetUid = deleteBtn.dataset.uid;
      if (!targetUid) return;
      const reason = prompt('Why are you deleting this student profile?\n(This reason will be shown to the student so they can recreate their profile properly)');
      if (!reason || !reason.trim()) {
        showToast('Deletion cancelled. A reason is required.', 'info');
        return;
      }
      try {
        await runBatchWrite([
          { type: 'delete', collection: 'students', id: targetUid },
          { type: 'delete', collection: 'avatars', id: targetUid },
          { type: 'set', collection: 'users', id: targetUid, data: { status: 'needs_profile', profileDeletedReason: reason.trim(), profileDeletedAt: Date.now() }, merge: true },
          { type: 'set', collection: 'adminLog', id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, data: { action: 'DELETE_PROFILE', actorUid: user.uid, targetUid, reason: reason.trim() }, withTimestamp: true, timestampField: 'createdAt' }
        ]);
        clearProfileCache(targetUid);
        showToast('Student profile deleted atomically.', 'success');
        router.navigate('class');
      } catch (err) {
        console.error('Delete profile error:', err);
        showToast('Deletion failed. Check permissions.', 'error');
      }
    }
  });

  initProfileForm();

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', async () => {
      if (activeSub?.loadMore) {
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
      store.set('activeCategory', chip.dataset.filter || chip.textContent.trim(), false);
      renderGrid();
    });
  });

  if (gridContainer) {
    gridContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (card) router.navigate('profile', { id: card.dataset.id });
    });
  }

  if (studentSelect) {
    studentSelect.addEventListener('change', (e) => {
      router.navigate('profile', { id: e.target.value });
    });
  }

  if (backToStudentsBtn) {
    backToStudentsBtn.addEventListener('click', () => router.navigate('class'));
  }

  async function startSubscription() {
    const classId = store.get('currentClassId') || '';
    activeSub = await subscribeClassCollection('students', classId, (_items, hasMore) => {
      renderGrid();
      updateDropdown();
      updateProfile(store.get('currentStudentId'));
      if (loadMoreContainer) loadMoreContainer.classList.toggle('hidden', !hasMore);
    });
  }

  function stopSubscription() {
    unsubscribeCollection('students');
    activeSub = null;
    if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
  }

  router.registerScreenHook('students', { onEnter: startSubscription, onLeave: stopSubscription });
  router.registerScreenHook('profile', {
    onEnter: () => { if (!activeSub) startSubscription(); },
    onLeave: () => { if (router.activeScreenId !== 'students') stopSubscription(); }
  });

  store.subscribe('currentClassId', () => {
    if (router.activeScreenId === 'students' || router.activeScreenId === 'profile') startSubscription();
  });
  store.subscribe('currentStudentId', (id) => updateProfile(id));
}
