/**
 * Admin Class Context Switcher (Phase A3).
 * Allows administrators to switch active class context for memories, superlatives, and gallery.
 */

import { store } from '../../core/store/store.js';
import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function initAdminClassSwitcher() {
  function renderAllSwitchers() {
    const isAdmin = !!store.get('isAdmin');
    const slots = document.querySelectorAll('.admin-class-switcher-slot');
    const classes = store.get('activeClasses') || [];
    const currentClassId = store.get('currentClassId') || '';

    slots.forEach(slot => {
      if (!isAdmin) {
        slot.innerHTML = '';
        return;
      }

      slot.innerHTML = `
        <div class="admin-class-switcher-bar">
          <label class="admin-switcher-label">
            <span class="tag tag-gold">🛡️ Class Context:</span>
            <select class="admin-class-switcher-select">
              <option value="" ${!currentClassId ? 'selected' : ''}>All classes (read only)</option>
              ${classes.map(c => `
                <option value="${escapeAttr(c.id)}" ${c.id === currentClassId ? 'selected' : ''}>
                  ${escapeHtml(c.name || c.id)}
                </option>
              `).join('')}
            </select>
          </label>
        </div>
      `;

      const select = slot.querySelector('.admin-class-switcher-select');
      select?.addEventListener('change', (e) => {
        const val = e.target.value;
        store.set('currentClassId', val, false);
      });
    });

    updateButtonStates(isAdmin, currentClassId);
  }

  function updateButtonStates(isAdmin, currentClassId) {
    const memoryBtn = document.getElementById('open-add-memory-btn');
    const superlativeBtn = document.getElementById('open-add-superlative-btn');
    const photoBtn = document.getElementById('open-add-photo-btn');

    const shouldDisable = isAdmin && !currentClassId;

    [memoryBtn, superlativeBtn, photoBtn].forEach(btn => {
      if (!btn) return;
      if (shouldDisable) {
        btn.dataset.prevTitle = btn.title || '';
        btn.disabled = true;
        btn.title = 'Pick a class first in the class context dropdown above.';
      } else if (btn.disabled && btn.title?.includes('Pick a class first')) {
        btn.disabled = false;
        btn.title = btn.dataset.prevTitle || '';
      }
    });
  }

  store.subscribe('isAdmin', () => renderAllSwitchers());
  store.subscribe('activeClasses', () => renderAllSwitchers());
  store.subscribe('currentClassId', (cid) => {
    const isAdmin = !!store.get('isAdmin');
    document.querySelectorAll('.admin-class-switcher-select').forEach(sel => {
      sel.value = cid || '';
    });
    updateButtonStates(isAdmin, cid);
  });

  renderAllSwitchers();
}
