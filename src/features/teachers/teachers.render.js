import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function renderTeacherCard(tch) {
  const safeName = escapeHtml(tch.name);
  const safeInitials = escapeHtml(tch.initials);
  const safeSubject = escapeHtml(tch.subject);
  const safeQual = escapeHtml(tch.qualification);
  const safeRoom = escapeHtml(tch.room);

  const imgHtml = tch.img 
    ? `<img src="${escapeAttr(tch.img)}" alt="${safeName}" class="teacher-photo-img" loading="lazy">`
    : '';

  return `
    <div class="teacher-card" data-id="${escapeAttr(tch.id)}">
      <div class="teacher-photo-box">
        ${imgHtml}
        ${safeInitials}
      </div>
      <div class="teacher-name">${safeName}</div>
      <span class="teacher-subject">${safeSubject}</span>
      <div class="teacher-details">
        <div>${safeQual}</div>
        <div class="teacher-room-tag">📍 ${safeRoom}</div>
      </div>
    </div>
  `;
}
