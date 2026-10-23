/**
 * Classes feature controller (Classes Hub & Classrooms Architecture).
 */

import { store } from '../../core/store/store.js';
import { authService } from '../../core/auth/auth.js';
import { router } from '../../core/router/router.js';
import { fetchActiveClasses } from '../gate/gate.db.js';
import { renderClassesHubCards, renderClassDetailBanner, renderClassStudentsGrid } from './classes.render.js';
import { loadAndRenderClassChat, cleanupClassChat } from './classes.chat.js';
import { loadAndRenderAnnouncements, cleanupAnnouncements } from './classes.announcements.js';
import { loadAllStudentsDirectory, setDirectoryFilter, setDirectorySearch } from './classes.directory.js';
import { initFirebase } from '../../config/firebase.js';

let selectedClass = null;
let currentFilter = 'All';
let currentSearch = '';
let activeClassStudents = [];
let currentHubArea = 'classrooms';

export async function syncClasses() {
  try {
    const classes = await fetchActiveClasses();
    store.set('activeClasses', classes, false);
    return classes;
  } catch (err) {
    console.warn('[Classes] syncClasses error:', err);
    return [];
  }
}

export function initClasses() {
  const hubView = document.getElementById('classes-hub-view');
  const detailView = document.getElementById('class-detail-view');
  const cardsGrid = document.getElementById('classes-cards-grid');
  const searchInput = document.getElementById('classes-search-input');
  const filterChips = document.getElementById('classes-filter-chips');
  const backBtn = document.getElementById('back-to-classes-btn');
  const subtabsBar = document.getElementById('class-subtabs-bar');
  const studentsGrid = document.getElementById('class-students-grid');
  const countTag = document.getElementById('class-students-count-tag');
  const adminAddBtn = document.getElementById('classes-admin-add-btn');

  // Hub Switcher Tabs (Classrooms vs All Students Directory)
  const tabClassroomsBtn = document.getElementById('classes-tab-classrooms-btn');
  const tabStudentsBtn = document.getElementById('classes-tab-students-btn');
  const areaClassrooms = document.getElementById('classes-area-classrooms');
  const areaStudents = document.getElementById('classes-area-students');
  const dirGrid = document.getElementById('hub-students-grid');
  const dirSearchInput = document.getElementById('hub-students-search-input');
  const dirChips = document.getElementById('hub-students-chips');

  function switchHubArea(area) {
    currentHubArea = area;
    tabClassroomsBtn?.classList.toggle('active', area === 'classrooms');
    tabStudentsBtn?.classList.toggle('active', area === 'students');
    areaClassrooms?.classList.toggle('hidden', area !== 'classrooms');
    areaStudents?.classList.toggle('hidden', area !== 'students');

    if (area === 'students') {
      loadAllStudentsDirectory();
    } else {
      renderHub();
    }
  }

  // --- 1. Classes Hub View ---
  async function renderHub() {
    if (!cardsGrid) return;
    const classes = store.get('activeClasses') || [];
    const user = authService.getCurrentUser();
    const myClassId = user?.classId || '';

    const counts = {};
    try {
      const fb = await initFirebase();
      if (fb && fb.db) {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const snap = await getDocs(collection(fb.db, 'students'));
        snap.forEach(d => {
          const cid = d.data().classId;
          if (cid) counts[cid] = (counts[cid] || 0) + 1;
        });
      }
    } catch (e) {
      console.warn('Count fetch warning:', e);
    }

    const filtered = classes.filter(c => {
      const q = currentSearch.toLowerCase();
      const matchSearch = !q ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.grade && c.grade.toLowerCase().includes(q)) ||
        (c.classTeacher && c.classTeacher.toLowerCase().includes(q)) ||
        c.id.toLowerCase().includes(q);

      const f = currentFilter.toLowerCase();
      let matchFilter = f === 'all';
      if (!matchFilter) {
        if (f === 'middle') {
          matchFilter = c.grade && (c.grade.includes('6') || c.grade.includes('7') || c.grade.includes('8'));
        } else {
          matchFilter = c.grade && c.grade.toLowerCase().includes(f);
        }
      }
      return matchSearch && matchFilter;
    });

    cardsGrid.innerHTML = renderClassesHubCards(filtered, myClassId, counts);
  }

  // --- 2. Class Detail View ---
  async function openClassDetail(classId) {
    const classes = store.get('activeClasses') || [];
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;

    selectedClass = cls;
    if (hubView) hubView.classList.add('hidden');
    if (detailView) detailView.classList.remove('hidden');

    const user = authService.getCurrentUser();
    const isMember = user && user.classId === cls.id;

    const bannerRoot = document.getElementById('class-detail-banner-root');
    if (bannerRoot) {
      bannerRoot.innerHTML = renderClassDetailBanner(cls, isMember);
    }

    switchSubTab('students');
    await loadClassStudents(cls.id);
  }

  async function loadClassStudents(classId) {
    if (!studentsGrid) return;
    try {
      const fb = await initFirebase();
      if (!fb || !fb.db) return;
      const { collection, getDocs, query, where } =
        await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

      const q = query(collection(fb.db, 'students'), where('classId', '==', classId));
      const snap = await getDocs(q);
      activeClassStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (countTag) {
        countTag.textContent = `${activeClassStudents.length} ${activeClassStudents.length === 1 ? 'STUDENT' : 'STUDENTS'}`;
      }
      studentsGrid.innerHTML = renderClassStudentsGrid(activeClassStudents);
    } catch (err) {
      console.error('Failed to load class students:', err);
      studentsGrid.innerHTML = '<div class="admin-empty-notice">Could not load students for this class.</div>';
    }
  }

  function switchSubTab(tabKey) {
    if (!subtabsBar) return;
    subtabsBar.querySelectorAll('.class-subtab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabKey);
    });

    document.querySelectorAll('.class-subpane').forEach(p => {
      p.classList.remove('active');
    });

    const targetPane = document.getElementById(`class-pane-${tabKey}`);
    if (targetPane) targetPane.classList.add('active');

    if (selectedClass) {
      if (tabKey === 'chat') {
        loadAndRenderClassChat(selectedClass.id, selectedClass.name || selectedClass.id);
      } else if (tabKey === 'announcements') {
        loadAndRenderAnnouncements(selectedClass);
      }
    }
  }

  function closeClassDetail() {
    cleanupClassChat();
    cleanupAnnouncements();
    selectedClass = null;
    if (detailView) detailView.classList.add('hidden');
    if (hubView) hubView.classList.remove('hidden');
    switchHubArea(currentHubArea);
  }

  // --- 3. Events ---
  tabClassroomsBtn?.addEventListener('click', () => switchHubArea('classrooms'));
  tabStudentsBtn?.addEventListener('click', () => switchHubArea('students'));

  if (cardsGrid) {
    cardsGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.class-card');
      if (card && card.dataset.classId) openClassDetail(card.dataset.classId);
    });
  }

  const handleCardClick = (e) => {
    const card = e.target.closest('.card');
    if (card && card.dataset.id) router.navigate('profile', { id: card.dataset.id });
  };
  studentsGrid?.addEventListener('click', handleCardClick);
  dirGrid?.addEventListener('click', handleCardClick);

  backBtn?.addEventListener('click', closeClassDetail);

  subtabsBar?.addEventListener('click', (e) => {
    const btn = e.target.closest('.class-subtab');
    if (btn && btn.dataset.tab) switchSubTab(btn.dataset.tab);
  });

  filterChips?.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    filterChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.dataset.filter || 'All';
    renderHub();
  });

  dirChips?.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    dirChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    setDirectoryFilter(chip.dataset.filter || 'All');
  });

  let searchTimer = null;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentSearch = e.target.value.trim();
      renderHub();
    }, 150);
  });

  let dirTimer = null;
  dirSearchInput?.addEventListener('input', (e) => {
    clearTimeout(dirTimer);
    dirTimer = setTimeout(() => {
      setDirectorySearch(e.target.value.trim());
    }, 150);
  });

  adminAddBtn?.addEventListener('click', () => router.navigate('admin'));

  // Lifecycle
  router.registerScreenHook('class', {
    onEnter: async () => {
      await syncClasses();
      const rawHash = window.location.hash || '';
      const params = new URLSearchParams(rawHash.split('?')[1] || '');
      const classIdParam = params.get('id');

      if (classIdParam) {
        openClassDetail(classIdParam);
      } else {
        closeClassDetail();
      }
    },
    onLeave: () => {
      cleanupClassChat();
      cleanupAnnouncements();
    }
  });

  store.subscribe('activeClasses', () => {
    if (router.activeScreenId === 'class' && !selectedClass) {
      if (currentHubArea === 'classrooms') renderHub();
    }
  });
}
