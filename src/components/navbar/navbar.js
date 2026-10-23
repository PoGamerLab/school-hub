import { store } from '../../core/store/store.js';
import { authService } from '../../core/auth/auth.js';
import { router } from '../../core/router/router.js';
import { showToast } from '../toast/toast.js';
import { escapeHtml } from '../../core/utils/escapeHtml.js';

export function initNavbar() {
  const container = document.querySelector('.nav-auth');
  const toggleBtn = document.getElementById('nav-toggle-btn');
  const mobileDrawer = document.getElementById('mobile-nav-drawer');

  // ── Mobile hamburger toggle ──────────────────────────────────────
  if (toggleBtn && mobileDrawer) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = mobileDrawer.classList.toggle('open');
      toggleBtn.classList.toggle('active', isOpen);
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
    });

    mobileDrawer.addEventListener('click', (e) => {
      if (e.target.closest('button')) {
        mobileDrawer.classList.remove('open');
        toggleBtn.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('click', (e) => {
      if (
        mobileDrawer.classList.contains('open') &&
        !mobileDrawer.contains(e.target) &&
        !toggleBtn.contains(e.target)
      ) {
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

  // ── Collapse avatar dropdown on outside click / Escape ───────────
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('nav-user-dropdown-menu');
    const btn  = document.getElementById('nav-user-dropdown-btn');
    if (menu?.classList.contains('open') &&
        !menu.contains(e.target) &&
        !btn?.contains(e.target)) {
      menu.classList.remove('open');
      btn?.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const menu = document.getElementById('nav-user-dropdown-menu');
      const btn  = document.getElementById('nav-user-dropdown-btn');
      if (menu?.classList.contains('open')) {
        menu.classList.remove('open');
        btn?.setAttribute('aria-expanded', 'false');
      }
    }
  });

  // ── Update admin-only & restricted-nav visibility ────────────────
  function updateNavVisibility(user) {
    const isAdmin = !!store.get('isAdmin');
    const isRestricted = !!(
      user && !isAdmin &&
      (user.status === 'needs_gate' ||
       user.status === 'needs_profile' ||
       user.status === 'revoked' ||
       user.banned)
    );

    document.querySelector('.navlinks')?.classList.toggle('hidden-auth', isRestricted);
    document.getElementById('nav-toggle-btn')?.classList.toggle('hidden-auth', isRestricted);
    document.getElementById('mobile-bottom-bar')?.classList.toggle('hidden-auth', isRestricted);

    if (isRestricted && mobileDrawer) mobileDrawer.classList.remove('open');

    // Hide member-only screens (Classes) when not signed in
    const isAuthed = !!user;
    document.querySelectorAll('[data-screen="class"]').forEach(el => {
      el.classList.toggle('hidden-auth', !isAuthed);
    });

    // Admin-gated elements
    document.querySelectorAll('.admin-nav-item, [data-screen="admin"]').forEach(el => {
      el.classList.toggle('hidden-admin', !isAdmin);
    });
  }

  // ── Main render function ─────────────────────────────────────────
  function renderAuth(user) {
    if (!container) return;
    const isAdmin = !!store.get('isAdmin');

    updateNavVisibility(user);

    if (user) {
      // Build avatar element
      const avatarHtml = user.photoURL
        ? `<img src="${escapeHtml(user.photoURL)}" alt="Avatar" class="auth-avatar">`
        : `<div class="auth-avatar">${escapeHtml((user.displayName || 'U')[0])}</div>`;

      container.innerHTML = `
        <div class="auth-dropdown-wrapper">
          <button class="auth-user-btn" id="nav-user-dropdown-btn"
                  aria-haspopup="true" aria-expanded="false" title="Account Menu">
            ${avatarHtml}
            <span class="auth-name"
                  title="${escapeHtml(user.displayName || '')}">${escapeHtml(user.displayName || 'You')}</span>
            <span class="dropdown-caret">▾</span>
          </button>
          <div class="auth-dropdown-menu" id="nav-user-dropdown-menu">
            <div class="auth-dropdown-header">
              <span class="tag ${isAdmin ? 'tag-gold' : 'tag-active'}">
                ${isAdmin ? '🛡️ Administrator' : '🎓 Student Member'}
              </span>
            </div>
            ${isAdmin ? `
              <button class="auth-dropdown-item" id="nav-goto-admin-btn">
                <span>🛡️</span> Admin Console
              </button>
            ` : ''}
            <button class="auth-dropdown-item" id="nav-profile-item-btn">
              <span>👤</span> My Profile
            </button>
            <button class="auth-dropdown-item danger" id="nav-signout-item-btn">
              <span>🚪</span> Sign Out
            </button>
          </div>
        </div>
      `;

      // Wire up the newly-created elements directly
      const dropdownBtn  = document.getElementById('nav-user-dropdown-btn');
      const dropdownMenu = document.getElementById('nav-user-dropdown-menu');

      dropdownBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = dropdownMenu?.classList.toggle('open');
        dropdownBtn.setAttribute('aria-expanded', String(open));
      });

      document.getElementById('nav-goto-admin-btn')?.addEventListener('click', () => {
        dropdownMenu?.classList.remove('open');
        router.navigate('admin');
      });

      document.getElementById('nav-profile-item-btn')?.addEventListener('click', () => {
        dropdownMenu?.classList.remove('open');
        // Navigate to own profile by UID so it always shows the correct person
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          router.navigate('profile', { id: currentUser.uid });
        } else {
          router.navigate('profile');
        }
      });

      document.getElementById('nav-signout-item-btn')?.addEventListener('click', async () => {
        dropdownMenu?.classList.remove('open');
        await authService.signOut();
        showToast('Signed out successfully.');
      });
    } else {
      // No user → show Sign In button
      container.innerHTML = `<button class="auth-btn" id="nav-signin-btn">Sign In</button>`;

      document.getElementById('nav-signin-btn')?.addEventListener('click', async () => {
        try {
          const signedInUser = await authService.signInWithGoogle();
          if (signedInUser) {
            showToast(`Welcome, ${signedInUser.displayName || 'Classmate'}!`, 'success');
          }
        } catch {
          // authService.signInWithGoogle already displays appropriate toast
        }
      });
    }
  }

  // ── Revoked screen sign-out ──────────────────────────────────────
  document.getElementById('revoked-signout-btn')?.addEventListener('click', async () => {
    await authService.signOut();
    showToast('Signed out.');
    window.location.hash = '#home';
  });

  // ── Mobile bottom tab bar ────────────────────────────────────────
  const bottomBar = document.getElementById('mobile-bottom-bar');
  if (bottomBar) {
    bottomBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.bottom-tab-btn');
      if (!btn) return;
      if (btn.id === 'bottom-more-btn') {
        const open = mobileDrawer?.classList.toggle('open');
        toggleBtn?.classList.toggle('active', open);
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

  // ── Reactive updates ─────────────────────────────────────────────
  store.subscribe('user', (user) => renderAuth(user));
  store.subscribe('isAdmin', () => renderAuth(authService.getCurrentUser()));

  // Initial render — user may be null here, that's correct (shows Sign In)
  renderAuth(store.get('user'));
}
