import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';
import { renderAvatarHtml } from '../../components/avatar/avatar.js';

const KIND_META = {
  chat: { label: 'Class Chat', icon: '💬', tagClass: 'tag-chat' },
  photo: { label: 'Profile Photo', icon: '📷', tagClass: 'tag-photo' },
  memory: { label: 'Memory Wall', icon: '💭', tagClass: 'tag-memory' },
  superlative: { label: 'Superlative', icon: '🏆', tagClass: 'tag-superlative' },
  gallery: { label: 'Campus Gallery', icon: '🖼️', tagClass: 'tag-gallery' }
};

export function renderModerationRow(group) {
  const meta = KIND_META[group.kind] || { label: group.kind, icon: '🚩', tagClass: 'tag-default' };
  const safeKey = escapeAttr(group.key);
  const safeTargetId = escapeAttr(group.targetId);
  const safeClassId = escapeHtml(group.classId || 'School-wide');

  const reportsList = group.reports.map(r => {
    const safeReason = escapeHtml(r.reason || 'Flagged');
    const safeDetails = r.details ? ` &mdash; ${escapeHtml(r.details)}` : '';
    return `<div class="admin-report-reason-item"><strong>${safeReason}</strong>${safeDetails}</div>`;
  }).join('');

  let previewHtml = '';
  if (group.expanded) {
    if (!group.targetLoaded) {
      previewHtml = `<div class="admin-mod-preview loading">Fetching content details...</div>`;
    } else if (!group.targetData) {
      previewHtml = `<div class="admin-mod-preview deleted">Content item not found (it may have been deleted).</div>`;
    } else {
      const data = group.targetData;
      if (group.kind === 'chat') {
        previewHtml = `
          <div class="admin-mod-preview">
            <div class="preview-title">Author: <strong>${escapeHtml(data.authorName || 'Student')}</strong> (UID: <code>${escapeHtml(data.authorUid || '')}</code>)</div>
            <div class="preview-body">&ldquo;${escapeHtml(data.text || '')}&rdquo;</div>
          </div>
        `;
      } else if (group.kind === 'photo') {
        const avatarHtml = renderAvatarHtml({
          photoSource: data.photoSource,
          photoThumb: data.photoThumb,
          googlePhotoUrl: data.googlePhotoUrl,
          initials: data.initials || 'ST',
          gradientIndex: data.gradientIndex,
          size: 'md'
        });
        previewHtml = `
          <div class="admin-mod-preview d-flex align-items-center gap-3">
            <div>${avatarHtml}</div>
            <div>
              <div class="preview-title"><strong>${escapeHtml(data.name || 'Student')}</strong> &middot; Class: ${escapeHtml(data.classId || 'N/A')}</div>
              <div>Source: <code>${escapeHtml(data.photoSource || 'none')}</code></div>
            </div>
          </div>
        `;
      } else if (group.kind === 'memory') {
        previewHtml = `
          <div class="admin-mod-preview">
            <div class="preview-title">Speaker: <strong>${escapeHtml(data.author || 'Anonymous')}</strong> &middot; Context: ${escapeHtml(data.context || 'None')}</div>
            <div class="preview-body">&ldquo;${escapeHtml(data.quote || '')}&rdquo;</div>
          </div>
        `;
      } else if (group.kind === 'superlative') {
        const nominees = Array.isArray(data.nominees) ? data.nominees.map(n => escapeHtml(n)).join(', ') : 'None';
        previewHtml = `
          <div class="admin-mod-preview">
            <div class="preview-title">Award: <strong>${escapeHtml(data.title || '')}</strong> ${escapeHtml(data.icon || '')}</div>
            <div class="preview-body">Nominees: ${nominees}</div>
          </div>
        `;
      } else if (group.kind === 'gallery') {
        const safeUrl = escapeAttr(data.url || 'images/apsacs-logo.png');
        previewHtml = `
          <div class="admin-mod-preview d-flex align-items-center gap-3">
            <img src="${safeUrl}" alt="Preview" class="gallery-preview-thumb">
            <div>
              <div class="preview-title">Caption: ${escapeHtml(data.caption || 'No caption')}</div>
              <div>Owner: <code>${escapeHtml(data.ownerUid || '')}</code></div>
            </div>
          </div>
        `;
      }
    }
  }

  const authorUid = group.targetData?.authorUid || group.targetData?.ownerUid || (group.kind === 'photo' ? group.targetId : '');
  const authorName = group.targetData?.authorName || group.targetData?.author || group.targetData?.name || '';

  return `
    <div class="admin-mod-row" data-key="${safeKey}" data-kind="${escapeAttr(group.kind)}" data-target-id="${safeTargetId}">
      <div class="admin-mod-header d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center gap-2">
          <span class="tag ${meta.tagClass}">${meta.icon} ${meta.label}</span>
          <span class="tag tag-class">${safeClassId}</span>
          <span class="badge-flag-count">🚩 ${group.reports.length} report${group.reports.length === 1 ? '' : 's'}</span>
        </div>
        <button type="button" class="btn btn-sm btn-outline" data-action="toggle-preview" data-key="${safeKey}">
          ${group.expanded ? '▲ Hide Preview' : '▼ View Preview'}
        </button>
      </div>

      <div class="admin-mod-reasons-box">
        ${reportsList}
      </div>

      ${previewHtml}

      <div class="admin-mod-actions d-flex flex-wrap gap-2 mt-2">
        <button type="button" class="btn btn-sm btn-outline" data-action="dismiss-group" data-key="${safeKey}" title="Dismiss all reports on this item">
          ✓ Dismiss Reports
        </button>
        ${group.kind === 'photo' ? `
          <button type="button" class="btn btn-sm btn-danger" data-action="remove-photo" data-key="${safeKey}" data-target-id="${safeTargetId}" data-name="${escapeAttr(authorName || 'Student')}">
            🗑️ Remove Photo
          </button>
        ` : `
          <button type="button" class="btn btn-sm btn-danger" data-action="delete-content" data-key="${safeKey}" title="Permanently delete this content">
            🗑️ Delete Content
          </button>
        `}
        ${authorUid ? `
          <button type="button" class="btn btn-sm btn-outline" data-action="mute-author" data-uid="${escapeAttr(authorUid)}" data-name="${escapeAttr(authorName || 'User')}" title="Mute author from class chat for 24 hours">
            🔇 Mute 24h
          </button>
          <button type="button" class="btn btn-sm btn-danger-outline" data-action="ban-user" data-uid="${escapeAttr(authorUid)}" data-name="${escapeAttr(authorName || 'User')}" title="Revoke membership and ban user">
            ⛔ Ban Account
          </button>
        ` : ''}
      </div>
    </div>
  `;
}
