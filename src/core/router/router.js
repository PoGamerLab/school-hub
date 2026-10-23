/**
 * Hash-based router with per-screen access control and screen lifecycle hooks.
 *
 * P0-2: Guard runs before any screen renders.
 * P0-6: Screen hooks (onEnter / onLeave) start listeners only when a screen
 *       is visible and stop them when leaving. Home subscribes to nothing.
 */

import { store } from '../store/store.js';
import { showToast } from '../../components/toast/toast.js';

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
    this.authReady = false;
    this._pendingHash = null;
    this.activeScreenId = null;
    this.screenHooks = new Map();
  }

  registerScreenHook(screenId, { onEnter, onLeave }) {
    if (!this.screenHooks.has(screenId)) {
      this.screenHooks.set(screenId, []);
    }
    this.screenHooks.get(screenId).push({ onEnter, onLeave });
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

  onAuthReady() {
    this.authReady = true;
    this._hideLoading();

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

    if (!this._accessAllowed(screenId)) {
      const user = store.get('user');
      const required = SCREEN_ACCESS[screenId] || 'member';
      if (required === 'admin') {
        showToast('Admin access required.', 'error');
      } else if (required === 'member' && !user) {
        showToast('Please sign in to view this page.', 'info');
      }
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

    this.navButtons = document.querySelectorAll('.navlinks button, .mobile-nav-links button');
    this.navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.screen === screenId);
    });

    // P0-6: Trigger lifecycle hooks (leave previous screen, enter new screen)
    const prevScreenId = this.activeScreenId;
    if (prevScreenId && prevScreenId !== screenId) {
      const prevHooks = this.screenHooks.get(prevScreenId);
      if (prevHooks) {
        prevHooks.forEach(hook => hook.onLeave && hook.onLeave());
      }
    }

    this.activeScreenId = screenId;
    const currentHooks = this.screenHooks.get(screenId);
    if (currentHooks) {
      currentHooks.forEach(hook => hook.onEnter && hook.onEnter());
    }

    store.set('activeScreen', screenId, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  }

  _hideLoading() {
    const el = document.getElementById('app-loading-screen');
    if (el) el.classList.add('hidden');
  }
}

export const router = new Router();
