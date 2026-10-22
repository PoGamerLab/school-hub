import { store } from '../../core/store/store.js';
import { authService } from '../../core/auth/auth.js';
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

  function renderAuth(user) {
    if (!container) return;
    if (user) {
      const avatarHtml = user.photoURL 
        ? `<img src="${escapeHtml(user.photoURL)}" alt="Avatar" class="auth-avatar">`
        : `<div class="auth-avatar">${escapeHtml(user.displayName?.[0] || 'U')}</div>`;

      container.innerHTML = `
        <div class="auth-user">
          ${avatarHtml}
          <span class="auth-name" title="${escapeHtml(user.displayName)}">${escapeHtml(user.displayName)}</span>
          <button class="auth-signout" id="nav-signout-btn" title="Sign out">✕</button>
        </div>
      `;

      document.getElementById('nav-signout-btn')?.addEventListener('click', async () => {
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

  store.subscribe('user', (user) => {
    renderAuth(user);
  });

  renderAuth(store.get('user'));
}
