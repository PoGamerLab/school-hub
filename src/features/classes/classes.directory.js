import { initFirebase } from '../../config/firebase.js';
import { authService } from '../../core/auth/auth.js';
import { store } from '../../core/store/store.js';
import { renderStudentCard } from '../students/students.render.js';
import { bindAvatarFallbacks } from '../../components/avatar/avatar.js';

let allStudents = [];
let dirFilter = 'All';
let dirSearch = '';
let lastStudentDoc = null;
let hasMore = true;
let loadMoreInitialized = false;

function initLoadMoreButton() {
  if (loadMoreInitialized) return;
  loadMoreInitialized = true;
  const loadMoreBtn = document.getElementById('hub-students-load-more-btn');
  loadMoreBtn?.addEventListener('click', async () => {
    if (!hasMore) return;
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading…';
    await loadAllStudentsDirectory(true);
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Load More Students';
  });
}

export async function loadAllStudentsDirectory(isLoadMore = false) {
  initLoadMoreButton();
  const dirGrid = document.getElementById('hub-students-grid');
  const loadMoreBox = document.getElementById('hub-students-load-more-container');
  if (!dirGrid) return;

  if (!isLoadMore) {
    allStudents = [];
    lastStudentDoc = null;
    hasMore = true;
    dirGrid.innerHTML = '<div class="admin-empty-notice">Loading student directory…</div>';
  }

  try {
    const fb = await initFirebase();
    if (!fb?.db) return;
    const { collection, query, orderBy, limit, startAfter, where, getDocs } =
      await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const cleanSearch = (dirSearch || '').trim();
    const constraints = [];

    if (cleanSearch) {
      constraints.push(
        where('name', '>=', cleanSearch),
        where('name', '<=', cleanSearch + '\uf8ff'),
        orderBy('name'),
        limit(30)
      );
    } else {
      constraints.push(orderBy('name'), limit(30));
    }

    if (isLoadMore && lastStudentDoc) {
      constraints.push(startAfter(lastStudentDoc));
    }

    const q = query(collection(fb.db, 'students'), ...constraints);
    const snap = await getDocs(q);

    if (snap.empty) {
      hasMore = false;
      if (!isLoadMore) {
        dirGrid.innerHTML = `
          <div class="empty-state full-width-empty">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">No Students Found</div>
            <div class="empty-state-desc">Try clearing the search or choosing a different filter.</div>
          </div>
        `;
      }
      if (loadMoreBox) loadMoreBox.classList.add('hidden');
      return;
    }

    lastStudentDoc = snap.docs[snap.docs.length - 1];
    hasMore = snap.docs.length >= 30;

    const newStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (isLoadMore) {
      allStudents = [...allStudents, ...newStudents];
    } else {
      allStudents = newStudents;
    }

    renderDirectoryGrid();

    if (loadMoreBox) {
      loadMoreBox.classList.toggle('hidden', !hasMore);
    }
  } catch (err) {
    console.error('Failed to load students:', err);
    dirGrid.innerHTML = '<div class="admin-empty-notice">Could not load students directory.</div>';
    if (loadMoreBox) loadMoreBox.classList.add('hidden');
  }
}

export function setDirectoryFilter(filter) {
  dirFilter = filter;
  renderDirectoryGrid();
}

export function setDirectorySearch(query) {
  dirSearch = query;
  loadAllStudentsDirectory(false);
}

export function renderDirectoryGrid() {
  const dirGrid = document.getElementById('hub-students-grid');
  if (!dirGrid) return;
  const user = authService.getCurrentUser();
  const isAdmin = !!store.get('isAdmin');

  const filtered = allStudents.filter(s => {
    const isOwn = user && (s.id === user.uid || s.ownerUid === user.uid);
    if (s.showInDirectory === false && !isAdmin && !isOwn) return false;

    const f = (dirFilter || 'All').toLowerCase();
    const matchCat = f === 'all' ||
      (s.house && s.house.toLowerCase() === f) ||
      (s.category && s.category.toLowerCase() === f);

    return matchCat;
  });

  if (filtered.length === 0) {
    dirGrid.innerHTML = `
      <div class="empty-state full-width-empty">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">No Students Found</div>
        <div class="empty-state-desc">Try choosing a different house filter.</div>
      </div>
    `;
    return;
  }

  dirGrid.innerHTML = filtered.map(s => renderStudentCard(s)).join('');
  bindAvatarFallbacks(dirGrid);
}
