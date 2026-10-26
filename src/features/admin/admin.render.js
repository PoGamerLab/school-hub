import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function renderReportedMemoryRow(mem) {
  const safeQuote = escapeHtml(mem.quote);
  const safeAuthor = escapeHtml(mem.author);
  const safeId = escapeAttr(mem.id);
  const safeType = escapeAttr(mem.itemType || 'memories');
  const typeLabel = safeType === 'superlatives' ? 'Superlative' : 'Memory';
  const reportsList = Object.entries(mem.reports || {});
  const reportsCount = reportsList.length;

  const reasonsHtml = reportsList.map(([uid, r]) => {
    const reasonText = typeof r === 'object' && r && r.reason
      ? escapeHtml(r.reason)
      : (r === true ? 'Flagged without specific note' : escapeHtml(String(r)));
    const reporterName = typeof r === 'object' && r && r.reporterName
      ? escapeHtml(r.reporterName)
      : 'Classmate';
    return `<div class="admin-report-detail"><strong>${reporterName}:</strong> "${reasonText}"</div>`;
  }).join('');

  return `
    <div class="admin-item-row" data-id="${safeId}" data-type="${safeType}">
      <div>
        <div class="admin-item-quote">
          <span class="tag tag-gold">${typeLabel}</span> "${safeQuote}"
        </div>
        <div class="admin-item-meta">By ${safeAuthor} &middot; Reported by ${reportsCount} student(s)</div>
        <div class="admin-report-reasons">${reasonsHtml}</div>
      </div>
      <div class="admin-actions">
        <button class="btn-restore" data-action="restore" data-type="${safeType}" data-id="${safeId}">Dismiss Reports</button>
        <button class="btn-danger" data-action="delete" data-type="${safeType}" data-id="${safeId}">Delete Post</button>
      </div>
    </div>
  `;
}

export function renderClassManager(classes = []) {
  const classItems = classes.map(c => `
    <div class="admin-item-row" data-id="${escapeAttr(c.id)}">
      <div>
        <div class="admin-item-quote">${escapeHtml(c.name || c.id)} <span class="tag mono">${escapeHtml(c.id)}</span></div>
        <div class="admin-item-meta">${escapeHtml(c.grade || '')} &middot; Section ${escapeHtml(c.section || '')} &middot; Teacher: ${escapeHtml(c.classTeacher || 'Not assigned')}</div>
      </div>
      <div class="admin-actions">
        <button class="btn-danger" data-action="delete-class" data-id="${escapeAttr(c.id)}">Delete</button>
      </div>
    </div>
  `).join('');

  return `
    <form id="admin-create-class-form" class="admin-class-form">
      <div class="form-row">
        <div class="form-group form-col">
          <label for="admin-select-grade">Select Grade (APSACS)</label>
          <select id="admin-select-grade">
            <option value="Grade 10" data-num="10">Grade 10 (Matric SSC-II)</option>
            <option value="Grade 9" data-num="9">Grade 9 (Matric SSC-I)</option>
            <option value="Grade 11" data-num="11">Grade 11 / 1st Year (FSc / ICS HSSC-I)</option>
            <option value="Grade 12" data-num="12">Grade 12 / 2nd Year (FSc / ICS HSSC-II)</option>
            <option value="Grade 8" data-num="8">Grade 8 (Middle Wing)</option>
            <option value="Grade 7" data-num="7">Grade 7 (Middle Wing)</option>
            <option value="Grade 6" data-num="6">Grade 6 (Middle Wing)</option>
          </select>
        </div>
        <div class="form-group form-col">
          <label for="admin-select-section">Select Section</label>
          <select id="admin-select-section">
            <option value="Section A" data-sec="a">Section A</option>
            <option value="Section B" data-sec="b" selected>Section B</option>
            <option value="Section C" data-sec="c">Section C</option>
            <option value="Section D" data-sec="d">Section D</option>
            <option value="Section E" data-sec="e">Section E</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label for="admin-new-class-teacher">Class Teacher Name *</label>
        <input type="text" id="admin-new-class-teacher" placeholder="e.g. Ma'am Farida Baig or Sir Tariq" required maxlength="80">
      </div>

      <div class="admin-preview-pill">
        Class to Create: <strong id="admin-class-preview-name">Grade 10 — Section B</strong> (<span id="admin-class-preview-slug">10-b</span>)
      </div>

      <button type="submit" class="btn btn-primary" id="admin-create-class-submit-btn">+ Create Active Class</button>
    </form>

    <div class="admin-classes-list">
      <h4>Active Classes (${classes.length})</h4>
      ${classItems || '<div class="admin-empty-notice">No active classes yet. Select a grade and section above to create your first class!</div>'}
    </div>
  `;
}

