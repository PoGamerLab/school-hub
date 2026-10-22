import { store } from '../../core/store/store.js';
import { authService } from '../../core/auth/auth.js';
import { renderGalleryCard } from './gallery.render.js';
import { showToast } from '../../components/toast/toast.js';
import { subscribeClassCollection, createDocument } from '../../core/db/firestore.js';

export function initGallery() {
  const container = document.getElementById('gallery-container');
  const addPhotoForm = document.getElementById('add-photo-form');
  const addPhotoModal = document.getElementById('add-photo-modal');

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
    container.innerHTML = gallery.map(item => renderGalleryCard(item)).join('');
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
        classId: store.get('currentClassId') || '10-b',
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

  function attachSubscription() {
    const classId = store.get('currentClassId') || '10-b';
    subscribeClassCollection('gallery', classId, (list) => {
      store.set('gallery', list, false);
      render();
    });
  }

  store.subscribe('currentClassId', attachSubscription);
  attachSubscription();
}
