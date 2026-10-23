import { store } from '../../core/store/store.js';
import { authService } from '../../core/auth/auth.js';
import { router } from '../../core/router/router.js';
import { showToast } from '../toast/toast.js';
import { escapeHtml } from '../../core/utils/escapeHtml.js';

export function initNavbar() {
  const container = document.querySelector('.nav-auth');
  const toggleBtn = document.getElementById('nav-toggle-btn');
  const mobileDrawer = document.getElementById('mobile-nav-drawer');

  // Mobile menu toggle
  if (toggleBtn && mobileDrawer) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = mobileDrawer.classList.toggle('open');
      toggleBtn.classList.toggle('active', isOpen);
      toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    mobileDrawer.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (btn) {
        mobileDrawer.classList.remove('open');
        toggleBtn.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('click', (e) => {
      if (mobileDrawer.classList.contains('open') && !mobileDrawer.contains(e.target) && !toggleBtn.contains(e.target)) {
        mobileDrawer.classList.remove('open');
        toggleBtn.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileDrawer.classList.contains('open')) {
        mobileDrawer.classList.remove('open');
        toggleBtn.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Close dropdown menu on outside click or escape
  document.addEventListener('click', (e) => {
    const dropdownMenu = document.getElementById('nav-user-dropdown-menu');
    const dropdownBtn = document.getElementById('nav-user-dropdown-btn');
    if (dropdownMenu?.classList.contains('open') && !dropdownMenu.contains(e.target) && !dropdownBtn?.contains(e.target)) {
      dropdownMenu.classList.remove('open');
      dropdownBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const dropdownMenu = document.getElementById('nav-user-dropdown-menu');
      const dropdownBtn = document.getElementById('nav-user-dropdown-btn');
      if (dropdownMenu?.classList.contains('open')) {
        dropdownMenu.classList.remove('open');
        dropdownBtn?.setAttribute('aria-expanded', 'false');
      }
    }
  });

  function updateNavVisibility(user) {
    const isAdmin = store.get('isAdmin');
    // Non-active registered users (in gate, onboarding, or revoked) have restricted nav
    const isRestricted = !!(user && !isAdmin && (user.status === 'needs_gate' || user.status === 'needs_profile' || user.status === 'revoked' || user.banned));
    const navlinks = document.querySelector('.navlinks');
    const navToggle = document.getElementById('nav-toggle-btn');
    const bottomBar = document.getElementById('mobile-bottom-bar');

    // Only hide tabs during the student gate/onboarding flow
    // Signed-out visitors, active members, and admins always see navigation
    if (navlinks) navlinks.classList.toggle('hidden-auth', isRestricted);
    if (navToggle) navToggle.classList.toggle('hidden-auth', isRestricted);
    if (bottomBar) bottomBar.classList.toggle('hidden-auth', isRestricted);
    if (isRestricted && mobileDrawer) mobileDrawer.classList.remove('open');

    // Toggle admin-only tabs and controls
    document.querySelectorAll('.admin-nav-item, [data-screen="admin"]').forEach(el => {
      el.classList.toggle('hidden-admin', !isAdmin);
    });
  }

  function renderAuth(user) {
    if (!container) return;
    const isAdmin = store.get('isAdmin');
    updateNavVisibility(user);

    if (user) {
      const avatarHtml = user.photoURL 
        ? `<img src="${escapeHtml(user.photoURL)}" alt="Avatar" class="auth-avatar">`
        : `<div class="auth-avatar">${escapeHtml(user.displayName?.[0] || 'U')}</div>`;

      container.innerHTML = `
        <div class="auth-dropdown-wrapper">
          <button class="auth-user-btn" id="nav-user-dropdown-btn" aria-haspopup="true" aria-expanded="false" title="Account Menu">
            ${avatarHtml}
            <span class="auth-name" title="${escapeHtml(user.displayName)}">${escapeHtml(user.displayName)}</span>
            <span class="dropdown-caret">▾</span>
          </button>
          <div class="auth-dropdown-menu" id="nav-user-dropdown-menu">
            <div class="auth-dropdown-header">
              <span class="tag ${isAdmin ? 'tag-gold' : 'tag-active'}">${isAdmin ? '🛡️ Administrator' : '🎓 Student Member'}</span>
            </div>
            ${isAdmin ? `
              <button class="auth-dropdown-item" id="nav-admin-item-btn">
                <span>🛡️</span> Admin Console
              </button>
            ` : `
              <button class="auth-dropdown-item" id="nav-claim-admin-btn">
                <span>🔑</span> Claim Admin Access
              </button>
            `}
            <button class="auth-dropdown-item" id="nav-profile-item-btn">
              <span>👤</span> My Profile
            </button>
            <button class="auth-dropdown-item danger" id="nav-signout-item-btn">
              <span>🚪</span> Sign Out
            </button>
          </div>
        </div>
      `;

      const dropdownBtn = document.getElementById('nav-user-dropdown-btn');
      const dropdownMenu = document.getElementById('nav-user-dropdown-menu');

      dropdownBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdownMenu?.classList.toggle('open');
        dropdownBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      document.getElementById('nav-admin-item-btn')?.addEventListener('click', () => {
        dropdownMenu?.classList.remove('open');
        router.navigate('admin');
      });

      document.getElementById('nav-claim-admin-btn')?.addEventListener('click', async () => {
        dropdownMenu?.classList.remove('open');
        const pass = prompt('Enter Administrator Passphrase (e.g. APSACS2026):');
        if (pass) {
          const success = await authService.claimAdminAccess(pass);
          if (success) {
            router.navigate('admin');
          }
        }
      });

      document.getElementById('nav-profile-item-btn')?.addEventListener('click', () => {
        dropdownMenu?.classList.remove('open');
        router.navigate('profile');
      });

      document.getElementById('nav-signout-item-btn')?.addEventListener('click', async () => {
        dropdownMenu?.classList.remove('open');
        await authService.signOut();
        showToast('Signed out successfully.');
      });
    } else {
      container.innerHTML = `
        <button class="auth-btn" id="nav-signin-btn">
          Sign In
        </button>
      `;

      document.getElementById('nav-signin-btn')?.addEventListener('click', async () => {
        try {
          const signedInUser = await authService.signInWithGoogle();
          if (signedInUser) {
            showToast(`Welcome, ${signedInUser.displayName || 'Classmate'}!`, 'success');
          }
        } catch (err) {
          showToast('Sign-in cancelled or failed.', 'error');
        }
      });
    }
  }

  document.getElementById('revoked-signout-btn')?.addEventListener('click', async () => {
    await authService.signOut();
    showToast('Signed out.');
    window.location.hash = '#home';
  });

  // Mobile Bottom Tab Bar (Phase 4)
  const bottomBar = document.getElementById('mobile-bottom-bar');
  if (bottomBar) {
    bottomBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.bottom-tab-btn');
      if (!btn) return;
      if (btn.id === 'bottom-more-btn') {
        const isOpen = mobileDrawer?.classList.toggle('open');
        toggleBtn?.classList.toggle('active', isOpen);
        return;
      }
      const screen = btn.dataset.screen;
      if (screen) {
        mobileDrawer?.classList.remove('open');
        toggleBtn?.classList.remove('active');
        router.navigate(screen);
      }
    });

    store.subscribe('activeScreen', (screen) => {
      bottomBar.querySelectorAll('.bottom-tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.screen === screen);
      });
    });
  }

  store.subscribe('user', (user) => {
    renderAuth(user);
  });

  store.subscribe('isAdmin', () => {
    renderAuth(authService.getCurrentUser());
  });

  renderAuth(store.get('user'));
}
