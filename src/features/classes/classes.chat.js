/**
 * Class Chat Controller (Phase C: Rate limits, pagination, reporting, moderation).
 */

import { initFirebase } from '../../config/firebase.js';
import { authService } from '../../core/auth/auth.js';
import { store } from '../../core/store/store.js';
import { showToast } from '../../components/toast/toast.js';
import { renderChatMessage, renderChatContainer } from './classes.chat.render.js';
import { bindAvatarFallbacks } from '../../components/avatar/avatar.js';

let activeChatUnsub = null;
let currentChatClassId = null;
let oldestDocCursor = null;
let visibilityTimer = null;

export function loadAndRenderClassChat(classId, className) {
  const container = document.getElementById('class-chat-root');
  if (!container) return;
  cleanupClassChat();
  currentChatClassId = classId;

  const user = authService.getCurrentUser();
  const isAdmin = !!store.get('isAdmin');
  const isMember = user && user.classId === classId;
  const isMuted = checkIsMuted(user);
  const mutedUntilStr = getMutedUntilString(user);

  container.innerHTML = renderChatContainer(isMember, isAdmin, className, isMuted, mutedUntilStr);
  if (!isMember && !isAdmin) return;

  initChatStream(classId);
  attachChatEvents(classId);
  setupVisibilityListener(classId);
}

function checkIsMuted(user) {
  if (!user?.mutedUntil) return false;
  const mutedDate = user.mutedUntil.toDate ? user.mutedUntil.toDate() : new Date(user.mutedUntil);
  return mutedDate > new Date();
}

function getMutedUntilString(user) {
  if (!user?.mutedUntil) return '';
  const mutedDate = user.mutedUntil.toDate ? user.mutedUntil.toDate() : new Date(user.mutedUntil);
  return mutedDate.toLocaleString();
}

