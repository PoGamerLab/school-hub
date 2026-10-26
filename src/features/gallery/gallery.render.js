import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function renderGalleryCard(item, options = {}) {
  const safeCaption = escapeHtml(item.caption);
  const safeUrl = escapeAttr(item.url || 'images/apsacs-logo.png');
  const canDelete = Boolean(options.isAdmin || (options.currentUid && item.ownerUid === options.currentUid));
  const canReport = Boolean(options.currentUid && item.ownerUid !== options.currentUid);

  return `
    <div class="gallery-card" data-id="${escapeAttr(item.id)}">
      <div class="gallery-img-container">
        <img src="${safeUrl}" alt="${safeCaption}" class="gallery-img" loading="lazy">
        <div class="gallery-card-actions">
          ${canDelete ? `
            <button type="button" class="gallery-delete-btn" data-action="delete-gallery" data-id="${escapeAttr(item.id)}" data-owner="${escapeAttr(item.ownerUid || '')}" data-caption="${escapeAttr(item.caption || '')}" title="Delete Photo">
              ✕ Delete
            </button>
          ` : ''}
          ${canReport ? `
            <button type="button" class="gallery-report-btn" data-action="report-gallery" data-id="${escapeAttr(item.id)}" data-class="${escapeAttr(item.classId || '')}" title="Report Photo">
              🚩
            </button>
          ` : ''}
        </div>
      </div>
      <div class="gallery-caption">${safeCaption}</div>
    </div>
  `;
}
