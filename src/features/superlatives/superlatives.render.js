import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function renderSuperlativeCard(sup, currentUid = null) {
  const safeIcon = escapeHtml(sup.icon || '🏆');
  const safeTitle = escapeHtml(sup.title);
  const safeId = escapeAttr(sup.id);

  const nominees = Array.isArray(sup.nominees) ? sup.nominees : [];
  const votes = sup.votes || {};
  const totalVotes = Object.keys(votes).length;
  const userVote = currentUid ? votes[currentUid] : null;

  // Calculate vote counts per nominee
  const voteCounts = {};
  nominees.forEach(n => { voteCounts[n] = 0; });
  Object.values(votes).forEach(nominee => {
    if (voteCounts[nominee] !== undefined) {
      voteCounts[nominee]++;
    }
  });

  const nomineesHtml = nominees.map(nominee => {
    const count = voteCounts[nominee] || 0;
    const isVoted = userVote === nominee;
    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    const safeNominee = escapeHtml(nominee);

    return `
      <div class="nominee-row ${isVoted ? 'voted' : ''}" data-action="vote" data-id="${safeId}" data-nominee="${escapeAttr(nominee)}">
        <span class="nominee-name">${safeNominee}</span>
        <span class="nominee-votes">${count} (${pct}%)</span>
      </div>
    `;
  }).join('');

  const reports = sup.reports || {};
  const hasReported = currentUid && reports[currentUid];

  return `
    <div class="superlative-card" data-id="${safeId}">
      <div class="superlative-header">
        <div class="superlative-icon">${safeIcon}</div>
        <button class="btn-flag ${hasReported ? 'user-reported' : ''}" data-action="report-superlative" data-id="${safeId}" title="${hasReported ? 'Flagged for review' : 'Report category'}">
          ${hasReported ? '🚩 Flagged' : '🚩'}
        </button>
      </div>
      <div class="superlative-title">${safeTitle}</div>
      <div class="nominees-list">
        ${nomineesHtml}
      </div>
    </div>
  `;
}
