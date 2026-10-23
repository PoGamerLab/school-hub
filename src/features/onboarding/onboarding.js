/**
 * Onboarding Wizard Feature Logic (Phase 1, section 4.6).
 */

import { store } from '../../core/store/store.js';
import { router } from '../../core/router/router.js';
import { authService } from '../../core/auth/auth.js';
import { showToast } from '../../components/toast/toast.js';
import { extractInitials } from '../../core/utils/ids.js';
import { saveDraft, loadDraft, executeActivationBatch } from './onboarding.db.js';
import { renderWizardShell, renderReviewSummary } from './onboarding.render.js';

let autosaveTimer = null;

export function initOnboarding() {
  const container = document.getElementById('onboarding-container-root');
  if (!container) return;

  let currentStep = 0;
  let selectedGradient = 0;

  function getFormData() {
    return {
      name: (document.getElementById('w-name')?.value || '').trim(),
      roll: (document.getElementById('w-roll')?.value || '').trim().replace(/[^0-9]/g, ''),
      category: document.getElementById('w-category')?.value || 'Sports',
      bio: (document.getElementById('w-bio')?.value || '').trim(),
      favSubject: (document.getElementById('w-subject')?.value || '').trim(),
      favQuote: (document.getElementById('w-quote')?.value || '').trim(),
      funFact: (document.getElementById('w-fact')?.value || '').trim(),
      tags: (document.getElementById('w-tags')?.value || '').trim(),
      gradientIndex: selectedGradient,
      birthday: (document.getElementById('w-birthday')?.value || '').trim(),
      showBirthday: !!document.getElementById('w-show-birthday')?.checked,
      contact: (document.getElementById('w-contact')?.value || '').trim(),
      showContact: !!document.getElementById('w-show-contact')?.checked
    };
  }

  function setFormData(data) {
    if (!data) return;
    if (document.getElementById('w-name') && data.name) document.getElementById('w-name').value = data.name;
    if (document.getElementById('w-roll') && data.roll) document.getElementById('w-roll').value = data.roll;
    if (document.getElementById('w-category') && data.category) document.getElementById('w-category').value = data.category;
    if (document.getElementById('w-bio') && data.bio) document.getElementById('w-bio').value = data.bio;
    if (document.getElementById('w-subject') && data.favSubject) document.getElementById('w-subject').value = data.favSubject;
    if (document.getElementById('w-quote') && data.favQuote) document.getElementById('w-quote').value = data.favQuote;
    if (document.getElementById('w-fact') && data.funFact) document.getElementById('w-fact').value = data.funFact;
    if (document.getElementById('w-tags') && data.tags) document.getElementById('w-tags').value = data.tags;

    if (data.gradientIndex !== undefined) {
      selectedGradient = parseInt(data.gradientIndex, 10) || 0;
      updateGradientSelection(selectedGradient);
    }
    if (document.getElementById('w-birthday') && data.birthday) document.getElementById('w-birthday').value = data.birthday;
    if (document.getElementById('w-show-birthday')) document.getElementById('w-show-birthday').checked = !!data.showBirthday;
    if (document.getElementById('w-contact') && data.contact) document.getElementById('w-contact').value = data.contact;
    if (document.getElementById('w-show-contact')) document.getElementById('w-show-contact').checked = !!data.showContact;
  }

  function updateGradientSelection(idx) {
    document.querySelectorAll('.gradient-option').forEach(el => {
      const g = parseInt(el.dataset.gradient, 10);
      el.classList.toggle('selected', g === idx);
    });
  }

  function scheduleAutosave() {
    const statusEl = document.getElementById('wizard-autosave-status');
    if (statusEl) statusEl.textContent = 'Saving draft...';
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(async () => {
      const user = authService.getCurrentUser();
      if (!user) return;
      const data = getFormData();
      await saveDraft(user.uid, currentStep, data);
      if (statusEl) statusEl.textContent = 'Draft autosaved';
    }, 1000);
  }

  function updateStepUI() {
    const panes = container.querySelectorAll('.wizard-step-pane');
    panes.forEach(p => {
      p.classList.toggle('active', parseInt(p.dataset.step, 10) === currentStep);
    });

    const nodes = container.querySelectorAll('.wizard-step-node');
    nodes.forEach(n => {
      const stepIdx = parseInt(n.dataset.node, 10);
      n.classList.toggle('active', stepIdx === currentStep);
      n.classList.toggle('completed', stepIdx < currentStep);
    });

    const fill = document.getElementById('wizard-progress-fill');
    if (fill) fill.style.width = `${(currentStep / 3) * 100}%`;

    const backBtn = document.getElementById('wizard-back-btn');
    if (backBtn) backBtn.disabled = currentStep === 0;

    const nextBtn = document.getElementById('wizard-next-btn');
    if (nextBtn) {
      nextBtn.textContent = currentStep === 3 ? 'Complete & Activate Profile' : 'Next Step →';
    }

    if (currentStep === 3) {
      const revContainer = document.getElementById('w-review-container');
      if (revContainer) revContainer.innerHTML = renderReviewSummary(getFormData());
    }
  }

  function validateStep(step) {
    const data = getFormData();
    if (step === 0) {
      if (!data.name || data.name.length > 80) {
        showToast('Please enter your full name (up to 80 chars).', 'error');
        return false;
      }
      if (!data.roll || !/^[0-9]+$/.test(data.roll) || data.roll.length > 10) {
        showToast('Please enter a valid roll number (digits only, max 10).', 'error');
        return false;
      }
    } else if (step === 1) {
      if (!data.bio || data.bio.length > 500) {
        showToast('Please enter a short bio (up to 500 characters).', 'error');
        return false;
      }
    }
    return true;
  }

  async function loadAndInit() {
    container.innerHTML = renderWizardShell();
    const user = authService.getCurrentUser();
    if (!user) return;

    // Gradient selector clicks
    const picker = document.getElementById('w-gradient-picker');
    picker?.addEventListener('click', (e) => {
      const opt = e.target.closest('.gradient-option');
      if (opt) {
        selectedGradient = parseInt(opt.dataset.gradient, 10);
        updateGradientSelection(selectedGradient);
        scheduleAutosave();
      }
    });

    // Inputs autosave on typing
    container.addEventListener('input', scheduleAutosave);
    container.addEventListener('change', scheduleAutosave);

    // Nav buttons
    document.getElementById('wizard-back-btn')?.addEventListener('click', () => {
      if (currentStep > 0) {
        currentStep -= 1;
        updateStepUI();
        scheduleAutosave();
      }
    });

    document.getElementById('wizard-next-btn')?.addEventListener('click', async () => {
      if (!validateStep(currentStep)) return;

      if (currentStep < 3) {
        currentStep += 1;
        updateStepUI();
        scheduleAutosave();
      } else {
        // Step 4: Final submission (activation batch)
        await submitActivation(user);
      }
    });

    // Restore draft if available
    const draft = await loadDraft(user.uid);
    if (draft && draft.data) {
      setFormData(draft.data);
      if (draft.step && draft.step >= 0 && draft.step <= 3) {
        currentStep = draft.step;
      }
    }
    updateStepUI();
  }

  async function submitActivation(user) {
    const data = getFormData();
    const nextBtn = document.getElementById('wizard-next-btn');
    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.textContent = 'Activating account...';
    }

    const payload = {
      name: data.name,
      roll: data.roll,
      category: data.category,
      tags: data.tags,
      bio: data.bio,
      favSubject: data.favSubject,
      favQuote: data.favQuote,
      funFact: data.funFact,
      gradientIndex: selectedGradient,
      initials: extractInitials(data.name),
      showBirthday: data.showBirthday,
      showContact: data.showContact
    };

    if (data.showBirthday && data.birthday) payload.birthday = data.birthday;
    if (data.showContact && data.contact) payload.contact = data.contact;

    try {
      const activeClass = user.classId || store.get('currentClassId') || '';
      await executeActivationBatch(user.uid, activeClass, payload);
      authService.setUser({ ...user, status: 'active', classId: activeClass });
      showToast('Welcome! Your student membership is active.', 'success');
      router.onActivationComplete();
    } catch (err) {
      console.error('Activation failed:', err);
      showToast(`Activation failed: ${err.message}`, 'error');
      if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.textContent = 'Complete & Activate Profile';
      }
    }
  }

  router.registerScreenHook('onboarding', {
    onEnter: loadAndInit,
    onLeave: () => {
      clearTimeout(autosaveTimer);
    }
  });
}
