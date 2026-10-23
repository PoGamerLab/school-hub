/**
 * Application entry point.
 *
 * Boot order:
 * 1. Start auth listener (non-blocking).
 * 2. Init navbar and modals immediately so DOM is ready.
 * 3. Init router — shows loading screen while auth is resolving.
 * 4. Wait for authService.ready(), then tell the router auth is resolved.
 * 5. Init features and register screen-scoped listeners (P0-6).
 *    Home subscribes to nothing.
 * 6. Admin is loaded lazily only after admin status is confirmed (P0-2).
 */

import { router } from './core/router/router.js';
import { authService } from './core/auth/auth.js';
import { store } from './core/store/store.js';
import { initNavbar } from './components/navbar/navbar.js';
import { initModal } from './components/modal/modal.js';

import { initClasses } from './features/classes/classes.js';
import { initStudents } from './features/students/students.js';
import { initTeachers } from './features/teachers/teachers.js';
import { initGallery } from './features/gallery/gallery.js';
import { initSuperlatives } from './features/superlatives/superlatives.js';
import { initMemories } from './features/memories/memories.js';
import { initGate } from './features/gate/gate.js';
import { initOnboarding } from './features/onboarding/onboarding.js';

let adminInitialized = false;
async function maybeInitAdmin() {
  if (adminInitialized || !store.get('isAdmin')) return;
  adminInitialized = true;
  const { initAdmin } = await import('./features/admin/admin.js');
  initAdmin();
}

async function boot() {
  // initNavbar FIRST — registers store.subscribe('user') so the Sign In
  // button is guaranteed to render even if Firebase resolves instantly.
  initNavbar();

  initModal('add-student-modal',    'open-add-student-btn',    'close-student-modal');
  initModal('add-photo-modal',      'open-add-photo-btn',      'close-photo-modal');
  initModal('add-teacher-modal',    'open-add-teacher-btn',    'close-teacher-modal');
  initModal('add-superlative-modal','open-add-superlative-btn','close-superlative-modal');
  initModal('add-memory-modal',     'open-add-memory-btn',     'close-memory-modal');
  initModal('propose-class-modal',  'open-propose-class-btn',  'close-propose-class-modal');
  initModal('join-class-modal',     'open-join-class-btn',     'close-join-class-modal');

  // Register all feature screen hooks before router unlocks
  initClasses();
  initStudents();
  initTeachers();
  initGallery();
  initSuperlatives();
  initMemories();
  initGate();
  initOnboarding();

  router.init();

  // Start auth listener AFTER navbar and router are ready
  authService.init();

  await authService.ready();
  router.onAuthReady();

  document.getElementById('hero-browse-btn')
    ?.addEventListener('click', () => router.navigate('students'));
  document.getElementById('hero-about-btn')
    ?.addEventListener('click', () => router.navigate('school'));

  await maybeInitAdmin();
  store.subscribe('isAdmin', async () => {
    await maybeInitAdmin();
  });

  console.log('[SchoolHub] Boot complete.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
