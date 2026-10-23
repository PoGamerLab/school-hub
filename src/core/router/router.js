/**
 * Hash-based router with per-screen access control.
 *
 * P0-2: Guard runs before any screen renders.
 *   - Screens declare an access level: 'public' | 'member' | 'admin'.
 *   - While auth state is loading a neutral loading screen is shown.
 *   - Admin screen DOM is not injected until admin is confirmed.
 *   - Non-authorised navigation silently redirects to 'home' with a toast.
 */

import { store } from '../store/store.js';
import { showToast } from '../../components/toast/toast.js';

/** Map of screenId → minimum access level required. */
const SCREEN_ACCESS = {
  home:         'public',
  class:        'member',
  students:     'member',
  profile:      'member',
  school:       'member',
  superlatives: 'member',
  memories:     'member',
  admin:        'admin'
};

class Router {
  constructor() {
    this.navButtons = [];
    this.screens = [];
    this.initialized = false;
    /** Set to true once authService.ready() resolves. */
    this.authReady = false;
    /** Saved hash to restore after auth resolves. */
    this._pendingHash = null;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.navButtons = document.querySelectorAll('.navlinks button, .mobile-nav-links button');
    this.screens = document.querySelectorAll('.screen');

    this.navButtons.forEach(btn => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.screen));
    });

    window.addEventListener('hashchange', () => this.handleHashChange());

    // Show loading state until auth resolves
    this._showLoading();
    this.handleHashChange();
  }

  /** Called by main.js after authService.ready() resolves. */
  onAuthReady() {
    this.authReady = true;
    this._hideLoading();

    // Re-route to where the user originally wanted to go
    const target = this._pendingHash || window.location.hash.replace('#', '') || 'home';
    this._pendingHash = null;
    this.switchTo(target, false);
  }

  handleHashChange() {
    const rawHash = window.location.hash.replace('#', '') || 'home';
    const [screenId, queryStr] = rawHash.split('?');

    if (queryStr) {
      const params = new URLSearchParams(queryStr);
      if (params.has('id')) {
        store.set('currentStudentId', params.get('id'), false);
      }
    }

    if (!this.authReady) {
      // Save what was requested; show loading until auth is resolved
      this._pendingHash = screenId || 'home';
      return;
    }

    this.switchTo(screenId || 'home', false);
  }

  navigate(screenId, params = null) {
    let hash = `#${screenId}`;
    if (params) {
      hash += `?${new URLSearchParams(params).toString()}`;
    }
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      this.switchTo(screenId, false);
    }
  }

  /** Returns the effective access level the current user has. */
  _userLevel() {
    const user = store.get('user');
    if (!user) return 'public';
    if (store.get('isAdmin')) return 'admin';
    return 'member';
  }

  _accessAllowed(screenId) {
    const required = SCREEN_ACCESS[screenId] || 'member';
    const level = this._userLevel();
    if (required === 'public') return true;
    if (required === 'member') return level === 'member' || level === 'admin';
    if (required === 'admin') return level === 'admin';
    return false;
  }

  switchTo(screenId, updateHash = true) {
    if (updateHash) {
      window.location.hash = `#${screenId}`;
      return;
    }

    // Guard: redirect if user lacks access (P0-2)
    if (!this._accessAllowed(screenId)) {
      const user = store.get('user');
      const required = SCREEN_ACCESS[screenId] || 'member';
      if (required === 'admin') {
        showToast('Admin access required.', 'error');
      } else if (required === 'member' && !user) {
        showToast('Please sign in to view this page.', 'info');
      }
      // Replace the hash so Back button works correctly
      history.replaceState(null, '', '#home');
      screenId = 'home';
    }

    let found = false;
    this.screens.forEach(screen => {
      if (screen.id === screenId) {
        screen.classList.add('active');
        found = true;
      } else {
        screen.classList.remove('active');
      }
    });

    if (!found) {
      document.getElementById('home')?.classList.add('active');
      screenId = 'home';
    }

    // Re-query nav buttons to pick up any that were added dynamically
    this.navButtons = document.querySelectorAll('.navlinks button, .mobile-nav-links button');
    this.navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.screen === screenId);
    });

    store.set('activeScreen', screenId, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Loading screen helpers ────────────────────────────────────────────────

  _showLoading() {
    let el = document.getElementById('app-loading-screen');
    if (!el) {
      el = document.createElement('div');
      el.id = 'app-loading-screen';
      el.className = 'app-loading-screen';
      el.innerHTML = '<div class="app-loading-spinner"></div><p>Loading…</p>';
      document.body.appendChild(el);
    }
    el.classList.remove('hidden');
    // Hide actual screens while loading
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  }

  _hideLoading() {
    const el = document.getElementById('app-loading-screen');
    if (el) el.classList.add('hidden');
  }
}

export const router = new Router();
