/**
 * Shared Avatar Helper (Phase D, section 6.6).
 * Renders avatar following fallback order:
 * 1. Uploaded thumbnail (photoThumb)
 * 2. Google photo (googlePhotoUrl)
 * 3. Gradient with initials
 * Zero inline event handlers. Attach error handlers cleanly in JavaScript.
 */

import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function renderAvatarHtml(options = {}) {
  const {
    photoSource = 'none',
    photoThumb = '',
    googlePhotoUrl = '',
    initials = 'ST',
    gradientIndex = 0,
    size = 'md', // 'sm', 'md', 'lg', 'xl'
    alt = 'Student Avatar',
    className = ''
  } = options;

  const safeInitials = escapeHtml((initials || 'ST').slice(0, 4));
  const safeAlt = escapeAttr(alt);
  const gradIdx = typeof gradientIndex === 'number' ? Math.max(0, Math.min(7, gradientIndex)) : 0;
  const sizeClass = `avatar-${size}`;
  const customClass = className ? escapeAttr(className) : '';

  if (photoSource === 'upload' && photoThumb && photoThumb.startsWith('data:image/jpeg;base64,')) {
    const safeSrc = escapeAttr(photoThumb);
    return `
      <div class="avatar-wrap ${sizeClass} ${customClass}" data-avatar="upload">
        <img src="${safeSrc}" alt="${safeAlt}" class="avatar-img" loading="lazy">
        <div class="avatar-fallback gradient-${gradIdx}">${safeInitials}</div>
      </div>
    `;
  }

  if (photoSource === 'google' && googlePhotoUrl && googlePhotoUrl.startsWith('https://lh3.googleusercontent.com/')) {
    const safeSrc = escapeAttr(googlePhotoUrl);
    return `
      <div class="avatar-wrap ${sizeClass} ${customClass}" data-avatar="google">
        <img src="${safeSrc}" alt="${safeAlt}" referrerpolicy="no-referrer" class="avatar-img" loading="lazy">
        <div class="avatar-fallback gradient-${gradIdx}">${safeInitials}</div>
      </div>
    `;
  }

  return `
    <div class="avatar-wrap ${sizeClass} ${customClass}" data-avatar="initials">
      <div class="avatar-fallback gradient-${gradIdx}">${safeInitials}</div>
    </div>
  `;
}

/**
 * Attaches JavaScript error fallback handlers to all avatar images in a container.
 * No inline onerror attribute used.
 */
export function bindAvatarFallbacks(container = document) {
  if (!container) return;
  const imgs = container.querySelectorAll('.avatar-wrap img.avatar-img');
  imgs.forEach(img => {
    img.addEventListener('error', () => {
      const wrap = img.closest('.avatar-wrap');
      if (wrap) {
        wrap.classList.add('avatar-load-failed');
      }
    }, { once: true });
  });
}
