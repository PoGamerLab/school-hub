/**
 * Gate verification feature logic (Phase 1, section 4.6).
 */

import { store } from '../../core/store/store.js';
import { router } from '../../core/router/router.js';
import { authService } from '../../core/auth/auth.js';
import { showToast } from '../../components/toast/toast.js';
import { normalizeAnswer } from '../../core/utils/normalizeAnswer.js';
import {
  fetchGateQuestions,
  fetchActiveClasses,
  fetchUserGateRecord,
  submitGateAttempt,
  completeGatePass
} from './gate.db.js';
import {
  renderGateIncomplete,
  renderGateLocked,
  renderGateForm
} from './gate.render.js';

let countdownInterval = null;

export function initGate() {
  const container = document.getElementById('gate-container-root');
  if (!container) return;

  async function loadAndRender() {
    if (countdownInterval) clearInterval(countdownInterval);

    const user = authService.getCurrentUser();
    if (!user) return;

    let questions = null;
    let classes = [];
    let gateRecord = null;

    try {
      [questions, classes, gateRecord] = await Promise.all([
        fetchGateQuestions(),
        fetchActiveClasses(),
        fetchUserGateRecord(user.uid)
      ]);
    } catch (err) {
      console.error('Error fetching gate data:', err);
    }

    if (!questions || !questions.q1Text || !questions.q2Text || !questions.q3Text) {
      container.innerHTML = renderGateIncomplete();
      return;
    }

    const attemptsUsed = gateRecord?.attempts || 0;
    const attemptsRemaining = Math.max(0, 5 - attemptsUsed);

    if (attemptsUsed >= 5) {
      container.innerHTML = renderGateLocked();
      return;
    }

    // Check 10-minute cooldown
    let cooldownSeconds = 0;
    if (gateRecord && gateRecord.lastAttemptAt && attemptsUsed > 0) {
      const lastMillis = gateRecord.lastAttemptAt.toMillis
        ? gateRecord.lastAttemptAt.toMillis()
        : gateRecord.lastAttemptAt;
      const elapsedSeconds = Math.floor((Date.now() - lastMillis) / 1000);
      if (elapsedSeconds < 600) {
        cooldownSeconds = 600 - elapsedSeconds;
      }
    }

    const isAdmin = !!store.get('isAdmin');
    container.innerHTML = renderGateForm(questions, classes, attemptsRemaining, cooldownSeconds, isAdmin);
    attachEvents(user.uid, attemptsUsed, cooldownSeconds);
  }

  function attachEvents(uid, previousAttempts, cooldownSeconds) {
    const adminJumpBtn = document.getElementById('gate-jump-admin-btn');
    if (adminJumpBtn) {
      adminJumpBtn.addEventListener('click', () => {
        router.navigate('admin');
      });
    }

    if (cooldownSeconds > 0) {
      let remaining = cooldownSeconds;
      countdownInterval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(countdownInterval);
          loadAndRender();
        } else {
          const el = container.querySelector('.gate-cooldown');
          if (el) {
            const min = Math.floor(remaining / 60);
            const sec = (remaining % 60).toString().padStart(2, '0');
            el.textContent = `${min}:${sec}`;
          }
        }
      }, 1000);
      return;
    }

    const form = document.getElementById('gate-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const classId = document.getElementById('gate-class-select').value;
      const q1Raw = document.getElementById('gate-q1').value;
      const q2Raw = document.getElementById('gate-q2').value;
      const q3Raw = document.getElementById('gate-q3').value;

      const normalized = {
        q1: normalizeAnswer(q1Raw),
        q2: normalizeAnswer(q2Raw),
        q3: normalizeAnswer(q3Raw)
      };

      const submitBtn = document.getElementById('gate-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying answers...';
      }

      try {
        // Step 1: Submit answers to gate/{uid}
        await submitGateAttempt(uid, normalized, classId, previousAttempts);

        // Step 2: Attempt gate pass update on users/{uid}
        await completeGatePass(uid, classId);

        const updatedUser = {
          ...authService.getCurrentUser(),
          status: 'needs_profile',
          classId
        };
        authService.setUser(updatedUser);
        showToast('Verification passed! Welcome to student onboarding.', 'success');
        router.switchTo('onboarding');
      } catch (err) {
        console.error('Gate attempt failed:', err);
        showToast('Verification failed. Answers could not be verified.', 'error');
        await loadAndRender();
      }
    });
  }

  router.registerScreenHook('gate', {
    onEnter: loadAndRender,
    onLeave: () => {
      if (countdownInterval) clearInterval(countdownInterval);
    }
  });
}