export function renderGateEditor(questions = {}, answers = {}, classes = []) {
  const q1Text = escapeAttr(questions?.q1Text || 'What is our school motto?');
  const q2Text = escapeAttr(questions?.q2Text || 'What color is our school crest border?');
  const q3Text = escapeAttr(questions?.q3Text || 'Who is our class teacher?');

  const q1Answers = escapeAttr((answers?.q1 || []).join(', '));
  const q2Answers = escapeAttr((answers?.q2 || []).join(', '));

  const q3ByClass = answers?.q3ByClass || {};
  const classRows = classes.map(c => {
    const existing = escapeAttr((q3ByClass[c.id] || []).join(', '));
    return `
      <div class="form-group">
        <label for="admin-q3-class-${escapeAttr(c.id)}">Q3 Answers for ${escapeHtml(c.name || c.id)} (${escapeHtml(c.id)})</label>
        <input type="text" id="admin-q3-class-${escapeAttr(c.id)}" data-class-id="${escapeAttr(c.id)}" class="admin-q3-class-input" value="${existing}" placeholder="e.g. Sir Tariq, Tariq Sahib">
      </div>
    `;
  }).join('');

  return `
    <form id="admin-gate-form">
      <div class="form-group">
        <label for="admin-q1-text">Question 1 Text (School-wide)</label>
        <input type="text" id="admin-q1-text" value="${q1Text}" required maxlength="120">
      </div>
      <div class="form-group">
        <label for="admin-q1-answers">Accepted Answers for Q1 (comma-separated, up to 10)</label>
        <input type="text" id="admin-q1-answers" value="${q1Answers}" placeholder="e.g. I Shall Rise & Shine, Rise and Shine" required>
      </div>

      <div class="form-group">
        <label for="admin-q2-text">Question 2 Text (Student-only fact)</label>
        <input type="text" id="admin-q2-text" value="${q2Text}" required maxlength="120">
      </div>
      <div class="form-group">
        <label for="admin-q2-answers">Accepted Answers for Q2 (comma-separated, up to 10)</label>
        <input type="text" id="admin-q2-answers" value="${q2Answers}" placeholder="e.g. Gold, Yellow" required>
      </div>

      <div class="form-group">
        <label for="admin-q3-text">Question 3 Text (Class-specific)</label>
        <input type="text" id="admin-q3-text" value="${q3Text}" required maxlength="120">
      </div>

      <div class="admin-class-answers-box">
        ${classRows || `
          <p class="admin-empty-notice">No active classes yet. Create a class in Class Management above to configure its class-specific Q3 answers.</p>
        `}
      </div>

      <button type="submit" class="btn btn-primary" id="admin-gate-save-btn">Save Gate Configuration</button>
    </form>
  `;
}

export function renderUserRow(u, classes = []) {
  const safeUid = escapeAttr(u.id);
  const safeName = escapeHtml(u.displayName || 'Unnamed User');
  const safeEmail = escapeHtml(u.email || 'No email');
  const safeClass = escapeHtml(u.classId || 'None');
  const isBanned = u.banned === true;
  const status = isBanned ? 'banned' : (u.status || 'needs_gate');

  const statusBadgeClass = {
    active: 'tag-active',
    needs_gate: 'tag-pending',
    needs_profile: 'tag-pending',
    revoked: 'tag-danger',
    banned: 'tag-danger'
  }[status] || 'tag-pending';

  const classOptions = classes.map(c => 
    `<option value="${escapeAttr(c.id)}" ${c.id === u.classId ? 'selected' : ''}>${escapeHtml(c.name || c.id)}</option>`
  ).join('');

  return `
    <div class="admin-user-row" data-uid="${safeUid}">
      <div class="admin-user-info">
        <div class="admin-user-name">${safeName} <span class="tag ${statusBadgeClass}">${escapeHtml(status.toUpperCase())}</span></div>
        <div class="admin-user-meta">${safeEmail} &middot; Class: <strong>${safeClass}</strong> &middot; UID: <span class="mono">${safeUid.slice(0, 8)}...</span></div>
      </div>
      <div class="admin-user-actions">
        ${status !== 'active' && !isBanned ? `
          <button class="btn btn-sm btn-restore" data-action="approve-user" data-uid="${safeUid}">Approve</button>
        ` : ''}
        ${status === 'active' ? `
          <button class="btn btn-sm btn-outline-danger" data-action="delete-profile" data-uid="${safeUid}" title="Delete profile and request recreation">Delete Profile</button>
        ` : ''}
        ${(status === 'active' || status === 'needs_profile' || status === 'needs_gate') ? `
          <button class="btn btn-sm btn-outline" data-action="reset-gate" data-uid="${safeUid}" title="Reset gate attempts">Reset Gate</button>
        ` : ''}
        <div class="admin-move-class-box">
          <select class="admin-user-class-select" data-uid="${safeUid}">
            <option value="">Move Class...</option>
            ${classOptions}
          </select>
        </div>
        ${!isBanned ? `
          <button class="btn btn-sm btn-danger" data-action="ban-user" data-uid="${safeUid}">Ban</button>
        ` : `
          <button class="btn btn-sm btn-restore" data-action="unban-user" data-uid="${safeUid}">Unban</button>
        `}
        ${status !== 'revoked' ? `
          <button class="btn btn-sm btn-outline-danger" data-action="revoke-user" data-uid="${safeUid}">Revoke</button>
        ` : ''}
      </div>
    </div>
  `;
}

