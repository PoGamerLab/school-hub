import { escapeHtml } from '../../core/utils/escapeHtml.js';

export function renderClassBanner(classInfo) {
  if (!classInfo) return '';
  return `
    <div class="class-banner">
      <div class="class-banner-content">
        <div class="k">Class Teacher</div>
        <h3>${escapeHtml(classInfo.name)}</h3>
        <div class="meta">${escapeHtml(classInfo.classTeacher)} &middot; ${escapeHtml(classInfo.room)} &middot; ${escapeHtml(classInfo.track)}</div>
      </div>
      <div class="class-avatar">${escapeHtml(classInfo.avatar || '10B')}</div>
    </div>
  `;
}
