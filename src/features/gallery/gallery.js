import { store } from '../../core/store/store.js';
import { renderGalleryCard } from './gallery.render.js';
import { generateId } from '../../core/utils/ids.js';
import { showToast } from '../../components/toast/toast.js';

export function initGallery() {
  const container = document.getElementById('gallery-container');
  const addPhotoForm = document.getElementById('add-photo-form');
  const addPhotoModal = document.getElementById('add-photo-modal');

  function render() {
    if (!container) return;
    const gallery = store.get('gallery') || [];
    if (gallery.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
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
    addPhotoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const caption = document.getElementById('photo-title').value.trim();
      const url = document.getElementById('photo-url').value.trim() || 'images/apsacs-logo.png';

      const newPhoto = {
        id: generateId('gal'),
        caption,
        url
      };

      store.update('gallery', list => [newPhoto, ...list]);
      addPhotoForm.reset();
      if (addPhotoModal) addPhotoModal.classList.remove('active');
      showToast('Photo added to gallery.', 'success');
    });
  }

  store.subscribe('gallery', () => {
    render();
  });

  render();
}
