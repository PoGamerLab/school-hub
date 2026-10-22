import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function renderReportedMemoryRow(mem) {
  const safeQuote = escapeHtml(mem.quote);
  const safeAuthor = escapeHtml(mem.author);
  const safeId = escapeAttr(mem.id);
  const reportsCount = mem.reportUids?.length || 0;

  return `
    <div class="admin-item-row" data-id="${safeId}">
      <div>
        <div style="font-weight:600;">"${safeQuote}"</div>
        <div style="font-size:12px; color:#6b7268;">By ${safeAuthor} &middot; Flagged by ${reportsCount} student(s)</div>
      </div>
      <div class="admin-actions">
        <button class="btn-restore" data-action="restore" data-id="${safeId}">Restore</button>
        <button class="btn-danger" data-action="delete" data-id="${safeId}">Delete</button>
      </div>
    </div>
  `;
}
