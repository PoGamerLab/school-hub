import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function renderGalleryCard(item) {
  const safeCaption = escapeHtml(item.caption);
  const safeUrl = escapeAttr(item.url || 'images/apsacs-logo.png');

  return `
    <div class="gallery-card" data-id="${escapeAttr(item.id)}">
      <div class="gallery-img-container">
        <img src="${safeUrl}" alt="${safeCaption}" class="gallery-img" loading="lazy">
      </div>
      <div class="gallery-caption">${safeCaption}</div>
    </div>
  `;
}
