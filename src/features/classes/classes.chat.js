import { initFirebase } from '../../config/firebase.js';
import { authService } from '../../core/auth/auth.js';
import { store } from '../../core/store/store.js';
import { showToast } from '../../components/toast/toast.js';
import { renderChatMessage, renderChatContainer } from './classes.chat.render.js';

let activeChatUnsub = null;
let currentChatClassId = null;

export function loadAndRenderClassChat(classId, className) {
  const container = document.getElementById('class-chat-root');
  if (!container) return;

  if (activeChatUnsub) {
    activeChatUnsub();
    activeChatUnsub = null;
  }

  currentChatClassId = classId;
  const user = authService.getCurrentUser();
  const isAdmin = !!store.get('isAdmin');
  const isMember = user && user.classId === classId;

  container.innerHTML = renderChatContainer(isMember, isAdmin, className);
  if (!isMember && !isAdmin) return;

  initChatStream(classId);
  attachChatEvents(classId);
}

async function initChatStream(classId) {
  const box = document.getElementById('class-chat-messages-box');
  if (!box) return;

  try {
    const fb = await initFirebase();
    if (!fb || !fb.db) return;
    const { collection, onSnapshot, query, orderBy, limit } =
      await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const q = query(
      collection(fb.db, 'classChats', classId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(250)
    );

    activeChatUnsub = onSnapshot(q, (snap) => {
      const user = authService.getCurrentUser();
      const isAdmin = !!store.get('isAdmin');
      const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (messages.length === 0) {
        box.innerHTML = '<div class="admin-empty-notice">No messages in this class chat yet. Say hello! 👋</div>';
        return;
      }

      box.innerHTML = messages.map(m => renderChatMessage(m, user ? user.uid : null, isAdmin)).join('');
      box.scrollTop = box.scrollHeight;
    }, (err) => {
      console.warn('Class chat snapshot warning:', err);
      box.innerHTML = '<div class="admin-empty-notice">Chat paused or permission required.</div>';
    });
  } catch (err) {
    console.error('Failed to init class chat:', err);
    box.innerHTML = '<div class="admin-empty-notice">Failed to load chat.</div>';
  }
}

function attachChatEvents(classId) {
  const form = document.getElementById('class-chat-send-form');
  const box = document.getElementById('class-chat-messages-box');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('class-chat-input-text');
      const text = input ? input.value.trim() : '';
      if (!text) return;

      const user = authService.getCurrentUser();
      if (!user) {
        showToast('Please sign in to send messages.', 'error');
        return;
      }

      const students = store.get('students') || [];
      const studentProfile = students.find(s => (s.id || s.uid) === user.uid || s.ownerUid === user.uid);
      const authorHouse = studentProfile?.house || 'Unity';

      const sendBtn = document.getElementById('class-chat-send-btn');
      if (sendBtn) sendBtn.disabled = true;

      try {
        const fb = await initFirebase();
        const { collection, addDoc, serverTimestamp } =
          await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

        await addDoc(collection(fb.db, 'classChats', classId, 'messages'), {
          authorUid: user.uid,
          authorName: user.displayName || 'Classmate',
          authorHouse,
          classId,
          text,
          createdAt: serverTimestamp()
        });

        if (input) input.value = '';
      } catch (err) {
        console.error('Send message error:', err);
        showToast(`Failed to send message: ${err.message}`, 'error');
      } finally {
        if (sendBtn) sendBtn.disabled = false;
      }
    });
  }

  if (box) {
    box.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('[data-action="delete-msg"]');
      if (!deleteBtn) return;
      const msgId = deleteBtn.dataset.id;
      if (!confirm('Delete this message?')) return;

      try {
        const fb = await initFirebase();
        const { doc, deleteDoc } =
          await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

        await deleteDoc(doc(fb.db, 'classChats', classId, 'messages', msgId));
        showToast('Message deleted.');
      } catch (err) {
        console.error('Delete message error:', err);
        showToast(`Could not delete: ${err.message}`, 'error');
      }
    });
  }
}

export function cleanupClassChat() {
  if (activeChatUnsub) {
    activeChatUnsub();
    activeChatUnsub = null;
  }
  currentChatClassId = null;
}
