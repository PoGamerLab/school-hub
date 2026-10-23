/**
 * HTML rendering for Gate verification screen (Phase 1, section 4.6).
 */

import { escapeHtml } from '../../core/utils/escapeHtml.js';

export function renderGateIncomplete() {
  return `
    <div class="gate-container">
      <span class="gate-badge">Student Verification</span>
      <h2 class="gate-title">Setup Incomplete</h2>
      <div class="gate-notice warning">
        Setup incomplete, please tell the admin.
      </div>
    </div>
  `;
}

export function renderGateLocked() {
  return `
    <div class="gate-container">
      <span class="gate-badge">Access Locked</span>
      <h2 class="gate-title">Verification Locked</h2>
      <div class="gate-notice danger">
        You have reached the maximum of 5 verification attempts for this account.
        Please contact your class administrator to unlock or reset your access.
      </div>
    </div>
  `;
}

export function renderGateForm(questions, classes, attemptsRemaining, cooldownSeconds = 0, isAdmin = false) {
  const hasClasses = Array.isArray(classes) && classes.length > 0;
  const optionsHtml = hasClasses
    ? classes.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name || c.id)}</option>`).join('')
    : '<option value="">No classes available</option>';

  const isCooldown = cooldownSeconds > 0;
  const cooldownMin = Math.floor(cooldownSeconds / 60);
  const cooldownSec = (cooldownSeconds % 60).toString().padStart(2, '0');

  return `
    <div class="gate-container">
      <span class="gate-badge">Classmate Gate</span>
      <h2 class="gate-title">Verify Your Membership</h2>
      <p class="gate-desc">To protect our class memories and student directory, please verify that you are a student by answering these three questions.</p>

      ${isAdmin ? `
        <div class="gate-notice warning">
          <p><strong>Administrator Notice:</strong> You are recognized as an administrator. You do not need to take the student gate.</p>
          <div class="gate-admin-jump">
            <button type="button" class="btn btn-sm btn-primary" id="gate-jump-admin-btn">Go to Admin Dashboard</button>
          </div>
        </div>
      ` : ''}

      ${!hasClasses ? `
        <div class="gate-notice warning">
          No active classes have been registered yet. Please tell the administrator to create a class.
        </div>
      ` : ''}

      ${isCooldown ? `
        <div class="gate-notice danger">
          Too many recent attempts. Please wait <span class="gate-cooldown">${cooldownMin}:${cooldownSec}</span> before trying again.
        </div>
      ` : ''}

      <form id="gate-form">
        <div class="form-group">
          <label for="gate-class-select">Select Your Class</label>
          <select id="gate-class-select" required ${isCooldown || !hasClasses ? 'disabled' : ''}>
            ${optionsHtml}
          </select>
        </div>

        <div class="form-group">
          <label for="gate-q1">${escapeHtml(questions.q1Text || 'Question 1')}</label>
          <input type="text" id="gate-q1" placeholder="Type your answer..." required maxlength="60" ${isCooldown ? 'disabled' : ''}>
        </div>

        <div class="form-group">
          <label for="gate-q2">${escapeHtml(questions.q2Text || 'Question 2')}</label>
          <input type="text" id="gate-q2" placeholder="Type your answer..." required maxlength="60" ${isCooldown ? 'disabled' : ''}>
        </div>

        <div class="form-group">
          <label for="gate-q3">${escapeHtml(questions.q3Text || 'Question 3')}</label>
          <input type="text" id="gate-q3" placeholder="Type your answer..." required maxlength="60" ${isCooldown ? 'disabled' : ''}>
        </div>

        <button type="submit" class="btn btn-primary btn-full" id="gate-submit-btn" ${isCooldown || !hasClasses ? 'disabled' : ''}>
          ${!hasClasses ? 'No Classes Available to Join' : 'Submit Verification Answers'}
        </button>

        <div class="gate-attempts-pill">
          ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining
        </div>
      </form>
    </div>
  `;
}
