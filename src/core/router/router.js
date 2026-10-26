/**
 * Hash-based router with per-screen access control, lifecycle hooks,
 * and user status routing (Phase 1, section 4.6).
 */

import { store } from '../store/store.js';
import { showToast } from '../../components/toast/toast.js';

const SCREEN_ACCESS = {
  home:             'public',
  gate:             'public',
  onboarding:       'public',
  revoked:          'public',
  'loading-failed': 'public',
  school:           'public',
  class:            'member',
  students:         'member',
  profile:          'member',
  superlatives:     'member',
  memories:         'member',
  admin:            'admin'
};

class Router {
  constructor() {
    this.navButtons = [];
    this.screens = [];
    this.initialized = false;
    this.authReady = false;
    this._pendingHash = null;
    this._intendedDestination = null;
    this.activeScreenId = null;
    this.screenHooks = new Map();
    this._routeSig = null;
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

    store.subscribe('user', (u) => {
      if (!this.authReady) return;
      const isAdmin = !!store.get('isAdmin');
      const sig = u ? [u.uid, u.status, u.banned, isAdmin, u.classId].join('|') : 'out';
      if (sig === this._routeSig) return; // ignore echoes with the same routing data
      this._routeSig = sig;
      this.handleHashChange();
    });

    this._showLoading();
    this.handleHashChange();
  }

  onAuthReady() {
    this.authReady = true;
    this._hideLoading();

    const u = store.get('user');
    const isAdmin = !!store.get('isAdmin');
    this._routeSig = u ? [u.uid, u.status, u.banned, isAdmin, u.classId].join('|') : 'out';

    const target = this._pendingHash || window.location.hash.replace('#', '') || 'home';
    this._pendingHash = null;
    this.switchTo(target, false);
  }

  onActivationComplete() {
    const dest = this._intendedDestination || 'home';
    this._intendedDestination = null;
    this.navigate(dest);
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
      this._intendedDestination = screenId || 'home';
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
    if (user.status === 'active') return 'member';
    return 'public';
  }

  _resolveStatusRoute(screenId) {
    if (store.get('profileLoadFailed')) {
      return 'loading-failed';
    }

    // Escape the loading-failed screen once it is no longer needed
    if (screenId === 'loading-failed' && !store.get('profileLoadFailed')) {
      return this._intendedDestination || 'home';
    }

    if (screenId === 'revoked') {
      const u = store.get('user');
      if (!u || !(u.banned || u.status === 'revoked')) return 'home';
    }

    const user = store.get('user');
    const isAdmin = store.get('isAdmin');

    if (!user) {
      // Signed out: public screens are allowed, otherwise landing page
      if (SCREEN_ACCESS[screenId] === 'public') {
        return screenId;
      }
      return 'home';
    }

    if (isAdmin) {
      // Admin bypasses gate, onboarding and revoked completely
      if (screenId === 'gate' || screenId === 'onboarding' || screenId === 'revoked') {
        return this._intendedDestination || 'home';
      }
      return screenId;
    }

    if (user.banned || user.status === 'revoked') {
      return 'revoked';
    }

    if (user.status === 'needs_gate') {
      return 'gate';
    }

    if (user.status === 'needs_profile') {
      return 'onboarding';
    }

    // Active member: if they landed on gate or onboarding, send to intended or home
    if (screenId === 'gate' || screenId === 'onboarding' || screenId === 'revoked') {
      return this._intendedDestination || 'home';
    }

    // Students tab has been consolidated into the Classes hub
    if (screenId === 'students') {
      return 'class';
    }

    return screenId;
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

    const resolved = this._resolveStatusRoute(screenId);
    if (resolved !== screenId) {
      if (resolved === 'gate' || resolved === 'onboarding' || resolved === 'revoked') {
        this._intendedDestination = screenId;
      }
      history.replaceState(null, '', `#${resolved}`);
      screenId = resolved;
    }

    if (!this._accessAllowed(screenId)) {
      const user = store.get('user');
      const required = SCREEN_ACCESS[screenId] || 'member';
      if (required === 'admin') {
        showToast('Admin access required.', 'error');
      } else if (required === 'member' && !user) {
        showToast('Please sign in with Google to view this page.', 'info');
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
    if (prevScreenId !== screenId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
