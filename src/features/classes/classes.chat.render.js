import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function renderChatMessage(msg, currentUid, isAdmin) {
  const safeId = escapeAttr(msg.id);
  const safeAuthor = escapeHtml(msg.authorName || 'Student');
  const safeText = escapeHtml(msg.text || '');
  const safeHouse = escapeHtml(msg.authorHouse || 'Unity');
  const houseIcons = { Unity: '🔵', Faith: '🔴', Discipline: '🟠', Tolerance: '🟡' };
  const houseIcon = houseIcons[msg.authorHouse] || '🔵';
  const isOwn = currentUid && msg.authorUid === currentUid;
  const canDelete = isOwn || isAdmin;

  const dateObj = msg.createdAt?.toDate ? msg.createdAt.toDate() : (msg.createdAt ? new Date(msg.createdAt) : new Date());
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return `
    <div class="class-chat-msg ${isOwn ? 'is-own' : ''}" data-msg-id="${safeId}">
      <div class="class-chat-avatar">${escapeHtml((msg.authorName || 'S')[0].toUpperCase())}</div>
      <div class="class-chat-body">
        <div class="class-chat-meta">
          <span>${houseIcon} ${safeAuthor}</span> &middot;
          <span>${escapeHtml(timeStr)}</span>
        </div>
        <div class="class-chat-bubble">
          ${safeText}
        </div>
        ${canDelete ? `
          <button class="class-chat-delete-btn" data-action="delete-msg" data-id="${safeId}">
            Delete
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

export function renderChatContainer(isMember, isAdmin, className) {
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
      <div class="class-chat-messages" id="class-chat-messages-box">
        <div class="admin-empty-notice">Connecting to class chat...</div>
      </div>
      <form id="class-chat-send-form" class="class-chat-input-bar">
        <input type="text" id="class-chat-input-text" class="class-chat-input" placeholder="Type a message to your classmates..." required maxlength="400" autocomplete="off">
        <button type="submit" class="btn btn-primary btn-sm" id="class-chat-send-btn">Send</button>
      </form>
    </div>
  `;
}
