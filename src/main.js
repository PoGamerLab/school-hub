import { router } from './core/router/router.js';
import { authService } from './core/auth/auth.js';
import { initNavbar } from './components/navbar/navbar.js';
import { initModal } from './components/modal/modal.js';

import { initClasses } from './features/classes/classes.js';
import { initStudents } from './features/students/students.js';
import { initTeachers } from './features/teachers/teachers.js';
import { initGallery } from './features/gallery/gallery.js';
import { initSuperlatives } from './features/superlatives/superlatives.js';
import { initMemories } from './features/memories/memories.js';
import { initAdmin } from './features/admin/admin.js';

async function boot() {
  // 1. Initialize Auth Lifecycle
  await authService.init();

  // 2. Initialize Top Navbar
  initNavbar();

  // 3. Initialize Modals
  initModal('add-student-modal', 'open-add-student-btn', 'close-student-modal');
  initModal('add-photo-modal', 'open-add-photo-btn', 'close-photo-modal');
  initModal('add-teacher-modal', 'open-add-teacher-btn', 'close-teacher-modal');
  initModal('add-superlative-modal', 'open-add-superlative-btn', 'close-superlative-modal');
  initModal('add-memory-modal', 'open-add-memory-btn', 'close-memory-modal');
  initModal('propose-class-modal', 'open-propose-class-btn', 'close-propose-class-modal');
  initModal('join-class-modal', 'open-join-class-btn', 'close-join-class-modal');

  // 4. Initialize Features
  initClasses();
  initStudents();
  initTeachers();
  initGallery();
  initSuperlatives();
  initMemories();
  initAdmin();

  // 5. Initialize Router
  router.init();

  // 6. Connect Hero CTAs
  document.getElementById('hero-browse-btn')?.addEventListener('click', () => {
    router.navigate('students');
  });

  document.getElementById('hero-about-btn')?.addEventListener('click', () => {
    router.navigate('school');
  });

  console.log('[SchoolHub] Modular application successfully booted.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
