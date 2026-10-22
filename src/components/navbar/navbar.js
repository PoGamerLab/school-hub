import { store } from '../../core/store/store.js';
import { authService } from '../../core/auth/auth.js';
import { showToast } from '../toast/toast.js';
import { escapeHtml } from '../../core/utils/escapeHtml.js';

export function initNavbar() {
  const container = document.querySelector('.nav-auth');
  if (!container) return;

  function renderAuth(user) {
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

  // Subscribe to auth changes
  store.subscribe('user', (user) => {
    renderAuth(user);
  });

  renderAuth(store.get('user'));
}
