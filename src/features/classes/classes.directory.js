import { initFirebase } from '../../config/firebase.js';
import { authService } from '../../core/auth/auth.js';
import { store } from '../../core/store/store.js';
import { renderStudentCard } from '../students/students.render.js';
import { bindAvatarFallbacks } from '../../components/avatar/avatar.js';

let allStudents = [];
let dirFilter = 'All';
let dirSearch = '';

export async function loadAllStudentsDirectory() {
  const dirGrid = document.getElementById('hub-students-grid');
  if (!dirGrid) return;
  try {
    const fb = await initFirebase();
    if (!fb || !fb.db) return;
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const snap = await getDocs(collection(fb.db, 'students'));
    allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDirectoryGrid();
  } catch (err) {
    console.error('Failed to load all students:', err);
    dirGrid.innerHTML = '<div class="admin-empty-notice">Could not load students directory.</div>';
  }
}

export function setDirectoryFilter(filter) {
  dirFilter = filter;
  renderDirectoryGrid();
}

export function setDirectorySearch(query) {
  dirSearch = query;
  renderDirectoryGrid();
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

    const q = dirSearch.toLowerCase();
    const matchSearch = !q ||
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.house && s.house.toLowerCase().includes(q)) ||
      (s.favSubject && s.favSubject.toLowerCase().includes(q)) ||
      (s.tags && s.tags.toLowerCase().includes(q));

    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    dirGrid.innerHTML = `
      <div class="empty-state full-width-empty">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">No Students Found</div>
        <div class="empty-state-desc">Try clearing the search or choosing a different house filter.</div>
      </div>
    `;
    return;
  }

  dirGrid.innerHTML = filtered.map(s => renderStudentCard(s)).join('');
  bindAvatarFallbacks(dirGrid);
}
