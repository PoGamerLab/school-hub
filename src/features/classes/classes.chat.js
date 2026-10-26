/**
 * Class Chat Controller (Phase C & B6: Leaks & glitch hardening).
 */

import { initFirebase } from '../../config/firebase.js';
import { authService } from '../../core/auth/auth.js';
import { store } from '../../core/store/store.js';
import { showToast } from '../../components/toast/toast.js';
import { renderChatMessage, renderChatContainer } from './classes.chat.render.js';
import { bindAvatarFallbacks } from '../../components/avatar/avatar.js';

let activeChatUnsub = null;
let currentChatClassId = null;
let oldestDocSnap = null;
let visibilityTimer = null;
let visibilityHandler = null;
let isStreaming = false;
let liveDocs = [];
let olderDocs = [];

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
  const d = user?.mutedUntil?.toDate ? user.mutedUntil.toDate() : (user?.mutedUntil ? new Date(user.mutedUntil) : null);
  return Boolean(d && d > new Date());
}

function getMutedUntilString(user) {
  const d = user?.mutedUntil?.toDate ? user.mutedUntil.toDate() : (user?.mutedUntil ? new Date(user.mutedUntil) : null);
  return d ? d.toLocaleString() : '';
}

function renderMessagesBox(box) {
  if (!box) return;
  const user = authService.getCurrentUser();
  const isAdmin = !!store.get('isAdmin');
  const students = store.get('students') || [];

  const map = new Map();
  olderDocs.forEach(d => map.set(d.id, d));
  liveDocs.forEach(d => map.set(d.id, d));
  const messages = Array.from(map.values()).sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() || 0;
    const tb = b.createdAt?.toMillis?.() || 0;
    return ta - tb;
  });

  if (messages.length === 0) {
    box.innerHTML = '<div class="admin-empty-notice">No messages in this class chat yet. Say hello! 👋</div>';
    return;
  }

  box.innerHTML = messages.map(m => {
    const student = students.find(s => (s.id || s.uid) === m.authorUid || s.ownerUid === m.authorUid);
    return renderChatMessage(m, user ? user.uid : null, isAdmin, student);
  }).join('');

  bindAvatarFallbacks(box);
}

async function initChatStream(classId) {
  const box = document.getElementById('class-chat-messages-box');
  if (!box) return;

  isStreaming = true;
  try {
    const fb = await initFirebase();
    if (!fb?.db || currentChatClassId !== classId) {
      isStreaming = false;
      return;
    }
    const { collection, onSnapshot, query, orderBy, limit } =
      await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const q = query(collection(fb.db, 'classChats', classId, 'messages'), orderBy('createdAt', 'desc'), limit(50));

    activeChatUnsub = onSnapshot(q, (snap) => {
      liveDocs = snap.docs.map(d => ({ id: d.id, ...d.data(), _snap: d }));
      if (liveDocs.length > 0 && !oldestDocSnap) {
        oldestDocSnap = liveDocs[liveDocs.length - 1]._snap;
      }
      document.getElementById('class-chat-load-older-btn')?.classList.toggle('hidden', snap.docs.length < 50);

      renderMessagesBox(box);
      box.scrollTop = box.scrollHeight;
    }, (err) => {
      console.warn('Class chat snapshot warning:', err);
      box.innerHTML = '<div class="admin-empty-notice">Chat paused or permission required.</div>';
    });
  } catch (err) {
    console.error('Failed to init class chat:', err);
    box.innerHTML = '<div class="admin-empty-notice">Failed to load chat.</div>';
  } finally {
    isStreaming = false;
  }
}

async function loadOlderMessages(classId) {
  if (!oldestDocSnap) return;
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
      startAfter(oldestDocSnap),
      limit(50)
    );

    const snap = await getDocs(q);
    if (snap.empty) {
      loadOlderBtn?.classList.add('hidden');
      showToast('No more older messages.', 'info');
      return;
    }

    oldestDocSnap = snap.docs[snap.docs.length - 1];
    loadOlderBtn?.classList.toggle('hidden', snap.docs.length < 50);

    const prevScrollHeight = box.scrollHeight;
    const fetched = snap.docs.map(d => ({ id: d.id, ...d.data(), _snap: d }));
    olderDocs = [...fetched, ...olderDocs];

    renderMessagesBox(box);
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
        authorName = (studentProfile?.name || user.displayName || 'Student').slice(0, 80);
      }

      const batch = writeBatch(fb.db);
      const newMsgRef = doc(collection(fb.db, 'classChats', classId, 'messages'));
      const chatStateRef = doc(fb.db, 'chatState', user.uid);

      batch.set(newMsgRef, { authorUid: user.uid, authorName, classId, text: text.slice(0, 500), reports: {}, createdAt: serverTimestamp(), ...extra });
      batch.set(chatStateRef, { lastSentAt: serverTimestamp(), lastMessageId: newMsgRef.id }, { merge: true });

      await batch.commit();
      if (input) input.value = '';
    } catch (err) {
      console.error('Failed to send message:', err);
      showToast('Could not send message. Please wait 3 seconds.', 'error');
    } finally {
      if (sendBtn) sendBtn.disabled = false;
    }
  });

  box?.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('[data-action="delete-msg"]');
    const reportBtn = e.target.closest('[data-action="report-msg"]');

    if (deleteBtn) {
      if (!confirm('Delete this message?')) return;
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
        const { doc, writeBatch, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const msgId = reportBtn.dataset.id;
        const batch = writeBatch(fb.db);
        const msgRef = doc(fb.db, 'classChats', classId, 'messages', msgId);
        const queueRef = doc(fb.db, 'reportQueue', `chat_${msgId}_${user.uid}`);
        batch.update(msgRef, {
          [`reports.${user.uid}`]: { reason: safeReason, details, createdAt: serverTimestamp() }
        });
        batch.set(queueRef, {
          kind: 'chat',
          classId: classId.slice(0, 30),
          targetId: msgId.slice(0, 100),
          targetPath: `classChats/${classId}/messages/${msgId}`.slice(0, 200),
          reporterUid: user.uid,
          reason: safeReason,
          details,
          createdAt: serverTimestamp()
        });
        await batch.commit();
        showToast('Message reported to school administrators.', 'info');
      } catch (err) {
        showToast('Could not report message.', 'error');
      }
    }
  });
}

function setupVisibilityListener(classId) {
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
  }
  visibilityHandler = () => {
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
      if (!activeChatUnsub && currentChatClassId === classId && !isStreaming) {
        initChatStream(classId);
      }
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);
}

export function cleanupClassChat() {
  if (activeChatUnsub) { activeChatUnsub(); activeChatUnsub = null; }
  if (visibilityTimer) { clearTimeout(visibilityTimer); visibilityTimer = null; }
  if (visibilityHandler) { document.removeEventListener('visibilitychange', visibilityHandler); visibilityHandler = null; }
  isStreaming = false;
  currentChatClassId = null;
  oldestDocSnap = null;
  liveDocs = [];
  olderDocs = [];
}
