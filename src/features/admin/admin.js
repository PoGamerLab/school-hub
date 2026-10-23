/**
 * Administrator Panel logic (Phase 1, section 4.7).
 */

import { store } from '../../core/store/store.js';
import { router } from '../../core/router/router.js';
import { authService } from '../../core/auth/auth.js';
import { renderReportedMemoryRow, renderGateEditor, renderClassManager } from './admin.render.js';
import { showToast } from '../../components/toast/toast.js';
import { updateDocument, deleteDocument, getDocument, setDocument } from '../../core/db/firestore.js';
import { fetchActiveClasses } from '../gate/gate.db.js';
import { normalizeAnswer } from '../../core/utils/normalizeAnswer.js';
import { initFirebase } from '../../config/firebase.js';

export function initAdmin() {
  const reportsContainer = document.getElementById('admin-reports-list');
  const gateEditorContainer = document.getElementById('admin-gate-editor-root');
  const classManagerContainer = document.getElementById('admin-class-manager-root');
  function updateAdminVisibility() {
    const isAdmin = store.get('isAdmin');
    document.querySelectorAll('[data-screen="admin"]').forEach(el => {
      el.classList.toggle('hidden-admin', !isAdmin);
    });
  }

  async function renderReports() {
    if (!reportsContainer) return;
    let flagged = [];
    try {
      const fb = await initFirebase();
      if (fb && fb.db) {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const snap = await getDocs(collection(fb.db, 'memories'));
        flagged = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(m => Object.keys(m.reports || {}).length > 0);
      } else {
        const memories = store.get('memories') || [];
        flagged = memories.filter(m => Object.keys(m.reports || {}).length > 0);
      }
    } catch {
      const memories = store.get('memories') || [];
      flagged = memories.filter(m => Object.keys(m.reports || {}).length > 0);
    }

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

  async function loadAndRenderClassManager() {
    if (!classManagerContainer) return;
    try {
      const classes = await fetchActiveClasses();
      classManagerContainer.innerHTML = renderClassManager(classes);
      attachClassManagerEvents();
    } catch (err) {
      console.error('Failed to load classes in admin:', err);
      classManagerContainer.innerHTML = '<div class="admin-empty-notice">Failed to load classes.</div>';
    }
  }

  function attachClassManagerEvents() {
    const form = document.getElementById('admin-create-class-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = authService.getCurrentUser();
      const rawId = document.getElementById('admin-new-class-id').value.trim().toLowerCase();
      const classId = rawId.replace(/[^a-z0-9_-]/g, '-').slice(0, 30);
      const name = document.getElementById('admin-new-class-name').value.trim();
      const grade = document.getElementById('admin-new-class-grade').value.trim();
      const section = document.getElementById('admin-new-class-section').value.trim();
      const classTeacher = document.getElementById('admin-new-class-teacher').value.trim();
      const room = document.getElementById('admin-new-class-room').value.trim();

      if (!classId || !name) {
        showToast('Class identifier and name are required.', 'error');
        return;
      }

      const submitBtn = document.getElementById('admin-create-class-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating class...';
      }

      try {
        await setDocument('classes', classId, {
          name,
          grade,
          section,
          classTeacher,
          room,
          status: 'active',
          createdBy: user?.uid || 'admin',
          supporterUids: user ? [user.uid] : []
        }, true, 'createdAt');

        showToast(`Class "${name}" created and active!`, 'success');
        store.set('currentClassId', classId, false);
        store.set('classInfo', { id: classId, name, grade, section, classTeacher, room, status: 'active' }, false);
        await Promise.all([loadAndRenderClassManager(), loadAndRenderGateEditor()]);
      } catch (err) {
        console.error('Failed to create class:', err);
        showToast(`Error creating class: ${err.message}`, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '+ Create Active Class';
        }
      }
    });

    classManagerContainer.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('[data-action="delete-class"]');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (!confirm(`Are you sure you want to delete class ${id}?`)) return;
        try {
          await deleteDocument('classes', id);
          showToast(`Class ${id} deleted.`, 'info');
          await Promise.all([loadAndRenderClassManager(), loadAndRenderGateEditor()]);
        } catch (err) {
          showToast(`Delete failed: ${err.message}`, 'error');
        }
      }
    });
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
      loadAndRenderClassManager();
    },
    onLeave: () => {}
  });

  store.subscribe('isAdmin', updateAdminVisibility);
  store.subscribe('memories', renderReports);

  updateAdminVisibility();
}
