/**
 * HTML rendering for 4-step Onboarding Wizard (Phase 1, section 4.6).
 */

import { escapeHtml } from '../../core/utils/escapeHtml.js';

export function renderWizardShell() {
  return `
    <div class="wizard-container">
      <div class="wizard-progress">
        <div class="wizard-progress-bar">
          <div class="wizard-progress-fill" id="wizard-progress-fill"></div>
        </div>
        <div class="wizard-step-node" data-node="0">1</div>
        <div class="wizard-step-node" data-node="1">2</div>
        <div class="wizard-step-node" data-node="2">3</div>
        <div class="wizard-step-node" data-node="3">4</div>
      </div>

      <div id="wizard-panes-root">
        <!-- Step 1: Basics -->
        <div class="wizard-step-pane" data-step="0">
          <h2 class="wizard-title">Step 1: The Basics</h2>
          <p class="wizard-desc">Let your classmates find and identify your profile in the directory.</p>

          <div class="form-group">
            <label for="w-name">Full Name *</label>
            <input type="text" id="w-name" placeholder="e.g. Tariq Mehmood" required maxlength="80">
          </div>

          <div class="form-row">
            <div class="form-group form-col">
              <label for="w-roll">Roll Number (Digits only) *</label>
              <input type="text" id="w-roll" pattern="[0-9]+" placeholder="e.g. 42" required maxlength="10">
            </div>
            <div class="form-group form-col">
              <label for="w-house">APSACS House *</label>
              <select id="w-house">
                <option value="Unity">🔴 Unity House (Ittehad)</option>
                <option value="Faith">🟡 Faith House (Yaqeen)</option>
                <option value="Discipline">🔵 Discipline House (Tanzeem)</option>
                <option value="Tolerance">🟢 Tolerance House (Rawadari)</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group form-col">
              <label for="w-group">Academic Group / Discipline *</label>
              <select id="w-group">
                <option value="Pre-Medical">Science — Pre-Medical</option>
                <option value="Pre-Engineering">Science — Pre-Engineering</option>
                <option value="Computer Science">Science — Computer Science / ICS</option>
                <option value="Humanities">Humanities / General Science</option>
              </select>
            </div>
            <div class="form-group form-col">
              <label for="w-category">Special Interest / Activity *</label>
              <select id="w-category">
                <option value="Sports">Sports &amp; Athletics</option>
                <option value="Debates">Debating &amp; Public Speaking</option>
                <option value="Coding">Coding &amp; STEM Robotics</option>
                <option value="Music">Music &amp; Qirat / Naat</option>
                <option value="Art">Calligraphy &amp; Fine Arts</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Step 2: About You -->
        <div class="wizard-step-pane" data-step="1">
          <h2 class="wizard-title">Step 2: About You</h2>
          <p class="wizard-desc">Share a bit of your personality with your classmates.</p>

          <div class="form-group">
            <label for="w-bio">Short Bio *</label>
            <textarea id="w-bio" rows="3" placeholder="Tell the class about yourself..." required maxlength="500"></textarea>
          </div>

          <div class="form-row">
            <div class="form-group form-col">
              <label for="w-subject">Favourite Subject</label>
              <input type="text" id="w-subject" placeholder="e.g. Mathematics" maxlength="60">
            </div>
            <div class="form-group form-col">
              <label for="w-quote">Favourite Quote</label>
              <input type="text" id="w-quote" placeholder='"Aim high and dare to rise."' maxlength="140">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group form-col">
              <label for="w-fact">Fun Fact</label>
              <input type="text" id="w-fact" placeholder="e.g. Can solve Rubik's cube" maxlength="120">
            </div>
            <div class="form-group form-col">
              <label for="w-tags">Hobbies / Tags</label>
              <input type="text" id="w-tags" placeholder="e.g. Football &middot; Gaming" maxlength="100">
            </div>
          </div>
        </div>

        <!-- Step 3: Privacy & Look -->
        <div class="wizard-step-pane" data-step="2">
          <h2 class="wizard-title">Step 3: Privacy &amp; Avatar Look</h2>
          <p class="wizard-desc">Pick your signature avatar gradient and choose what you share.</p>

          <div class="form-group">
            <label>Pick Avatar Theme</label>
            <div class="gradient-picker" id="w-gradient-picker">
              <div class="gradient-option gradient-0 selected" data-gradient="0"></div>
              <div class="gradient-option gradient-1" data-gradient="1"></div>
              <div class="gradient-option gradient-2" data-gradient="2"></div>
              <div class="gradient-option gradient-3" data-gradient="3"></div>
              <div class="gradient-option gradient-4" data-gradient="4"></div>
              <div class="gradient-option gradient-5" data-gradient="5"></div>
              <div class="gradient-option gradient-6" data-gradient="6"></div>
              <div class="gradient-option gradient-7" data-gradient="7"></div>
            </div>
          </div>

          <div class="form-group">
            <label for="w-birthday">Birthday <span class="privacy-badge">Optional</span></label>
            <input type="text" id="w-birthday" placeholder="e.g. 14 March (Day and month only)" maxlength="30">
            <label class="checkbox-row">
              <input type="checkbox" id="w-show-birthday" class="checkbox-input"> Show birthday on public class directory
            </label>
          </div>

          <div class="form-group">
            <label for="w-contact">Contact Handle <span class="privacy-badge">Optional</span></label>
            <input type="text" id="w-contact" placeholder="e.g. Instagram @tariq.m" maxlength="60">
            <label class="checkbox-row">
              <input type="checkbox" id="w-show-contact" class="checkbox-input"> Show contact handle publicly
            </label>
          </div>
        </div>

        <!-- Step 4: Review & Submit -->
        <div class="wizard-step-pane" data-step="3">
          <h2 class="wizard-title">Step 4: Review &amp; Activate</h2>
          <p class="wizard-desc">Confirm your profile details before publishing to your class directory.</p>
          <div id="w-review-container"></div>
        </div>
      </div>

      <div class="wizard-nav">
        <button class="btn btn-outline btn-sm" id="wizard-back-btn">&larr; Back</button>
        <span class="wizard-autosave-status" id="wizard-autosave-status">Draft autosaved</span>
        <button class="btn btn-primary btn-sm" id="wizard-next-btn">Next Step &rarr;</button>
      </div>
    </div>
  `;
}

