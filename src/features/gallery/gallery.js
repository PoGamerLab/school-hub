import { store } from '../../core/store/store.js';
import { router } from '../../core/router/router.js';
import { authService } from '../../core/auth/auth.js';
import { renderGalleryCard } from './gallery.render.js';
import { showToast } from '../../components/toast/toast.js';
import { subscribeClassCollection, unsubscribeCollection, createDocument } from '../../core/db/firestore.js';

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
    container.innerHTML = gallery.map(item => renderGalleryCard(item)).join('');
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
