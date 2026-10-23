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
import { syncClasses } from '../classes/classes.js';
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
    let flaggedMemories = [];
    let flaggedSuperlatives = [];
    try {
      const fb = await initFirebase();
      if (fb && fb.db) {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const [memSnap, supSnap] = await Promise.all([
          getDocs(collection(fb.db, 'memories')),
          getDocs(collection(fb.db, 'superlatives'))
        ]);
        flaggedMemories = memSnap.docs
          .map(d => ({ id: d.id, ...d.data(), itemType: 'memories' }))
          .filter(m => Object.keys(m.reports || {}).length > 0);
        flaggedSuperlatives = supSnap.docs
          .map(d => ({ id: d.id, quote: d.data().title, author: 'Superlative Category', ...d.data(), itemType: 'superlatives' }))
          .filter(s => Object.keys(s.reports || {}).length > 0);
      }
    } catch (err) {
      console.warn('Failed to load reports:', err);
    }

    const allFlagged = [...flaggedMemories, ...flaggedSuperlatives];

    if (allFlagged.length === 0) {
      reportsContainer.innerHTML = '<div class="admin-empty-notice">No reported items. Community is happy!</div>';
      return;
    }

    reportsContainer.innerHTML = allFlagged.map(m => renderReportedMemoryRow(m)).join('');
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

    const gradeSelect = document.getElementById('admin-select-grade');
    const secSelect = document.getElementById('admin-select-section');
    const previewName = document.getElementById('admin-class-preview-name');
    const previewSlug = document.getElementById('admin-class-preview-slug');

    function updatePreview() {
      if (!gradeSelect || !secSelect) return { name: '', slug: '', grade: '', section: '' };
      const gVal = gradeSelect.value;
      const gOpt = gradeSelect.options[gradeSelect.selectedIndex];
      const gNum = gOpt?.dataset?.num || gVal.replace(/[^0-9]/g, '');
      const sVal = secSelect.value;
      const sOpt = secSelect.options[secSelect.selectedIndex];
      const sLetter = sOpt?.dataset?.sec || sVal.replace(/[^a-zA-Z]/g, '').toLowerCase();

      const name = `${gVal} — ${sVal}`;
      const slug = `${gNum}-${sLetter}`.toLowerCase();

      if (previewName) previewName.textContent = name;
      if (previewSlug) previewSlug.textContent = slug;
      return { name, slug, grade: gVal, section: sVal };
    }

    gradeSelect?.addEventListener('change', updatePreview);
    secSelect?.addEventListener('change', updatePreview);
    updatePreview();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = authService.getCurrentUser();
      const { name, slug: classId, grade, section } = updatePreview();
      const classTeacher = document.getElementById('admin-new-class-teacher').value.trim();

      if (!classId || !classTeacher) {
        showToast('Please specify the Class Teacher name.', 'error');
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
          status: 'active',
          createdBy: user?.uid || 'admin',
          supporterUids: user ? [user.uid] : []
        }, true, 'createdAt');

        showToast(`Class "${name}" created and active!`, 'success');
        await syncClasses();
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
          await syncClasses();
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
        const type = restoreBtn.dataset.type || 'memories';
        try {
          await updateDocument(type, id, { reports: {}, adminReviewed: true });
          showToast('Reports cleared; item remains active.', 'success');
          await renderReports();
        } catch (err) {
          showToast(`Action failed: ${err.message}`, 'error');
        }
        return;
      }

      const deleteBtn = e.target.closest('[data-action="delete"]');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        const type = deleteBtn.dataset.type || 'memories';
        try {
          await deleteDocument(type, id);
          showToast('Flagged item permanently deleted.', 'info');
          await renderReports();
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
