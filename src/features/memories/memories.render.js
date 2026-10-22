import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function renderMemoryCard(mem, currentUid = null) {
  const safeQuote = escapeHtml(mem.quote);
  const safeAuthor = escapeHtml(mem.author);
  const safeContext = mem.context ? `<span class="memory-context">${escapeHtml(mem.context)}</span>` : '';
  const safeId = escapeAttr(mem.id);

  const emojis = ['😂', '❤️', '🔥'];
  const reactions = mem.reactions || {};

  const reactionButtonsHtml = emojis.map(emoji => {
    const uids = reactions[emoji] || [];
    const count = uids.length;
    const hasReacted = currentUid && uids.includes(currentUid);
    const activeClass = hasReacted ? 'user-reacted' : '';

    return `
      <button class="reaction-btn ${activeClass}" data-action="reaction" data-id="${safeId}" data-emoji="${emoji}">
        <span>${emoji}</span>
        ${count > 0 ? `<span>${count}</span>` : ''}
      </button>
    `;
  }).join('');

  return `
    <div class="memory-card" data-id="${safeId}">
      <div class="memory-quote">${safeQuote}</div>
      <div class="memory-meta">
        <span class="memory-author">${safeAuthor}</span>
        ${safeContext}
      </div>
      <div class="memory-footer">
        <div class="reactions-list">
          ${reactionButtonsHtml}
        </div>
        <button class="memory-report-btn" data-action="report" data-id="${safeId}" title="Report inappropriate entry">
          🚩 Report
        </button>
      </div>
    </div>
  `;
}
