import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

const REACTION_MAP = [
  { code: 'laugh', emoji: '😂' },
  { code: 'heart', emoji: '❤️' },
  { code: 'fire', emoji: '🔥' }
];

export function renderMemoryCard(mem, currentUid = null) {
  const safeQuote = escapeHtml(mem.quote);
  const safeAuthor = escapeHtml(mem.author);
  const safeContext = mem.context ? `<span class="memory-context">${escapeHtml(mem.context)}</span>` : '';
  const safeId = escapeAttr(mem.id);

  const reactions = mem.reactions || {};
  const userReaction = currentUid ? reactions[currentUid] : null;

  // Count reactions by short-code
  const reactionCounts = { laugh: 0, heart: 0, fire: 0 };
  Object.values(reactions).forEach(code => {
    if (reactionCounts[code] !== undefined) {
      reactionCounts[code]++;
    }
  });

  const reactionButtonsHtml = REACTION_MAP.map(({ code, emoji }) => {
    const count = reactionCounts[code] || 0;
    const isSelected = userReaction === code;

    return `
      <button class="reaction-btn ${isSelected ? 'user-reacted' : ''}" data-action="reaction" data-id="${safeId}" data-code="${code}">
        <span>${emoji}</span>
        ${count > 0 ? `<span>${count}</span>` : ''}
      </button>
    `;
  }).join('');

  const isReportedByMe = currentUid && mem.reports && mem.reports[currentUid];

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
        <button class="memory-report-btn ${isReportedByMe ? 'reported' : ''}" data-action="report" data-id="${safeId}" ${isReportedByMe ? 'disabled' : ''} title="${isReportedByMe ? 'You reported this entry' : 'Report inappropriate entry'}">
          🚩 ${isReportedByMe ? 'Flagged' : 'Report'}
        </button>
      </div>
    </div>
  `;
}
