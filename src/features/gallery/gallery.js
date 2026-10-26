import { store } from '../../core/store/store.js';
import { router } from '../../core/router/router.js';
import { authService } from '../../core/auth/auth.js';
import { renderGalleryCard } from './gallery.render.js';
import { showToast } from '../../components/toast/toast.js';
import { subscribeClassCollection, unsubscribeCollection, createDocument, deleteDocument } from '../../core/db/firestore.js';
import { logAdminAction } from '../admin/admin.audit.js';

export function initGallery() {
  const container = document.getElementById('gallery-container');
  const addPhotoForm = document.getElementById('add-photo-form');
  const addPhotoModal = document.getElementById('add-photo-modal');
  const loadMoreContainer = document.getElementById('gallery-load-more-container');
  const loadMoreBtn = document.getElementById('gallery-load-more-btn');

  let activeSub = null;

  function render() {
    if (!container) return;
    const gallery = store.get('gallery') || [];
    if (gallery.length === 0) {
      container.innerHTML = `
        <div class="empty-state full-width-empty">
          <div class="empty-state-icon">📷</div>
          <div class="empty-state-title">No Campus Photos Yet</div>
          <div class="empty-state-desc">Click "+ Add Picture" to share photos from around campus.</div>
        </div>
      `;
      return;
    }
    const user = authService.getCurrentUser();
    const isAdmin = Boolean(store.get('isAdmin'));
    const currentUid = user ? user.uid : null;
    container.innerHTML = gallery.map(item => renderGalleryCard(item, { isAdmin, currentUid })).join('');
    container.querySelectorAll('.gallery-img').forEach(img => {
      img.addEventListener('error', () => {
        img.src = 'images/apsacs-logo.png';
      }, { once: true });
    });
  }

  // Delegated click listener on gallery container for deletion and reporting
  if (container) {
    container.addEventListener('click', async (e) => {
      const delBtn = e.target.closest('[data-action="delete-gallery"]');
      const reportBtn = e.target.closest('[data-action="report-gallery"]');
      const user = authService.getCurrentUser();

      if (reportBtn) {
        if (!user) {
          showToast('Please sign in to report photos.', 'error');
          return;
        }
        const galleryId = reportBtn.dataset.id;
        const itemClass = reportBtn.dataset.class || store.get('currentClassId') || '';
        const rawReason = prompt('Why are you reporting this photo? (inappropriate, harassment, spam, other):', 'inappropriate');
        if (!rawReason) return;
        const safeReason = ['inappropriate', 'harassment', 'spam', 'other'].includes(rawReason.toLowerCase().trim())
          ? rawReason.toLowerCase().trim()
          : 'other';
        const details = (prompt('Optional details (up to 200 characters):') || '').slice(0, 200);

        try {
          const { initFirebase } = await import('../../config/firebase.js');
          const fb = await initFirebase();
          const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
          await setDoc(doc(fb.db, 'reportQueue', `gallery_${galleryId}_${user.uid}`), {
            kind: 'gallery',
            classId: itemClass.slice(0, 30),
            targetId: galleryId.slice(0, 100),
            targetPath: `gallery/${galleryId}`.slice(0, 200),
            reporterUid: user.uid,
            reason: safeReason,
            details,
            createdAt: serverTimestamp()
          });
          showToast('Thank you. Photo reported to administration.', 'info');
        } catch (err) {
          console.error('Gallery report failed:', err);
          showToast('Could not submit report.', 'error');
        }
        return;
      }

      if (!delBtn) return;

      const id = delBtn.dataset.id;
      const caption = delBtn.dataset.caption || '';
      const ownerUid = delBtn.dataset.owner || '';
      const user = authService.getCurrentUser();
      const isAdmin = Boolean(store.get('isAdmin'));

      if (!user) {
        showToast('Please sign in to delete photos.', 'error');
        return;
      }

      if (!isAdmin && user.uid !== ownerUid) {
        showToast('You can only delete your own photos.', 'error');
        return;
      }

      if (!confirm('Are you sure you want to delete this campus photo?')) return;

      try {
        await deleteDocument('gallery', id);
        if (isAdmin && user.uid !== ownerUid) {
          await logAdminAction('DELETE_GALLERY', id, caption.slice(0, 50));
        }
        showToast('Photo deleted from gallery.', 'info');
      } catch (err) {
        console.error('Failed to delete gallery item:', err);
        showToast('Could not delete photo.', 'error');
      }
    });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', async () => {
      if (activeSub && activeSub.loadMore) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = 'Loading...';
        await activeSub.loadMore();
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load More Pictures';
      }
    });
  }

  if (addPhotoForm) {
    addPhotoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = authService.getCurrentUser();
      if (!user) {
        showToast('Please sign in to add a photo.', 'error');
        return;
      }

      const caption = document.getElementById('photo-title').value.trim();
      let url = document.getElementById('photo-url').value.trim();

      if (caption.length > 140) {
        showToast('Caption cannot exceed 140 characters.', 'error');
        return;
      }

      if (!url.startsWith('https://')) {
        showToast('Image URL must start with https:// for security.', 'error');
        return;
      }

      if (url.length > 500) {
        showToast('Image URL is too long (maximum 500 characters).', 'error');
        return;
      }

      const payload = {
        classId: store.get('currentClassId') || '',
        ownerUid: user.uid,
        caption,
        url
      };

      try {
        await createDocument('gallery', payload);
        addPhotoForm.reset();
        if (addPhotoModal) addPhotoModal.classList.remove('active');
        showToast('Photo added to gallery.', 'success');
      } catch (err) {
        console.error('Failed to post photo:', err);
        showToast(`Error: ${err.message}`, 'error');
      }
    });
  }

  // P0-6: Screen-scoped subscription on school screen (school-wide campus gallery)
  async function startSubscription() {
    activeSub = await subscribeClassCollection('gallery', '', (_items, hasMore) => {
      render();
      if (loadMoreContainer) {
        loadMoreContainer.classList.toggle('hidden', !hasMore);
      }
    });
  }

  function stopSubscription() {
    unsubscribeCollection('gallery');
    activeSub = null;
    if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
  }

  router.registerScreenHook('school', {
    onEnter: startSubscription,
    onLeave: stopSubscription
  });

  store.subscribe('currentClassId', () => {
    if (router.activeScreenId === 'school') startSubscription();
  });
}
