import { store } from '../../core/store/store.js';
import { renderMemoryCard } from './memories.render.js';
import { generateId } from '../../core/utils/ids.js';
import { showToast } from '../../components/toast/toast.js';
import { LIMITS } from '../../config/constants.js';

export function initMemories() {
  const container = document.getElementById('memories-container');
  const addMemoryForm = document.getElementById('add-memory-form');
  const addMemoryModal = document.getElementById('add-memory-modal');

  function render() {
    if (!container) return;
    const memories = store.get('memories') || [];
    const user = store.get('user');
    const uid = user ? user.uid : 'anon';

    // Filter out hidden memories (auto-hidden after 3 reports unless admin)
    const isAdmin = store.get('isAdmin');
    const visibleMemories = memories.filter(m => isAdmin || !m.hidden);

    if (visibleMemories.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💭</div>
          <div class="empty-state-title">Memory Wall is Quiet</div>
          <div class="empty-state-desc">Click "+ Add Memory" to post funny moments, quotes, or highlights from class.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = visibleMemories.map(mem => renderMemoryCard(mem, uid)).join('');
  }

  // Handle reactions and reports via event delegation
  if (container) {
    container.addEventListener('click', (e) => {
      const reactionBtn = e.target.closest('[data-action="reaction"]');
      if (reactionBtn) {
        const id = reactionBtn.dataset.id;
        const emoji = reactionBtn.dataset.emoji;
        const user = store.get('user');
        const uid = user ? user.uid : 'anon-user';

        store.update('memories', list => {
          return list.map(mem => {
            if (mem.id === id) {
              const reactions = { ...(mem.reactions || {}) };
              const currentArray = reactions[emoji] || [];
              if (currentArray.includes(uid)) {
                reactions[emoji] = currentArray.filter(u => u !== uid);
              } else {
                reactions[emoji] = [...currentArray, uid];
              }
              return { ...mem, reactions };
            }
            return mem;
          });
        });
        return;
      }

      const reportBtn = e.target.closest('[data-action="report"]');
      if (reportBtn) {
        const id = reportBtn.dataset.id;
        const user = store.get('user');
        const uid = user ? user.uid : 'anon';

        store.update('memories', list => {
          return list.map(mem => {
            if (mem.id === id) {
              const reportUids = mem.reportUids || [];
              if (!reportUids.includes(uid)) {
                reportUids.push(uid);
              }
              const hidden = reportUids.length >= LIMITS.MAX_REPORT_COUNT_AUTOHIDE;
              if (hidden) {
                showToast('Entry flagged by multiple students and hidden pending review.', 'info');
              } else {
                showToast('Thank you for reporting. Our moderators review flagged content.', 'info');
              }
              return { ...mem, reportUids, hidden };
            }
            return mem;
          });
        });
      }
    });
  }

  if (addMemoryForm) {
    addMemoryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const quote = document.getElementById('memory-quote').value.trim();
      const author = document.getElementById('memory-author').value.trim();
      const context = document.getElementById('memory-context').value.trim();
      const user = store.get('user');

      const newMemory = {
        id: generateId('mem'),
        classId: store.get('currentClassId'),
        authorUid: user ? user.uid : 'anon',
        quote,
        author,
        context,
        reactions: { "😂": [], "❤️": [], "🔥": [] },
        reportUids: [],
        hidden: false
      };

      store.update('memories', list => [newMemory, ...list]);
      addMemoryForm.reset();
      if (addMemoryModal) addMemoryModal.classList.remove('active');
      showToast('Memory added to the wall!', 'success');
    });
  }

  store.subscribe('memories', () => {
    render();
  });

  store.subscribe('user', () => {
    render();
  });

  render();
}
