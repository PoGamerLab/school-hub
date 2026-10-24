import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';
import { renderAvatarHtml } from '../../components/avatar/avatar.js';

export function renderChatMessage(msg, currentUid, isAdmin, studentProfile = null) {
  const safeId = escapeAttr(msg.id);
  const safeAuthor = escapeHtml(msg.authorName || 'Student');
  const safeText = escapeHtml(msg.text || '');
  const isOwn = currentUid && msg.authorUid === currentUid;
  const canDelete = isOwn || isAdmin;

  // Check reports
  const reportsCount = Object.keys(msg.reports || {}).length;
  const isFlagged = reportsCount >= 3;
  const isReportedByMe = currentUid && msg.reports && !!msg.reports[currentUid];

  const dateObj = msg.createdAt?.toDate ? msg.createdAt.toDate() : (msg.createdAt ? new Date(msg.createdAt) : new Date());
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const avatarHtml = renderAvatarHtml({
    photoSource: studentProfile?.photoSource || 'none',
    photoThumb: studentProfile?.photoThumb || '',
    googlePhotoUrl: studentProfile?.googlePhotoUrl || '',
    initials: studentProfile?.initials || (msg.authorName ? msg.authorName[0] : 'S'),
    gradientIndex: studentProfile?.gradientIndex || 0,
    size: 'sm',
    alt: msg.authorName || 'Student'
  });

  // Safe house rendering
  const house = studentProfile?.house || 'Unity';
  const houseIcons = { Unity: '🔵', Faith: '🔴', Discipline: '🟠', Tolerance: '🟡' };
  const houseIcon = houseIcons[house] || '🔵';

  if (isFlagged && !isAdmin) {
    return `
      <div class="class-chat-msg is-flagged" data-msg-id="${safeId}">
        <div class="class-chat-avatar">${avatarHtml}</div>
        <div class="class-chat-body">
          <div class="class-chat-meta">
            <span>${houseIcon} ${safeAuthor}</span> &middot;
            <span>${escapeHtml(timeStr)}</span>
          </div>
          <div class="class-chat-bubble flagged-bubble">
            ⚠️ <em>This message has been hidden for moderation review (${reportsCount} reports).</em>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="class-chat-msg ${isOwn ? 'is-own' : ''}" data-msg-id="${safeId}">
      <div class="class-chat-avatar">${avatarHtml}</div>
      <div class="class-chat-body">
        <div class="class-chat-meta">
          <span>${houseIcon} ${safeAuthor}</span> &middot;
          <span>${escapeHtml(timeStr)}</span>
          ${isAdmin && reportsCount > 0 ? `<span class="report-badge">🚩 ${reportsCount} reports</span>` : ''}
        </div>
        <div class="class-chat-bubble">
          ${safeText}
        </div>
        <div class="class-chat-actions">
          ${canDelete ? `
            <button class="class-chat-action-btn delete-btn" data-action="delete-msg" data-id="${safeId}">
              Delete
            </button>
          ` : ''}
          ${!isOwn && currentUid ? `
            <button class="class-chat-action-btn report-btn ${isReportedByMe ? 'already-reported' : ''}" data-action="report-msg" data-id="${safeId}" ${isReportedByMe ? 'disabled' : ''}>
              ${isReportedByMe ? 'Reported' : 'Report'}
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

export function renderChatContainer(isMember, isAdmin, className, isMuted = false, mutedUntilStr = '') {
  if (!isMember && !isAdmin) {
    return `
      <div class="class-private-lock-box">
        <div class="class-private-lock-icon">🔒</div>
        <div class="class-private-lock-title">Class Chat is Private</div>
        <div class="class-private-lock-desc">
          Only students enrolled in <strong>${escapeHtml(className)}</strong> can participate in and read this class chat.
        </div>
      </div>
    `;
  }

  return `
    <div class="class-chat-container">
      <div class="class-chat-header-bar">
        <button id="class-chat-load-older-btn" class="btn btn-xs btn-outline hidden">↑ Load older messages</button>
      </div>
      <div class="class-chat-messages" id="class-chat-messages-box">
        <div class="admin-empty-notice">Connecting to class chat...</div>
      </div>
      ${isMuted ? `
        <div class="chat-muted-notice">
          🔇 You have been muted by administration until ${escapeHtml(mutedUntilStr)}. You cannot send messages.
        </div>
      ` : `
        <form id="class-chat-send-form" class="class-chat-input-bar">
          <input type="text" id="class-chat-input-text" class="class-chat-input" placeholder="Type a message to your classmates (plain text only)..." required maxlength="500" autocomplete="off">
          <button type="submit" class="btn btn-primary btn-sm" id="class-chat-send-btn">Send</button>
        </form>
      `}
    </div>
  `;
}