export function renderReviewSummary(data) {
  return `
    <div class="review-card">
      <div class="review-row">
        <span class="review-label">Name</span>
        <span class="review-value">${escapeHtml(data.name || 'Not entered')}</span>
      </div>
      <div class="review-row">
        <span class="review-label">Roll Number</span>
        <span class="review-value">${escapeHtml(data.roll || 'Not entered')}</span>
      </div>
      <div class="review-row">
        <span class="review-label">APSACS House</span>
        <span class="review-value">${escapeHtml(data.house || 'Unity')} House</span>
      </div>
      <div class="review-row">
        <span class="review-label">Academic Group</span>
        <span class="review-value">${escapeHtml(data.group || 'Science')}</span>
      </div>
      <div class="review-row">
        <span class="review-label">Special Interest</span>
        <span class="review-value">${escapeHtml(data.category || 'Sports')}</span>
      </div>
      <div class="review-row">
        <span class="review-label">Short Bio</span>
        <span class="review-value">${escapeHtml(data.bio || 'Not entered')}</span>
      </div>
      <div class="review-row">
        <span class="review-label">Birthday</span>
        <span class="review-value">${data.showBirthday && data.birthday ? escapeHtml(data.birthday) : 'Hidden'}</span>
      </div>
      <div class="review-row">
        <span class="review-label">Contact</span>
        <span class="review-value">${data.showContact && data.contact ? escapeHtml(data.contact) : 'Hidden'}</span>
      </div>
    </div>
  `;
}
