import { store } from '../store/store.js';

class Router {
  constructor() {
    this.navButtons = [];
    this.screens = [];
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.navButtons = document.querySelectorAll('.navlinks button, .mobile-nav-links button');
    this.screens = document.querySelectorAll('.screen');

    // Setup navigation clicks
    this.navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const screenId = btn.dataset.screen;
        this.navigate(screenId);
      });
    });

    // Setup browser back/forward and hash change
    window.addEventListener('hashchange', () => {
      this.handleHashChange();
    });

    // Read initial route from URL hash or default to 'home'
    this.handleHashChange();
    this.initialized = true;
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

    this.switchTo(screenId || 'home', false);
  }

  navigate(screenId, params = null) {
    let hash = `#${screenId}`;
    if (params) {
      const q = new URLSearchParams(params).toString();
      hash += `?${q}`;
    }
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      this.switchTo(screenId, false);
    }
  }

  switchTo(screenId, updateHash = true) {
    if (updateHash) {
      window.location.hash = `#${screenId}`;
      return;
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

    // If target screen doesn't exist, fallback to home
    if (!found) {
      const homeScreen = document.getElementById('home');
      if (homeScreen) homeScreen.classList.add('active');
      screenId = 'home';
    }

    // Refresh nav buttons in case dynamic ones were added (e.g. admin)
    this.navButtons = document.querySelectorAll('.navlinks button, .mobile-nav-links button');
    this.navButtons.forEach(btn => {
      if (btn.dataset.screen === screenId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    store.set('activeScreen', screenId, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export const router = new Router();
