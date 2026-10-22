import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function renderClassBanner(classInfo, isMember = false) {
  if (!classInfo) {
    return `
      <div class="empty-state full-width-empty">
        <div class="empty-state-icon">🏛️</div>
        <div class="empty-state-title">No Class Selected</div>
        <div class="empty-state-desc">Join your class with an invite code or propose a new class below.</div>
      </div>
    `;
  }

  return `
    <div class="class-banner">
      <div class="class-banner-content">
        <div class="k">Active Class</div>
        <h3>${escapeHtml(classInfo.name || 'Grade 10 — Section B')}</h3>
        <div class="meta">${escapeHtml(classInfo.classTeacher || 'Classroom Portal')} &middot; ${escapeHtml(classInfo.room || 'Skardu')} &middot; ${escapeHtml(classInfo.track || 'FBISE')}</div>
      </div>
      <div class="class-avatar">${escapeHtml(classInfo.avatar || '10B')}</div>
    </div>
  `;
}

export function renderPendingProposals(proposals, currentUid, onSupport) {
  if (!proposals || proposals.length === 0) return '';

  const rows = proposals.map(p => {
    const supporterCount = (p.supporterUids || []).length;
    const hasSupported = currentUid && (p.supporterUids || []).includes(currentUid);
    const isReady = supporterCount >= 5;

    return `
      <div class="proposal-card">
        <div>
          <div class="proposal-title">${escapeHtml(p.name)} (${escapeHtml(p.grade)}-${escapeHtml(p.section)})</div>
          <div class="proposal-status">${supporterCount} / 5 supporters ${isReady ? '• <strong>Ready for Admin Review</strong>' : ''}</div>
        </div>
        <div>
          ${hasSupported 
            ? '<span class="tag mono">Supported</span>' 
            : `<button class="btn btn-sm btn-outline" data-action="support" data-id="${escapeAttr(p.id)}">Support</button>`
          }
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="proposals-section">
      <h3 style="font-size:18px; margin-bottom:12px; color:var(--pine);">Pending Class Proposals</h3>
      <div class="proposals-list">${rows}</div>
    </div>
  `;
}
