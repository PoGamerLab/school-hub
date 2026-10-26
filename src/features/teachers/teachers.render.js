import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function renderTeacherCard(tch, options = {}) {
  const safeName = escapeHtml(tch.name);
  const safeInitials = escapeHtml(tch.initials);
  const safeSubject = escapeHtml(tch.subject);
  const safeQual = escapeHtml(tch.qualification);
  const safeRoom = escapeHtml(tch.room);

  const imgHtml = tch.img 
    ? `<img src="${escapeAttr(tch.img)}" alt="${safeName}" class="teacher-photo-img" loading="lazy">`
    : '';

  const adminControls = options.isAdmin ? `
    <div class="teacher-admin-controls">
      <button type="button" class="teacher-action-btn edit-btn" data-action="edit-teacher" data-id="${escapeAttr(tch.id)}" title="Edit Teacher">Edit</button>
      <button type="button" class="teacher-action-btn delete-btn" data-action="delete-teacher" data-id="${escapeAttr(tch.id)}" data-name="${safeName}" title="Delete Teacher">Delete</button>
    </div>
  ` : '';

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
      ${adminControls}
    </div>
  `;
}