export function renderMembersManager(users = [], classes = []) {
  if (users.length === 0) {
    return `<div class="admin-empty-notice">No registered accounts found in the database.</div>`;
  }

  const rowsHtml = users.map(u => renderUserRow(u, classes)).join('');

  return `
    <div class="admin-users-list">
      <div class="admin-users-toolbar">
        <input type="text" id="admin-user-search-input" placeholder="Search members by name or email..." class="admin-search-input">
      </div>
      <div id="admin-users-rows-container">
        ${rowsHtml}
      </div>
    </div>
  `;
}

export function renderSiteControls(status = {}, announcement = {}) {
  const isReadOnly = status?.readOnly === true;
  const isAnnActive = announcement?.active === true;
  const annText = escapeAttr(announcement?.text || '');

  return `
    <div class="admin-control-section">
      <h4>Read-Only Emergency Mode</h4>
      <p class="section-head-subtitle">When active, normal student writes (memories, superlatives, votes) are halted site-wide.</p>
      <div class="admin-toggle-row">
        <label class="switch-label">
          <input type="checkbox" id="admin-readonly-toggle" ${isReadOnly ? 'checked' : ''}>
          <span>Enable Read-Only Site Mode</span>
        </label>
      </div>
    </div>

    <div class="admin-control-section">
      <h4>Pinned Announcement Banner</h4>
      <p class="section-head-subtitle">Display a pinned alert banner at the top of every screen for all visitors and students.</p>
      <form id="admin-announcement-form">
        <div class="form-group">
          <label for="admin-ann-text">Announcement Message (max 200 chars)</label>
          <input type="text" id="admin-ann-text" value="${annText}" maxlength="200" placeholder="e.g. Midterm examinations start Monday. Best of luck APSACians!">
        </div>
        <div class="admin-toggle-row">
          <label class="checkbox-label">
            <input type="checkbox" id="admin-ann-active" ${isAnnActive ? 'checked' : ''}>
            <span>Show banner live on site</span>
          </label>
        </div>
        <button type="submit" class="btn btn-primary" id="admin-ann-save-btn">Update Announcement</button>
      </form>
    </div>
  `;
}

export function renderAuditLog(logs = []) {
  if (logs.length === 0) {
    return `<div class="admin-empty-notice">No administrative activity recorded yet.</div>`;
  }

  const rows = logs.map(l => {
    const safeAction = escapeHtml(l.action || 'ACTION');
    const safeAdmin = escapeHtml(l.adminName || 'Admin');
    const safeDetail = escapeHtml(l.detail || '');
    const safeTarget = escapeHtml(l.targetId || '');
    const dateStr = l.createdAt?.toDate ? l.createdAt.toDate().toLocaleString() : 'Just now';

    return `
      <div class="admin-log-row">
        <div class="admin-log-time mono">${escapeHtml(dateStr)}</div>
        <div class="admin-log-actor"><strong>${safeAdmin}</strong></div>
        <div class="admin-log-action"><span class="tag mono">${safeAction}</span></div>
        <div class="admin-log-detail">${safeDetail} ${safeTarget ? `(<span class="mono">${safeTarget}</span>)` : ''}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="admin-log-container">
      <div class="admin-log-list">${rows}</div>
    </div>
  `;
}

