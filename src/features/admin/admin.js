/**
 * Administrator Panel logic (Phase 1, section 4.7).
 */

import { store } from '../../core/store/store.js';
import { router } from '../../core/router/router.js';
import { renderReportedMemoryRow, renderGateEditor } from './admin.render.js';
import { showToast } from '../../components/toast/toast.js';
import { updateDocument, deleteDocument, getDocument, setDocument } from '../../core/db/firestore.js';
import { fetchActiveClasses } from '../gate/gate.db.js';
import { normalizeAnswer } from '../../core/utils/normalizeAnswer.js';

export function initAdmin() {
  const reportsContainer = document.getElementById('admin-reports-list');
  const gateEditorContainer = document.getElementById('admin-gate-editor-root');
  const adminNavBtn = document.querySelector('[data-screen="admin"]');

  function updateAdminVisibility() {
    const isAdmin = store.get('isAdmin');
    if (adminNavBtn) {
      adminNavBtn.classList.toggle('hidden-admin', !isAdmin);
    }
  }

  function renderReports() {
    if (!reportsContainer) return;
    const memories = store.get('memories') || [];
    const flagged = memories.filter(m => Object.keys(m.reports || {}).length > 0);

    if (flagged.length === 0) {
      reportsContainer.innerHTML = '<div class="admin-empty-notice">No reported items. Community is happy!</div>';
      return;
    }

    reportsContainer.innerHTML = flagged.map(m => renderReportedMemoryRow(m)).join('');
  }

  async function loadAndRenderGateEditor() {
    if (!gateEditorContainer) return;
    try {
      const [questions, answers, classes] = await Promise.all([
        getDocument('gateConfig', 'questions'),
        getDocument('gateConfig', 'answers'),
        fetchActiveClasses()
      ]);

      gateEditorContainer.innerHTML = renderGateEditor(questions, answers, classes);
      attachGateEditorEvents(questions?.version || 1);
    } catch (err) {
      console.error('Failed to load gate configuration:', err);
      gateEditorContainer.innerHTML = '<div class="admin-empty-notice">Failed to load gate configuration.</div>';
    }
  }

  function attachGateEditorEvents(currentVersion) {
    const form = document.getElementById('admin-gate-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('admin-gate-save-btn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving configuration...';
      }

      const q1Text = document.getElementById('admin-q1-text').value.trim();
      const q2Text = document.getElementById('admin-q2-text').value.trim();
      const q3Text = document.getElementById('admin-q3-text').value.trim();

      const parseAnswers = (raw) => raw
        .split(',')
        .map(a => normalizeAnswer(a))
        .filter(a => a.length > 0 && a.length <= 60)
        .slice(0, 10);

      const q1Answers = parseAnswers(document.getElementById('admin-q1-answers').value);
      const q2Answers = parseAnswers(document.getElementById('admin-q2-answers').value);

      const q3ByClass = {};
      document.querySelectorAll('.admin-q3-class-input').forEach(input => {
        const classId = input.dataset.classId;
        if (classId) {
          q3ByClass[classId] = parseAnswers(input.value);
        }
      });

      try {
        await Promise.all([
          setDocument('gateConfig', 'questions', {
            q1Text,
            q2Text,
            q3Text,
            version: currentVersion + 1
          }),
          setDocument('gateConfig', 'answers', {
            q1: q1Answers,
            q2: q2Answers,
            q3ByClass
          })
        ]);

        showToast('Gate questions and normalized answers saved!', 'success');
      } catch (err) {
        console.error('Failed to save gate configuration:', err);
        showToast(`Save failed: ${err.message}`, 'error');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Gate Configuration';
        }
      }
    });
  }

  if (reportsContainer) {
    reportsContainer.addEventListener('click', async (e) => {
      const restoreBtn = e.target.closest('[data-action="restore"]');
      if (restoreBtn) {
        const id = restoreBtn.dataset.id;
        try {
          await updateDocument('memories', id, { reports: {}, adminReviewed: true });
          showToast('Item restored to public wall.', 'success');
        } catch (err) {
          showToast(`Restore failed: ${err.message}`, 'error');
        }
        return;
      }

      const deleteBtn = e.target.closest('[data-action="delete"]');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        try {
          await deleteDocument('memories', id);
          showToast('Flagged item permanently deleted.', 'info');
        } catch (err) {
          showToast(`Delete failed: ${err.message}`, 'error');
        }
      }
    });
  }

  router.registerScreenHook('admin', {
    onEnter: () => {
      renderReports();
      loadAndRenderGateEditor();
    },
    onLeave: () => {}
  });

  store.subscribe('isAdmin', updateAdminVisibility);
  store.subscribe('memories', renderReports);

  updateAdminVisibility();
}
