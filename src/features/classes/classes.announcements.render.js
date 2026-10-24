import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function renderAnnouncementCard(ann, currentUid, isAdmin) {
  const safeId = escapeAttr(ann.id);
  const safeTitle = escapeHtml(ann.title || 'Announcement');
  const safeContent = escapeHtml(ann.body || ann.content || '');
  const safeAuthor = escapeHtml(ann.authorName || 'Class Administration');
  const roleLabel = ann.authorRole ? escapeHtml(ann.authorRole) : (isAdmin ? 'Admin' : 'Class Official');

  const dateObj = ann.createdAt?.toDate ? ann.createdAt.toDate() : (ann.createdAt ? new Date(ann.createdAt) : new Date());
  const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  const canDelete = isAdmin || (currentUid && ann.authorUid === currentUid);

  return `
    <div class="announcement-card" data-ann-id="${safeId}">
      <div class="announcement-header">
        <div class="announcement-title">📌 ${safeTitle}</div>
        ${canDelete ? `
          <button class="announcement-delete-btn" data-action="delete-ann" data-id="${safeId}">
            &times; Delete
          </button>
        ` : ''}
      </div>
      <div class="announcement-meta">
        <span><strong>${safeAuthor}</strong> (${roleLabel})</span> &middot;
        <span>${escapeHtml(dateStr)}</span>
      </div>
      <div class="announcement-content">${safeContent}</div>
    </div>
  `;
}

export function renderAnnouncementsContainer(isMember, isAdmin, canPost, className) {
  if (!isMember && !isAdmin) {
    return `
      <div class="class-private-lock-box">
        <div class="class-private-lock-icon">🔒</div>
        <div class="class-private-lock-title">Announcements are Private</div>
        <div class="class-private-lock-desc">
          Only students enrolled in <strong>${escapeHtml(className)}</strong> can view announcements for this class.
        </div>
      </div>
    `;
  }

  return `
    <div class="class-announcements-header">
      <div>
        <h3>Official Class Announcements</h3>
        <p class="section-head-subtitle">Important test dates, schedules, and notices for this class</p>
      </div>
      ${canPost ? `
        <button class="btn btn-primary btn-sm" id="open-add-announcement-btn">
          + Post Announcement
        </button>
      ` : ''}
    </div>
    <div class="class-announcements-list" id="class-announcements-list-box">
      <div class="admin-empty-notice">Loading class announcements...</div>
    </div>
  `;
}
