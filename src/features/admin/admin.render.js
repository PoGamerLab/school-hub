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
          <label for="admin-new-class-id">Class Identifier (Slug)</label>
          <input type="text" id="admin-new-class-id" placeholder="e.g. 10-b" required maxlength="30">
        </div>
        <div class="form-group form-col">
          <label for="admin-new-class-name">Class Name</label>
          <input type="text" id="admin-new-class-name" placeholder="e.g. Grade 10 — Section B" required maxlength="80">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group form-col">
          <label for="admin-new-class-grade">Grade</label>
          <input type="text" id="admin-new-class-grade" placeholder="e.g. Grade 10" required maxlength="20">
        </div>
        <div class="form-group form-col">
          <label for="admin-new-class-section">Section</label>
          <input type="text" id="admin-new-class-section" placeholder="e.g. Section B" required maxlength="10">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group form-col">
          <label for="admin-new-class-teacher">Class Teacher</label>
          <input type="text" id="admin-new-class-teacher" placeholder="e.g. Ma'am Farida Baig" maxlength="80">
        </div>
        <div class="form-group form-col">
          <label for="admin-new-class-room">Room</label>
          <input type="text" id="admin-new-class-room" placeholder="e.g. Room 14" maxlength="50">
        </div>
      </div>
      <button type="submit" class="btn btn-primary" id="admin-create-class-submit-btn">+ Create Active Class</button>
    </form>

    <div class="admin-classes-list">
      <h4>Active Classes (${classes.length})</h4>
      ${classItems || '<div class="admin-empty-notice">No active classes yet. Create one above to get started!</div>'}
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
