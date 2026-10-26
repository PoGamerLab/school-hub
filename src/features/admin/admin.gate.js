/**
 * Admin Panel: Classes & Gate Management (Phase 3 Architecture).
 */

import { fetchActiveClasses } from '../gate/gate.db.js';
import { syncClasses } from '../classes/classes.js';
import { normalizeAnswer } from '../../core/utils/normalizeAnswer.js';
import { logAdminAction } from '../../core/siteConfig.js';
import { renderGateEditor, renderClassManager } from './admin.render.js';
import { setDocument, deleteDocument, getDocument } from '../../core/db/firestore.js';
import { showToast } from '../../components/toast/toast.js';

export async function loadAndRenderClassManager() {
  const container = document.getElementById('admin-class-manager-root');
  if (!container) return;

  try {
    const classes = await fetchActiveClasses();
    container.innerHTML = renderClassManager(classes);
    attachClassManagerEvents(container);
  } catch (err) {
    console.error('Failed to load class manager:', err);
    container.innerHTML = '<div class="admin-empty-notice">Failed to load classes.</div>';
  }
}

function attachClassManagerEvents(container) {
  const form = document.getElementById('admin-create-class-form');

  // Live preview: update slug and name pill as grade/section selects change
  function updatePreview() {
    const gradeEl   = document.getElementById('admin-select-grade');
    const sectionEl = document.getElementById('admin-select-section');
    const gradeOpt  = gradeEl?.options[gradeEl.selectedIndex];
    const secOpt    = sectionEl?.options[sectionEl.selectedIndex];
    const num  = gradeOpt?.dataset.num  || '10';
    const sec  = secOpt?.dataset.sec    || 'b';
    const slug = `${num}-${sec}`;
    const displayGrade   = gradeOpt?.text   || 'Grade 10';
    const displaySection = secOpt?.text     || 'Section B';
    const nameStr = `${displayGrade} — ${displaySection}`;

    const previewName = document.getElementById('admin-class-preview-name');
    const previewSlug = document.getElementById('admin-class-preview-slug');
    if (previewName) previewName.textContent = nameStr;
    if (previewSlug) previewSlug.textContent  = slug;
  }

  document.getElementById('admin-select-grade')?.addEventListener('change', updatePreview);
  document.getElementById('admin-select-section')?.addEventListener('change', updatePreview);
  updatePreview();

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('admin-create-class-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating...';
    }

    const gradeEl   = document.getElementById('admin-select-grade');
    const sectionEl = document.getElementById('admin-select-section');
    const gradeOpt  = gradeEl?.options[gradeEl.selectedIndex];
    const secOpt    = sectionEl?.options[sectionEl.selectedIndex];

    const num  = gradeOpt?.dataset.num  || '10';
    const sec  = secOpt?.dataset.sec    || 'b';
    const id   = `${num}-${sec}`;
    const grade   = gradeOpt?.text   || 'Grade 10';
    const section = secOpt?.text     || 'Section B';
    const name = `${grade} — ${section}`;
    const classTeacher = (document.getElementById('admin-new-class-teacher')?.value || '').trim();

    if (!classTeacher) {
      showToast('Please enter a class teacher name.', 'error');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '+ Create Active Class'; }
      return;
    }

    try {
      if (await getDocument('classes', id)) {
        showToast(`Class ${id} already exists.`, 'error');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '+ Create Active Class'; }
        return;
      }

      await setDocument('classes', id, {
        id,
        name,
        grade,
        section,
        classTeacher,
        status: 'active',
        monitorUid: '',
        createdAt: new Date().toISOString()
      });
      await logAdminAction('CREATE_CLASS', id, `Created class: ${name} (${id})`);
      showToast(`Class "${name}" created successfully!`, 'success');
      form.reset();
      updatePreview();
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

  container.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('[data-action="delete-class"]');
    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      if (!confirm(`Are you sure you want to delete class ${id}?`)) return;
      try {
        await deleteDocument('classes', id);
        await logAdminAction('DELETE_CLASS', id, `Deleted class ${id}`);
        showToast(`Class ${id} deleted.`, 'info');
        await syncClasses();
        await Promise.all([loadAndRenderClassManager(), loadAndRenderGateEditor()]);
      } catch (err) {
        showToast(`Delete failed: ${err.message}`, 'error');
      }
    }
  });
}

export async function loadAndRenderGateEditor() {
  const container = document.getElementById('admin-gate-editor-root');
  if (!container) return;

  try {
    const [qDoc, aDoc, classes] = await Promise.all([
      getDocument('gateConfig', 'questions'),
      getDocument('gateConfig', 'answers'),
      fetchActiveClasses()
    ]);

    const questions = qDoc || { q1Text: '', q2Text: '', q3Text: '', version: 1 };
    const answers = aDoc || { q1: [], q2: [], q3ByClass: {} };

    container.innerHTML = renderGateEditor(questions, answers, classes);
    attachGateEditorEvents(questions.version || 1);
  } catch (err) {
    console.error('Failed to load gate editor:', err);
    container.innerHTML = '<div class="admin-empty-notice">Failed to load gate configuration.</div>';
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
      if (classId) q3ByClass[classId] = parseAnswers(input.value);
    });

    try {
      await Promise.all([
        setDocument('gateConfig', 'questions', { q1Text, q2Text, q3Text, version: currentVersion + 1 }),
        setDocument('gateConfig', 'answers', { q1: q1Answers, q2: q2Answers, q3ByClass })
      ]);

      await logAdminAction('UPDATE_GATE', '', 'Updated gate questions & normalized answers');
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
