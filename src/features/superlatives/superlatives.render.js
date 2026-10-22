import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function renderSuperlativeCard(sup) {
  const safeIcon = escapeHtml(sup.icon || '🏆');
  const safeTitle = escapeHtml(sup.title);
  const safeWinner = escapeHtml(sup.winner);
  const safeReason = sup.reason ? `<div class="superlative-reason">${escapeHtml(sup.reason)}</div>` : '';

  return `
    <div class="superlative-card" data-id="${escapeAttr(sup.id)}">
      <div class="superlative-icon">${safeIcon}</div>
      <div class="superlative-title">${safeTitle}</div>
      <div class="superlative-winner">${safeWinner}</div>
      ${safeReason}
    </div>
  `;
}
