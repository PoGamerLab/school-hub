/**
 * Application entry point.
 *
 * Boot order (P0-2):
 * 1. Start auth listener (does NOT block; resolves a "ready" promise).
 * 2. Init navbar and modals immediately so the DOM is ready.
 * 3. Init router — shows loading screen while auth is resolving.
 * 4. Wait for authService.ready(), then tell the router auth is resolved.
 * 5. Init features lazily — only when the router shows their screen
 *    (P0-6 will move this fully to screen-open events; here we do a
 *    safe minimal wiring for correctness first).
 */

import { router } from './core/router/router.js';
import { authService } from './core/auth/auth.js';
import { store } from './core/store/store.js';
import { initNavbar } from './components/navbar/navbar.js';
import { initModal } from './components/modal/modal.js';

import { initClasses } from './features/classes/classes.js';
import { initStudents } from './features/students/students.js';
import { initGallery } from './features/gallery/gallery.js';
import { initSuperlatives } from './features/superlatives/superlatives.js';
import { initMemories } from './features/memories/memories.js';

// Admin is loaded lazily after admin status is confirmed (P0-2)
let adminInitialized = false;
async function maybeInitAdmin() {
  if (adminInitialized || !store.get('isAdmin')) return;
  adminInitialized = true;
  const { initAdmin } = await import('./features/admin/admin.js');
  initAdmin();
  // Teachers are admin-managed
  const { initTeachers } = await import('./features/teachers/teachers.js');
  initTeachers();
}

async function boot() {
  // 1. Start auth (non-blocking)
  authService.init();

  // 2. Setup navbar and modals
  initNavbar();

  initModal('add-student-modal',    'open-add-student-btn',    'close-student-modal');
  initModal('add-photo-modal',      'open-add-photo-btn',      'close-photo-modal');
  initModal('add-teacher-modal',    'open-add-teacher-btn',    'close-teacher-modal');
  initModal('add-superlative-modal','open-add-superlative-btn','close-superlative-modal');
  initModal('add-memory-modal',     'open-add-memory-btn',     'close-memory-modal');
  initModal('propose-class-modal',  'open-propose-class-btn',  'close-propose-class-modal');
  initModal('join-class-modal',     'open-join-class-btn',     'close-join-class-modal');

  // 3. Init router (shows loading screen)
  router.init();

  // 4. Wait for auth state to be known
  await authService.ready();

  // 5. Unlock the router — will navigate to the pending route
  router.onAuthReady();

  // 6. Wire hero CTAs
  document.getElementById('hero-browse-btn')
    ?.addEventListener('click', () => router.navigate('students'));
  document.getElementById('hero-about-btn')
    ?.addEventListener('click', () => router.navigate('school'));

  // 7. Init member features (will be scoped per screen in P0-6)
  initClasses();
  initStudents();
  initGallery();
  initSuperlatives();
  initMemories();

  // 8. Init admin features only if user is confirmed admin (P0-2)
  await maybeInitAdmin();

  // Re-check when admin status changes (e.g., first sign-in)
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
