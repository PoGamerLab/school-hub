import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function renderClassBanner(classInfo, isMember = false, classes = []) {
  const switcherHtml = (classes && classes.length > 1) ? `
    <div class="class-switcher-bar">
      <span class="class-switcher-label">APSACS Skardu Classrooms</span>
      <select id="class-switcher-select" class="class-switcher-select">
        ${classes.map(c => `
          <option value="${escapeAttr(c.id)}" ${classInfo && classInfo.id === c.id ? 'selected' : ''}>
            ${escapeHtml(c.name || c.id)}
          </option>
        `).join('')}
      </select>
    </div>
  ` : '';

  if (!classInfo) {
    return `
      ${switcherHtml}
      <div class="empty-state full-width-empty">
        <div class="empty-state-icon">🏛️</div>
        <div class="empty-state-title">No Class Selected</div>
        <div class="empty-state-desc">Ask your administrator to create a class in the Admin Console.</div>
      </div>
    `;
  }

  const avatarText = escapeHtml(classInfo.avatar || (classInfo.grade ? `${classInfo.grade.replace(/[^0-9]/g, '')}${classInfo.section || ''}` : 'APS'));

  return `
    ${switcherHtml}
    <div class="class-banner">
      <div class="class-banner-content">
        <div class="k">Army Public School &amp; College Skardu &middot; Active Class</div>
        <h3>${escapeHtml(classInfo.name || 'Grade 10 — Section B')}</h3>
        <div class="meta">
          <strong>Teacher:</strong> ${escapeHtml(classInfo.classTeacher || 'Assigned Educator')} &middot;
          <strong>Room:</strong> ${escapeHtml(classInfo.room || 'Senior Wing')} &middot;
          <strong>Affiliation:</strong> FBISE Islamabad
        </div>
      </div>
      <div class="class-avatar">${avatarText || 'APS'}</div>
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
      <h3 class="proposals-heading">Pending Class Proposals</h3>
      <div class="proposals-list">${rows}</div>
    </div>
  `;
}
