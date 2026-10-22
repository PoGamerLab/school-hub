import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function renderReportedMemoryRow(mem) {
  const safeQuote = escapeHtml(mem.quote);
  const safeAuthor = escapeHtml(mem.author);
  const safeId = escapeAttr(mem.id);
  const reportsCount = Object.keys(mem.reports || {}).length;

  return `
    <div class="admin-item-row" data-id="${safeId}">
      <div>
        <div class="admin-item-quote">"${safeQuote}"</div>
        <div class="admin-item-meta">By ${safeAuthor} &middot; Flagged by ${reportsCount} student(s)</div>
      </div>
      <div class="admin-actions">
        <button class="btn-restore" data-action="restore" data-id="${safeId}">Restore</button>
        <button class="btn-danger" data-action="delete" data-id="${safeId}">Delete</button>
      </div>
    </div>
  `;
}
