import { initFirebase } from '../../config/firebase.js';
import { authService } from '../../core/auth/auth.js';
import { store } from '../../core/store/store.js';
import { showToast } from '../../components/toast/toast.js';
import { renderAnnouncementCard, renderAnnouncementsContainer } from './classes.announcements.render.js';

let activeAnnUnsub = null;
let currentAnnClassId = null;

export function loadAndRenderAnnouncements(classInfo) {
  const container = document.getElementById('class-announcements-root');
  if (!container || !classInfo) return;

  if (activeAnnUnsub) {
    activeAnnUnsub();
    activeAnnUnsub = null;
  }

  const classId = classInfo.id;
  currentAnnClassId = classId;
  const user = authService.getCurrentUser();
  const isAdmin = !!store.get('isAdmin');
  const isMember = user && user.classId === classId;
  const isMonitor = user && classInfo.monitorUid === user.uid;
  const canPost = isAdmin || isMonitor;

  container.innerHTML = renderAnnouncementsContainer(isMember, isAdmin, canPost, classInfo.name || classId);
  if (!isMember && !isAdmin) return;

  initAnnouncementsStream(classId);
  attachAnnouncementsEvents(classInfo, canPost);
}

async function initAnnouncementsStream(classId) {
  const box = document.getElementById('class-announcements-list-box');
  if (!box) return;

  try {
    const fb = await initFirebase();
    if (!fb || !fb.db) return;
    const { collection, onSnapshot, query, orderBy } =
      await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const q = query(
      collection(fb.db, 'classes', classId, 'announcements'),
      orderBy('createdAt', 'desc')
    );

    activeAnnUnsub = onSnapshot(q, (snap) => {
      const user = authService.getCurrentUser();
      const isAdmin = !!store.get('isAdmin');
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (items.length === 0) {
        box.innerHTML = '<div class="admin-empty-notice">No announcements posted for this class yet.</div>';
        return;
      }

      box.innerHTML = items.map(a => renderAnnouncementCard(a, user ? user.uid : null, isAdmin)).join('');
    }, (err) => {
      console.warn('Announcements snapshot warning:', err);
      box.innerHTML = '<div class="admin-empty-notice">Could not load announcements.</div>';
    });
  } catch (err) {
    console.error('Failed to init announcements stream:', err);
    box.innerHTML = '<div class="admin-empty-notice">Failed to load announcements.</div>';
  }
}

function attachAnnouncementsEvents(classInfo, canPost) {
  const classId = classInfo.id;
  const modal = document.getElementById('add-announcement-modal');
  const openBtn = document.getElementById('open-add-announcement-btn');
  const closeBtn = document.getElementById('close-announcement-modal');
  const form = document.getElementById('add-announcement-form');
  const box = document.getElementById('class-announcements-list-box');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => modal.classList.add('active'));
  }
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }

  if (form && canPost) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = authService.getCurrentUser();
      if (!user) return;

      const title = document.getElementById('ann-title').value.trim();
      const content = document.getElementById('ann-content').value.trim();
      const isAdmin = !!store.get('isAdmin');
      const authorRole = isAdmin ? 'Administrator' : 'Class Monitor';

      try {
        const fb = await initFirebase();
        const { collection, addDoc, serverTimestamp } =
          await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

        const students = store.get('students') || [];
        const studentProfile = students.find(s => (s.id || s.uid) === user.uid || s.ownerUid === user.uid);
        const authorName = isAdmin ? 'School Administration' : (studentProfile?.name || 'Class Monitor').slice(0, 80);

        await addDoc(collection(fb.db, 'classes', classId, 'announcements'), {
          title: title.slice(0, 100),
          body: content.slice(0, 1000),
          authorUid: user.uid,
          authorName,
          createdAt: serverTimestamp()
        });

        form.reset();
        modal?.classList.remove('active');
        showToast('Announcement posted to class!', 'success');
      } catch (err) {
        console.error('Failed to post announcement:', err);
        showToast(`Failed to post: ${err.message}`, 'error');
      }
    });
  }

  if (box) {
    box.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('[data-action="delete-ann"]');
      if (!deleteBtn) return;
      const annId = deleteBtn.dataset.id;
      if (!confirm('Permanently delete this announcement?')) return;

      try {
        const fb = await initFirebase();
        const { doc, deleteDoc } =
          await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

        await deleteDoc(doc(fb.db, 'classes', classId, 'announcements', annId));
        showToast('Announcement deleted.');
      } catch (err) {
        showToast(`Could not delete: ${err.message}`, 'error');
      }
    });
  }
}

export function cleanupAnnouncements() {
  if (activeAnnUnsub) {
    activeAnnUnsub();
    activeAnnUnsub = null;
  }
  currentAnnClassId = null;
}