async function initChatStream(classId) {
  const box = document.getElementById('class-chat-messages-box');
  if (!box) return;

  try {
    const fb = await initFirebase();
    if (!fb?.db) return;
    const { collection, onSnapshot, query, orderBy, limit } =
      await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const q = query(collection(fb.db, 'classChats', classId, 'messages'), orderBy('createdAt', 'desc'), limit(50));

    activeChatUnsub = onSnapshot(q, (snap) => {
      const user = authService.getCurrentUser();
      const isAdmin = !!store.get('isAdmin');
      const docs = snap.docs;
      const students = store.get('students') || [];

      if (docs.length > 0) {
        oldestDocCursor = docs[docs.length - 1];
        document.getElementById('class-chat-load-older-btn')?.classList.toggle('hidden', docs.length < 50);
      }

      const messages = docs.map(d => ({ id: d.id, ...d.data() })).reverse();
      if (messages.length === 0) {
        box.innerHTML = '<div class="admin-empty-notice">No messages in this class chat yet. Say hello! 👋</div>';
        return;
      }

      box.innerHTML = messages.map(m => {
        const student = students.find(s => (s.id || s.uid) === m.authorUid || s.ownerUid === m.authorUid);
        return renderChatMessage(m, user ? user.uid : null, isAdmin, student);
      }).join('');

      bindAvatarFallbacks(box);
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

async function loadOlderMessages(classId) {
  if (!oldestDocCursor) return;
  const loadOlderBtn = document.getElementById('class-chat-load-older-btn');
  const box = document.getElementById('class-chat-messages-box');
  if (loadOlderBtn) loadOlderBtn.disabled = true;

  try {
    const fb = await initFirebase();
    const { collection, getDocs, query, orderBy, startAfter, limit } =
      await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const q = query(
      collection(fb.db, 'classChats', classId, 'messages'),
      orderBy('createdAt', 'desc'),
      startAfter(oldestDocCursor),
      limit(50)
    );

    const snap = await getDocs(q);
    const docs = snap.docs;
    if (docs.length === 0) {
      loadOlderBtn?.classList.add('hidden');
      showToast('No more older messages.', 'info');
      return;
    }

    oldestDocCursor = docs[docs.length - 1];
    loadOlderBtn?.classList.toggle('hidden', docs.length < 50);

    const user = authService.getCurrentUser();
    const isAdmin = !!store.get('isAdmin');
    const students = store.get('students') || [];
    const olderMessages = docs.map(d => ({ id: d.id, ...d.data() })).reverse();

    const olderHtml = olderMessages.map(m => {
      const student = students.find(s => (s.id || s.uid) === m.authorUid || s.ownerUid === m.authorUid);
      return renderChatMessage(m, user ? user.uid : null, isAdmin, student);
    }).join('');

    const prevScrollHeight = box.scrollHeight;
    box.insertAdjacentHTML('afterbegin', olderHtml);
    bindAvatarFallbacks(box);
    box.scrollTop = box.scrollHeight - prevScrollHeight;
  } catch (err) {
    console.error('Failed to load older messages:', err);
    showToast('Could not load older messages.', 'error');
  } finally {
    if (loadOlderBtn) loadOlderBtn.disabled = false;
  }
}

function attachChatEvents(classId) {
  const form = document.getElementById('class-chat-send-form');
  const box = document.getElementById('class-chat-messages-box');
  document.getElementById('class-chat-load-older-btn')?.addEventListener('click', () => loadOlderMessages(classId));

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('class-chat-input-text');
    const text = input ? input.value.trim() : '';
    if (!text) return;

    const user = authService.getCurrentUser();
    if (!user) return showToast('Please sign in to send messages.', 'error');
    if (checkIsMuted(user)) return showToast('You are currently muted and cannot send messages.', 'error');

    const isAdmin = !!store.get('isAdmin');
    let authorName = isAdmin ? 'School Administration' : '';
    const extra = isAdmin ? { authorRole: 'admin' } : {};

    const sendBtn = document.getElementById('class-chat-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    try {
      const fb = await initFirebase();
      const { doc, getDoc, writeBatch, serverTimestamp, collection } =
        await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

      if (!isAdmin) {
        const students = store.get('students') || [];
        const studentProfile = students.find(s => (s.id || s.uid) === user.uid || s.ownerUid === user.uid);
        if (studentProfile?.name) {
          authorName = studentProfile.name.slice(0, 80);
        } else {
          try {
            const sDoc = await getDoc(doc(fb.db, 'students', user.uid));
            if (sDoc.exists() && sDoc.data()?.name) {
              authorName = sDoc.data().name.slice(0, 80);
            }
          } catch (fetchErr) {
            console.warn('Could not fetch student doc for author name:', fetchErr);
          }
        }
        if (!authorName) {
          authorName = (user.displayName || 'Student').slice(0, 80);
        }
      }

      const batch = writeBatch(fb.db);
      const newMsgRef = doc(collection(fb.db, 'classChats', classId, 'messages'));
      const chatStateRef = doc(fb.db, 'chatState', user.uid);

      batch.set(newMsgRef, { authorUid: user.uid, authorName, classId, text: text.slice(0, 500), reports: {}, createdAt: serverTimestamp(), ...extra });
      batch.set(chatStateRef, { lastMessageAt: serverTimestamp(), lastMessageId: newMsgRef.id });

      await batch.commit();
      if (input) input.value = '';
    } catch (err) {
      console.error('Send message error:', err);
      const errMsg = err?.message || '';
      showToast(errMsg.includes('permission-denied') || errMsg.includes('PERMISSION_DENIED') ? 'Message blocked (muted, banned, or sending too fast).' : 'Failed to send message.', 'error');
    } finally {
      if (sendBtn) sendBtn.disabled = false;
    }
  });

  box?.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('[data-action="delete-msg"]');
    const reportBtn = e.target.closest('[data-action="report-msg"]');

    if (deleteBtn && confirm('Delete this message?')) {
      try {
        const fb = await initFirebase();
        const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        await deleteDoc(doc(fb.db, 'classChats', classId, 'messages', deleteBtn.dataset.id));
        showToast('Message deleted.');
      } catch (err) {
        showToast('Could not delete message.', 'error');
      }
    }

    if (reportBtn) {
      const user = authService.getCurrentUser();
      if (!user) return;
      const reason = prompt('Reason for reporting message? (inappropriate, harassment, spam, other):', 'inappropriate');
      if (!reason) return;
      const safeReason = ['inappropriate', 'harassment', 'spam', 'other'].includes(reason.toLowerCase().trim()) ? reason.toLowerCase().trim() : 'other';
      const details = (prompt('Optional details (up to 200 characters):') || '').slice(0, 200);

      try {
        const fb = await initFirebase();
        const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const updatePayload = {};
        updatePayload[`reports.${user.uid}`] = { reason: safeReason, details, createdAt: serverTimestamp() };
        await updateDoc(doc(fb.db, 'classChats', classId, 'messages', reportBtn.dataset.id), updatePayload);
        showToast('Message reported to school administrators.', 'info');
      } catch (err) {
        showToast('Could not report message.', 'error');
      }
    }
  });
}

function setupVisibilityListener(classId) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      visibilityTimer = setTimeout(() => {
        if (activeChatUnsub) {
          activeChatUnsub();
          activeChatUnsub = null;
        }
      }, 60000);
    } else {
      if (visibilityTimer) {
        clearTimeout(visibilityTimer);
        visibilityTimer = null;
      }
      if (!activeChatUnsub && currentChatClassId === classId) {
        initChatStream(classId);
      }
    }
  });
}

export function cleanupClassChat() {
  if (activeChatUnsub) {
    activeChatUnsub();
    activeChatUnsub = null;
  }
  if (visibilityTimer) {
    clearTimeout(visibilityTimer);
    visibilityTimer = null;
  }
  currentChatClassId = null;
  oldestDocCursor = null;
}
