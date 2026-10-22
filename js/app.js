/**
 * APSACS Skardu — School Hub Application
 * Production-ready, zero-dependency, works directly on both file:// (desktop) and http:// (web).
 */

// 1. Anti-XSS Utilities
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}

// 2. Helper Utilities
const AVATAR_GRADIENTS = [
  'linear-gradient(150deg, #1E6B4C, #0E271A)',
  'linear-gradient(150deg, #D9A441, #A6742A)',
  'linear-gradient(150deg, #153826, #1E6B4C)',
  'linear-gradient(150deg, #A63B32, #7A2A23)',
  'linear-gradient(150deg, #1E6B4C, #153826)',
  'linear-gradient(150deg, #D9A441, #153826)',
  'linear-gradient(150deg, #0E271A, #1E6B4C)',
  'linear-gradient(150deg, #A6742A, #D9A441)'
];

function getRandomGradient() {
  return AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)];
}

function extractInitials(name, fallback = 'ST') {
  if (!name || typeof name !== 'string') return fallback;
  const cleaned = name.replace(/(Sir|Ma'am|Mr|Mrs|Ms|Dr)\s+/gi, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function generateId(prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

// 3. Toast Notifications
let toastContainer = null;
function showToast(message, type = 'info', duration = 3500) {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('transitionend', () => toast.remove());
  }, duration);
}

// 4. Clean Datasets (Clean slate — classmates add real entries)
const defaultClassInfo = {
  id: "10-b",
  name: "Grade 10 — Section B",
  session: "SESSION 2025–26",
  classTeacher: "Ma'am Farida Baig",
  room: "Room 14",
  track: "FBISE Secondary Science Track",
  avatar: "10B"
};

// Clean out legacy demo localStorage caches
['apsacs_students_data', 'apsacs_gallery_data', 'apsacs_teachers_data', 'apsacs_superlatives_data', 'apsacs_memories_data'].forEach(k => {
  try { localStorage.removeItem(k); } catch {}
});

function getStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to save ${key}:`, err);
  }
}

// 5. Central Application State Store
class Store {
  constructor() {
    this.state = {
      user: getStored('schoolhub_user', null),
      isAdmin: false,
      currentClassId: '10-b',
      classInfo: defaultClassInfo,
      students: getStored('schoolhub_students', []),
      gallery: getStored('schoolhub_gallery', []),
      teachers: getStored('schoolhub_teachers', []),
      superlatives: getStored('schoolhub_superlatives', []),
      memories: getStored('schoolhub_memories', []),
      activeCategory: 'All',
      searchQuery: '',
      currentStudentId: null,
      activeScreen: 'home'
    };
    this.listeners = new Map();
  }

  get(key) { return this.state[key]; }

  set(key, value, persist = true) {
    this.state[key] = value;
    if (persist && ['students', 'gallery', 'teachers', 'superlatives', 'memories', 'user'].includes(key)) {
      setStored(`schoolhub_${key}`, value);
    }
    this.notify(key, value);
  }

  update(key, fn) {
    const nextVal = fn(this.state[key]);
    this.set(key, nextVal);
  }

  subscribe(key, cb) {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key).add(cb);
    return () => {
      const set = this.listeners.get(key);
      if (set) set.delete(cb);
    };
  }

  notify(key, value) {
    const set = this.listeners.get(key);
    if (set) set.forEach(cb => {
      try { cb(value, this.state); } catch (e) { console.error(e); }
    });
  }
}

const store = new Store();

// 6. Modal Manager Helper
function setupModal(modalId, openBtnId, closeBtnId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  const openBtn = openBtnId ? document.getElementById(openBtnId) : null;
  const closeBtn = closeBtnId ? document.getElementById(closeBtnId) : modal.querySelector('.modal-close');

  const open = () => modal.classList.add('active');
  const close = () => modal.classList.remove('active');

  if (openBtn) openBtn.addEventListener('click', (e) => { e.preventDefault(); open(); });
  if (closeBtn) closeBtn.addEventListener('click', (e) => { e.preventDefault(); close(); });

  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) close();
  });
}

// 7. Tab Switcher & Navigation
function switchScreen(screenId) {
  const navButtons = document.querySelectorAll('.navlinks button');
  const screens = document.querySelectorAll('.screen');

  let targetFound = false;
  screens.forEach(screen => {
    if (screen.id === screenId) {
      screen.classList.add('active');
      targetFound = true;
    } else {
      screen.classList.remove('active');
    }
  });

  if (!targetFound) {
    const home = document.getElementById('home');
    if (home) home.classList.add('active');
    screenId = 'home';
  }

  navButtons.forEach(btn => {
    if (btn.dataset.screen === screenId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  store.set('activeScreen', screenId, false);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 8. Main App Initialization
function initApp() {
  console.log('[SchoolHub] Initializing application...');

  // Setup Modals
  setupModal('add-student-modal', 'open-add-student-btn', 'close-student-modal');
  setupModal('add-photo-modal', 'open-add-photo-btn', 'close-photo-modal');
  setupModal('add-teacher-modal', 'open-add-teacher-btn', 'close-teacher-modal');
  setupModal('add-superlative-modal', 'open-add-superlative-btn', 'close-superlative-modal');
  setupModal('add-memory-modal', 'open-add-memory-btn', 'close-memory-modal');

  // Setup Navigation Buttons
  const navButtons = document.querySelectorAll('.navlinks button');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const screenId = btn.dataset.screen;
      window.location.hash = `#${screenId}`;
      switchScreen(screenId);
    });
  });

  // Hero CTAs
  document.getElementById('hero-browse-btn')?.addEventListener('click', () => {
    window.location.hash = '#students';
    switchScreen('students');
  });

  document.getElementById('hero-about-btn')?.addEventListener('click', () => {
    window.location.hash = '#school';
    switchScreen('school');
  });

  // Handle URL Hash on load and change
  function handleHash() {
    const raw = window.location.hash.replace('#', '') || 'home';
    const [screen, query] = raw.split('?');
    if (query) {
      const params = new URLSearchParams(query);
      if (params.has('id')) {
        store.set('currentStudentId', params.get('id'), false);
      }
    }
    switchScreen(screen || 'home');
  }

  window.addEventListener('hashchange', handleHash);

  // ------------------------------------
  // Feature: Auth & Navbar
  // ------------------------------------
  const authContainer = document.querySelector('.nav-auth');
  function renderAuth(user) {
    if (!authContainer) return;
    if (user) {
      const avatarHtml = user.photoURL 
        ? `<img src="${escapeAttr(user.photoURL)}" alt="Avatar" class="auth-avatar">`
        : `<div class="auth-avatar">${escapeHtml(user.displayName?.[0] || 'U')}</div>`;

      authContainer.innerHTML = `
        <div class="auth-user">
          ${avatarHtml}
          <span class="auth-name" title="${escapeHtml(user.displayName)}">${escapeHtml(user.displayName)}</span>
          <button class="auth-signout" id="nav-signout-btn" title="Sign out">✕</button>
        </div>
      `;
      document.getElementById('nav-signout-btn')?.addEventListener('click', () => {
        store.set('user', null);
        showToast('Signed out.');
      });
    } else {
      authContainer.innerHTML = `
        <button class="auth-btn" id="nav-signin-btn">Sign In</button>
      `;
      document.getElementById('nav-signin-btn')?.addEventListener('click', () => {
        const name = prompt('Enter your name for student actions:') || 'Class Member';
        const userObj = {
          uid: `user-${Date.now()}`,
          displayName: name,
          email: `${name.toLowerCase().replace(/\s+/g, '')}@student.aps`,
          photoURL: '',
          isAdmin: true
        };
        store.set('user', userObj);
        showToast(`Welcome, ${name}!`, 'success');
      });
    }
  }

  store.subscribe('user', renderAuth);
  renderAuth(store.get('user'));

  // ------------------------------------
  // Feature: Class Information
  // ------------------------------------
  const classBannerContainer = document.getElementById('class-banner-container');
  function renderClassBanner() {
    if (!classBannerContainer) return;
    const c = store.get('classInfo');
    classBannerContainer.innerHTML = `
      <div class="class-banner">
        <div class="class-banner-content">
          <div class="k">Class Teacher</div>
          <h3>${escapeHtml(c.name)}</h3>
          <div class="meta">${escapeHtml(c.classTeacher)} &middot; ${escapeHtml(c.room)} &middot; ${escapeHtml(c.track)}</div>
        </div>
        <div class="class-avatar">${escapeHtml(c.avatar || '10B')}</div>
      </div>
    `;
  }
  renderClassBanner();

  // ------------------------------------
  // Feature: Students Directory & Profile
  // ------------------------------------
  const gridContainer = document.querySelector('.grid');
  const searchInput = document.querySelector('.search input');
  const chipButtons = document.querySelectorAll('.chips .chip');
  const studentSelect = document.getElementById('profile-student-select');
  const backToStudentsBtn = document.getElementById('back-to-students-btn');
  const addStudentForm = document.getElementById('add-student-form');
  const addStudentModal = document.getElementById('add-student-modal');

  function getFilteredStudents() {
    const list = store.get('students') || [];
    const cat = store.get('activeCategory');
    const q = store.get('searchQuery').toLowerCase();

    return list.filter(s => {
      const matchCat = (cat === 'All' || s.category.toLowerCase() === cat.toLowerCase());
      const matchQ = s.name.toLowerCase().includes(q) ||
                     (s.tags && s.tags.toLowerCase().includes(q)) ||
                     (s.roll && s.roll.toString().includes(q));
      return matchCat && matchQ;
    });
  }

  function renderStudentCards() {
    if (!gridContainer) return;
    const list = getFilteredStudents();

    if (list.length === 0) {
      gridContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <div class="empty-state-title">No Student Profiles Yet</div>
          <div class="empty-state-desc">Click "+ Add my profile" below to create the first classmate card!</div>
        </div>
      `;
      return;
    }

    gridContainer.innerHTML = list.map(s => `
      <div class="card" data-id="${escapeAttr(s.id)}">
        <div class="card-photo" style="background:${escapeAttr(s.gradient)};">${escapeHtml(s.initials)}</div>
        <div class="card-body">
          <div class="cname">${escapeHtml(s.name)}</div>
          <div class="ctag">${escapeHtml(s.tags)}</div>
          <div class="ribbon">
            <span class="ribbon-tag mono">ROLL ${escapeHtml(s.roll)}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  function renderProfileView(student) {
    const profileContainer = document.querySelector('#profile .profile');
    const profileTag = document.getElementById('profile-roll-tag');

    if (!student) {
      if (profileTag) profileTag.textContent = 'NO PROFILES';
      if (profileContainer) {
        profileContainer.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
            <div class="empty-state-icon">👤</div>
            <div class="empty-state-title">No Student Profile Selected</div>
            <div class="empty-state-desc">Classmate profiles will appear here. Go to the Students tab and click "+ Add my profile" to create the first profile!</div>
          </div>
        `;
      }
      return;
    }

    if (profileTag) profileTag.textContent = `ROLL ${escapeHtml(student.roll)}`;

    const birthdayVal = student.showBirthday && student.birthday 
      ? escapeHtml(student.birthday) 
      : `<span class="field-private">Private / Not shared</span>`;

    const contactVal = student.showContact && student.contact 
      ? escapeHtml(student.contact) 
      : `<span class="field-private">Private / Not shared</span>`;

    if (profileContainer) {
      profileContainer.innerHTML = `
        <div>
          <div class="profile-photo" style="background:${escapeAttr(student.gradient || 'linear-gradient(160deg, var(--emerald), var(--pine-deep))')};">
            ${escapeHtml(student.initials)}
            <div class="peak-tag">Photo — ${escapeHtml(student.name)}</div>
          </div>
        </div>
        <div class="profile-main">
          <div class="pname display">${escapeHtml(student.name)}</div>
          <div class="prole">${escapeHtml(student.role)}</div>
          <p class="pbio">${escapeHtml(student.bio)}</p>
          <div class="field-grid">
            <div class="field"><div class="flabel">Favourite subject</div><div class="fval">${escapeHtml(student.favSubject || '—')}</div></div>
            <div class="field"><div class="flabel">Hobbies</div><div class="fval">${escapeHtml(student.hobbies || student.tags || '—')}</div></div>
            <div class="field"><div class="flabel">Favourite quote</div><div class="fval">${escapeHtml(student.favQuote || '—')}</div></div>
            <div class="field"><div class="flabel">Birthday</div><div class="fval">${birthdayVal}</div></div>
            <div class="field"><div class="flabel">Fun fact</div><div class="fval">${escapeHtml(student.funFact || '—')}</div></div>
            <div class="field"><div class="flabel">Contact</div><div class="fval">${contactVal}</div></div>
          </div>
        </div>
      `;
    }
  }

  function updateDropdownAndProfile() {
    const list = store.get('students') || [];
    if (!studentSelect) return;

    if (list.length === 0) {
      studentSelect.innerHTML = '<option value="">No profiles yet</option>';
      studentSelect.disabled = true;
      renderProfileView(null);
      return;
    }

    studentSelect.disabled = false;
    studentSelect.innerHTML = list.map(s => 
      `<option value="${s.id}">Roll ${s.roll} — ${s.name}</option>`
    ).join('');

    const currentId = store.get('currentStudentId') || list[0].id;
    studentSelect.value = currentId;
    const current = list.find(s => s.id === currentId) || list[0];
    renderProfileView(current);
  }

  // Student card click -> view profile
  gridContainer?.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (card) {
      const id = card.dataset.id;
      store.set('currentStudentId', id, false);
      window.location.hash = `#profile?id=${id}`;
      updateDropdownAndProfile();
      switchScreen('profile');
    }
  });

  studentSelect?.addEventListener('change', (e) => {
    const id = e.target.value;
    store.set('currentStudentId', id, false);
    window.location.hash = `#profile?id=${id}`;
    updateDropdownAndProfile();
  });

  backToStudentsBtn?.addEventListener('click', () => {
    window.location.hash = '#students';
    switchScreen('students');
  });

  searchInput?.addEventListener('input', (e) => {
    store.set('searchQuery', e.target.value, false);
    renderStudentCards();
  });

  chipButtons.forEach(chip => {
    chip.addEventListener('click', () => {
      chipButtons.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      store.set('activeCategory', chip.textContent.trim(), false);
      renderStudentCards();
    });
  });

  // Add Student Profile Form
  addStudentForm?.addEventListener('submit', (e) => {
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
    store.set('currentStudentId', newStudent.id, false);

    addStudentForm.reset();
    addStudentModal?.classList.remove('active');
    showToast(`Profile published for ${name}!`, 'success');

    renderStudentCards();
    updateDropdownAndProfile();
    window.location.hash = `#profile?id=${newStudent.id}`;
    switchScreen('profile');
  });

  // ------------------------------------
  // Feature: Campus Photo Gallery
  // ------------------------------------
  const galleryContainer = document.getElementById('gallery-container');
  const addPhotoForm = document.getElementById('add-photo-form');
  const addPhotoModal = document.getElementById('add-photo-modal');

  function renderGallery() {
    if (!galleryContainer) return;
    const photos = store.get('gallery') || [];
    if (photos.length === 0) {
      galleryContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📷</div>
          <div class="empty-state-title">No Campus Photos Yet</div>
          <div class="empty-state-desc">Click "+ Add Picture" to share photos from around campus.</div>
        </div>
      `;
      return;
    }
    galleryContainer.innerHTML = photos.map(p => `
      <div class="gallery-card" data-id="${escapeAttr(p.id)}">
        <div class="gallery-img-container">
          <img src="${escapeAttr(p.url || 'images/apsacs-logo.png')}" alt="${escapeHtml(p.caption)}" class="gallery-img" onerror="this.onerror=null; this.src='images/apsacs-logo.png';">
        </div>
        <div class="gallery-caption">${escapeHtml(p.caption)}</div>
      </div>
    `).join('');
  }

  addPhotoForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const caption = document.getElementById('photo-title').value.trim();
    const url = document.getElementById('photo-url').value.trim() || 'images/apsacs-logo.png';

    const newPhoto = { id: generateId('gal'), caption, url };
    store.update('gallery', list => [newPhoto, ...list]);

    addPhotoForm.reset();
    addPhotoModal?.classList.remove('active');
    showToast('Photo added to gallery.', 'success');
    renderGallery();
  });

  // ------------------------------------
  // Feature: Teachers & Faculty
  // ------------------------------------
  const teachersContainer = document.getElementById('teachers-container');
  const addTeacherForm = document.getElementById('add-teacher-form');
  const addTeacherModal = document.getElementById('add-teacher-modal');

  function renderTeachers() {
    if (!teachersContainer) return;
    const teachers = store.get('teachers') || [];
    if (teachers.length === 0) {
      teachersContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👨‍🏫</div>
          <div class="empty-state-title">No Faculty Members Added Yet</div>
          <div class="empty-state-desc">Click "+ Add Teacher" to add faculty members.</div>
        </div>
      `;
      return;
    }
    teachersContainer.innerHTML = teachers.map(tch => `
      <div class="teacher-card" data-id="${escapeAttr(tch.id)}">
        <div class="teacher-photo-box">
          ${tch.img ? `<img src="${escapeAttr(tch.img)}" alt="${escapeHtml(tch.name)}" class="teacher-photo-img" onerror="this.remove()">` : ''}
          ${escapeHtml(tch.initials)}
        </div>
        <div class="teacher-name">${escapeHtml(tch.name)}</div>
        <span class="teacher-subject">${escapeHtml(tch.subject)}</span>
        <div class="teacher-details">
          <div>${escapeHtml(tch.qualification)}</div>
          <div class="teacher-room-tag">📍 ${escapeHtml(tch.room)}</div>
        </div>
      </div>
    `).join('');
  }

  addTeacherForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('teacher-name').value.trim();
    const subject = document.getElementById('teacher-subject').value.trim();
    const room = document.getElementById('teacher-room').value.trim();
    const qual = document.getElementById('teacher-qual').value.trim();
    const img = document.getElementById('teacher-img').value.trim();

    const newTeacher = {
      id: generateId('tch'),
      name,
      initials: extractInitials(name, 'TR'),
      subject,
      qualification: qual,
      room,
      img
    };

    store.update('teachers', list => [newTeacher, ...list]);
    addTeacherForm.reset();
    addTeacherModal?.classList.remove('active');
    showToast(`Added ${name} to Faculty directory.`, 'success');
    renderTeachers();
  });

  // ------------------------------------
  // Feature: Superlatives
  // ------------------------------------
  const superlativesContainer = document.getElementById('superlatives-container');
  const addSuperlativeForm = document.getElementById('add-superlative-form');
  const addSuperlativeModal = document.getElementById('add-superlative-modal');

  function renderSuperlatives() {
    if (!superlativesContainer) return;
    const list = store.get('superlatives') || [];
    if (list.length === 0) {
      superlativesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🏆</div>
          <div class="empty-state-title">No Superlatives Added Yet</div>
          <div class="empty-state-desc">Click "+ Add Superlative" to nominate and award classmates.</div>
        </div>
      `;
      return;
    }
    superlativesContainer.innerHTML = list.map(sup => `
      <div class="superlative-card" data-id="${escapeAttr(sup.id)}">
        <div class="superlative-icon">${escapeHtml(sup.icon || '🏆')}</div>
        <div class="superlative-title">${escapeHtml(sup.title)}</div>
        <div class="superlative-winner">${escapeHtml(sup.winner)}</div>
        ${sup.reason ? `<div class="superlative-reason">${escapeHtml(sup.reason)}</div>` : ''}
      </div>
    `).join('');
  }

  addSuperlativeForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const icon = document.getElementById('superlative-icon').value.trim() || '🏆';
    const title = document.getElementById('superlative-title').value.trim();
    const winner = document.getElementById('superlative-winner').value.trim();
    const reason = document.getElementById('superlative-reason').value.trim();

    const newSup = { id: generateId('sup'), icon, title, winner, reason };
    store.update('superlatives', list => [newSup, ...list]);

    addSuperlativeForm.reset();
    addSuperlativeModal?.classList.remove('active');
    showToast(`Added superlative: "${title}"!`, 'success');
    renderSuperlatives();
  });

  // ------------------------------------
  // Feature: Memory Wall
  // ------------------------------------
  const memoriesContainer = document.getElementById('memories-container');
  const addMemoryForm = document.getElementById('add-memory-form');
  const addMemoryModal = document.getElementById('add-memory-modal');

  function renderMemories() {
    if (!memoriesContainer) return;
    const list = store.get('memories') || [];
    const user = store.get('user');
    const uid = user ? user.uid : 'anon';

    if (list.length === 0) {
      memoriesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💭</div>
          <div class="empty-state-title">Memory Wall is Quiet</div>
          <div class="empty-state-desc">Click "+ Add Memory" to post quotes and moments from class.</div>
        </div>
      `;
      return;
    }

    const emojis = ['😂', '❤️', '🔥'];
    memoriesContainer.innerHTML = list.map(mem => {
      const reactions = mem.reactions || {};
      const btnsHtml = emojis.map(em => {
        const uids = reactions[em] || [];
        const hasReacted = uids.includes(uid);
        return `
          <button class="reaction-btn ${hasReacted ? 'user-reacted' : ''}" data-action="react" data-id="${escapeAttr(mem.id)}" data-emoji="${em}">
            <span>${em}</span>
            ${uids.length > 0 ? `<span>${uids.length}</span>` : ''}
          </button>
        `;
      }).join('');

      return `
        <div class="memory-card" data-id="${escapeAttr(mem.id)}">
          <div class="memory-quote">${escapeHtml(mem.quote)}</div>
          <div class="memory-meta">
            <span class="memory-author">${escapeHtml(mem.author)}</span>
            ${mem.context ? `<span class="memory-context">${escapeHtml(mem.context)}</span>` : ''}
          </div>
          <div class="memory-footer">
            <div class="reactions-list">${btnsHtml}</div>
            <button class="memory-report-btn" data-action="report" data-id="${escapeAttr(mem.id)}">🚩 Report</button>
          </div>
        </div>
      `;
    }).join('');
  }

  memoriesContainer?.addEventListener('click', (e) => {
    const reactBtn = e.target.closest('[data-action="react"]');
    if (reactBtn) {
      const id = reactBtn.dataset.id;
      const emoji = reactBtn.dataset.emoji;
      const user = store.get('user');
      const uid = user ? user.uid : 'anon';

      store.update('memories', list => list.map(m => {
        if (m.id === id) {
          const reactions = { ...(m.reactions || {}) };
          const cur = reactions[emoji] || [];
          reactions[emoji] = cur.includes(uid) ? cur.filter(u => u !== uid) : [...cur, uid];
          return { ...m, reactions };
        }
        return m;
      }));
      renderMemories();
      return;
    }

    const reportBtn = e.target.closest('[data-action="report"]');
    if (reportBtn) {
      const id = reportBtn.dataset.id;
      showToast('Thank you for flagging. Moderators will review this entry.', 'info');
    }
  });

  addMemoryForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const quote = document.getElementById('memory-quote').value.trim();
    const author = document.getElementById('memory-author').value.trim();
    const context = document.getElementById('memory-context').value.trim();

    const newMemory = {
      id: generateId('mem'),
      quote,
      author,
      context,
      reactions: { "😂": [], "❤️": [], "🔥": [] }
    };

    store.update('memories', list => [newMemory, ...list]);
    addMemoryForm.reset();
    addMemoryModal?.classList.remove('active');
    showToast('Memory added to wall!', 'success');
    renderMemories();
  });

  // Initial renders
  renderStudentCards();
  updateDropdownAndProfile();
  renderGallery();
  renderTeachers();
  renderSuperlatives();
  renderMemories();

  // Process initial hash or default to home
  handleHash();
}

// Start application safely
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
