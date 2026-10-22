import { store } from '../../core/store/store.js';
import { renderSuperlativeCard } from './superlatives.render.js';
import { generateId } from '../../core/utils/ids.js';
import { showToast } from '../../components/toast/toast.js';

export function initSuperlatives() {
  const container = document.getElementById('superlatives-container');
  const addSuperlativeForm = document.getElementById('add-superlative-form');
  const addSuperlativeModal = document.getElementById('add-superlative-modal');

  function render() {
    if (!container) return;
    const superlatives = store.get('superlatives') || [];
    if (superlatives.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🏆</div>
          <div class="empty-state-title">No Superlatives Added Yet</div>
          <div class="empty-state-desc">Click "+ Add Superlative" to nominate and award classmates.</div>
        </div>
      `;
      return;
    }
    container.innerHTML = superlatives.map(sup => renderSuperlativeCard(sup)).join('');
  }

  if (addSuperlativeForm) {
    addSuperlativeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const icon = document.getElementById('superlative-icon').value.trim() || '🏆';
      const title = document.getElementById('superlative-title').value.trim();
      const winner = document.getElementById('superlative-winner').value.trim();
      const reason = document.getElementById('superlative-reason').value.trim();

      const newSup = {
        id: generateId('sup'),
        classId: store.get('currentClassId'),
        icon,
        title,
        winner,
        reason,
        votes: {}
      };

      store.update('superlatives', list => [newSup, ...list]);
      addSuperlativeForm.reset();
      if (addSuperlativeModal) addSuperlativeModal.classList.remove('active');
      showToast(`Added superlative: "${title}"!`, 'success');
    });
  }

  store.subscribe('superlatives', () => {
    render();
  });

  render();
}
