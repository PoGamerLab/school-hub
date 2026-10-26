/**
 * Profile Photo Upload & Cropping Modal (Phase D).
 */

import { initFirebase } from '../../config/firebase.js';
import { authService } from '../../core/auth/auth.js';
import { store } from '../../core/store/store.js';
import { showToast } from '../../components/toast/toast.js';
import { drawCropCanvas, exportCompressedJpeg } from './photoUpload.crop.js';

let cropImage = null;
let cropZoom = 1;
let cropOffsetX = 0;
let cropOffsetY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

export function openPhotoUploadModal(_student) {
  const user = authService.getCurrentUser();
  if (!user) return showToast('Please sign in to change your profile picture.', 'error');

  let modal = document.getElementById('photo-upload-modal');
  if (!modal) {
    modal = createPhotoModalElement();
    document.body.appendChild(modal);
    attachPhotoModalEvents(modal);
  }
  resetCropState();
  modal.classList.remove('hidden');
}

function createPhotoModalElement() {
  const modal = document.createElement('div');
  modal.id = 'photo-upload-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box photo-modal-box">
      <div class="modal-header">
        <h3>Update Profile Picture</h3>
        <button class="modal-close" id="close-photo-modal-btn">&times;</button>
      </div>
      <div class="photo-modal-body">
        <label class="btn btn-outline btn-sm photo-upload-label" for="photo-file-input">📁 Select Image (JPG, PNG, WebP &middot; Max 5MB)</label>
        <input type="file" id="photo-file-input" accept="image/jpeg,image/png,image/webp" class="hidden-file-input">
        <div class="photo-crop-wrapper hidden" id="photo-crop-wrapper">
          <div class="photo-canvas-container" id="photo-canvas-container">
            <canvas id="photo-crop-canvas" width="280" height="280"></canvas>
            <div class="photo-crop-circle-mask"></div>
          </div>
          <div class="photo-zoom-control">
            <span>Zoom</span>
            <input type="range" id="photo-zoom-slider" min="1" max="3" step="0.05" value="1">
          </div>
          <p class="field-hint">Drag image to position inside the circular preview.</p>
        </div>
        <div class="photo-options-divider"><span>OR</span></div>
        <button class="btn btn-outline btn-sm btn-full" id="use-google-photo-btn">📷 Use My Google Account Photo</button>
        <div class="photo-modal-actions">
          <button class="btn btn-danger btn-sm" id="remove-photo-btn">Remove Photo</button>
          <div class="spacer"></div>
          <button class="btn btn-outline btn-sm" id="cancel-photo-btn">Cancel</button>
          <button class="btn btn-primary btn-sm" id="save-photo-btn" disabled>Save Photo</button>
        </div>
      </div>
    </div>`;
  return modal;
}

function resetCropState() {
  cropImage = null;
  cropZoom = 1;
  cropOffsetX = 0;
  cropOffsetY = 0;
  document.getElementById('photo-crop-wrapper')?.classList.add('hidden');
  const saveBtn = document.getElementById('save-photo-btn');
  if (saveBtn) saveBtn.disabled = true;
  const zoomSlider = document.getElementById('photo-zoom-slider');
  if (zoomSlider) zoomSlider.value = '1';
  const fileInput = document.getElementById('photo-file-input');
  if (fileInput) fileInput.value = '';
}

function renderCanvas() {
  const canvas = document.getElementById('photo-crop-canvas');
  drawCropCanvas(canvas, cropImage, cropZoom, cropOffsetX, cropOffsetY);
}

function attachPhotoModalEvents(modal) {
  const closeModal = () => modal.classList.add('hidden');
  modal.querySelector('#close-photo-modal-btn')?.addEventListener('click', closeModal);
  modal.querySelector('#cancel-photo-btn')?.addEventListener('click', closeModal);
  modal.querySelector('#photo-file-input')?.addEventListener('change', handleFileSelect);

  modal.querySelector('#photo-zoom-slider')?.addEventListener('input', (e) => {
    cropZoom = parseFloat(e.target.value) || 1;
    renderCanvas();
  });

  const canvasContainer = modal.querySelector('#photo-canvas-container');
  const startDrag = (cx, cy) => {
    if (!cropImage) return;
    isDragging = true;
    dragStartX = cx - cropOffsetX;
    dragStartY = cy - cropOffsetY;
  };
  const moveDrag = (cx, cy) => {
    if (!isDragging) return;
    cropOffsetX = cx - dragStartX;
    cropOffsetY = cy - dragStartY;
    renderCanvas();
  };

  canvasContainer?.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
  window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
  window.addEventListener('mouseup', () => { isDragging = false; });

  canvasContainer?.addEventListener('touchstart', (e) => {
    if (e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (e.touches[0]) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('touchend', () => { isDragging = false; });

  modal.querySelector('#save-photo-btn')?.addEventListener('click', handleSaveUploadedPhoto);
  modal.querySelector('#remove-photo-btn')?.addEventListener('click', handleRemovePhoto);
  modal.querySelector('#use-google-photo-btn')?.addEventListener('click', handleUseGooglePhoto);
}

function handleFileSelect(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    showToast('Invalid format. Please upload JPG, PNG, or WebP.', 'error');
    e.target.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image too large. Max size is 5 MB.', 'error');
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      cropImage = img;
      cropZoom = 1;
      cropOffsetX = 0;
      cropOffsetY = 0;
      document.getElementById('photo-crop-wrapper')?.classList.remove('hidden');
      const saveBtn = document.getElementById('save-photo-btn');
      if (saveBtn) saveBtn.disabled = false;
      renderCanvas();
    };
    img.onerror = () => showToast('Could not decode image.', 'error');
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

async function handleSaveUploadedPhoto() {
  const user = authService.getCurrentUser();
  const canvas = document.getElementById('photo-crop-canvas');
  if (!user || !cropImage || !canvas) return;

  const saveBtn = document.getElementById('save-photo-btn');
  if (saveBtn) saveBtn.disabled = true;

  try {
    const largeJpeg = exportCompressedJpeg(canvas, cropImage, 256, 38000, 0.78);
    const thumbJpeg = exportCompressedJpeg(canvas, cropImage, 96, 7500, 0.70);

    if (!largeJpeg || !thumbJpeg) {
      showToast('Image could not be compressed under size limits.', 'error');
      if (saveBtn) saveBtn.disabled = false;
      return;
    }

    const fb = await initFirebase();
    const { doc, writeBatch, serverTimestamp, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const batch = writeBatch(fb.db);
    batch.set(doc(fb.db, 'avatars', user.uid), { photo: largeJpeg, ownerUid: user.uid, updatedAt: serverTimestamp() });
    batch.update(doc(fb.db, 'students', user.uid), {
      photoSource: 'upload',
      photoThumb: thumbJpeg,
      googlePhotoUrl: '',
      photoUpdatedAt: serverTimestamp()
    });
    await batch.commit();

    updateLocalStudentPhoto('upload', thumbJpeg, null);
    showToast('Profile photo updated successfully!', 'success');
    document.getElementById('photo-upload-modal')?.classList.add('hidden');
  } catch (err) {
    console.error('Save photo error:', err);
    let isRateLimited = false;
    try {
      if (err?.code === 'permission-denied') {
        const fb = await initFirebase();
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const avSnap = await getDoc(doc(fb.db, 'avatars', user.uid));
        if (avSnap.exists()) {
          const upAt = avSnap.data()?.updatedAt?.toDate?.() || new Date(avSnap.data()?.updatedAt);
          if (Date.now() - upAt.getTime() < 3600000) {
            isRateLimited = true;
          }
        }
      }
    } catch (_) {}

    showToast(isRateLimited ? 'You can only update your profile picture once every hour.' : 'Could not save photo. Try again.', 'error');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

async function handleUseGooglePhoto() {
  const user = authService.getCurrentUser();
  if (!user) return;
  const googlePhoto = user.photoURL;
  if (!googlePhoto?.startsWith('https://lh3.googleusercontent.com/')) {
    return showToast('No valid Google profile picture found.', 'error');
  }

  if (!confirm('Share Google Photo:\nYour Google photo will be visible to all verified school members. Proceed?')) return;

  try {
    const fb = await initFirebase();
    const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    await updateDoc(doc(fb.db, 'students', user.uid), { photoSource: 'google', googlePhotoUrl: googlePhoto.slice(0, 300), photoUpdatedAt: serverTimestamp() });
    updateLocalStudentPhoto('google', null, googlePhoto);
    showToast('Google profile picture activated.', 'success');
    document.getElementById('photo-upload-modal')?.classList.add('hidden');
  } catch (err) {
    showToast('Failed to set Google photo.', 'error');
  }
}

async function handleRemovePhoto() {
  const user = authService.getCurrentUser();
  if (!user || !confirm('Remove your profile photo and revert to initials?')) return;

  try {
    const fb = await initFirebase();
    const { doc, writeBatch, deleteField } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const batch = writeBatch(fb.db);
    batch.delete(doc(fb.db, 'avatars', user.uid));
    batch.update(doc(fb.db, 'students', user.uid), { photoSource: 'none', photoThumb: deleteField(), googlePhotoUrl: deleteField() });
    await batch.commit();

    updateLocalStudentPhoto('none', null, null);
    showToast('Profile photo removed.', 'info');
    document.getElementById('photo-upload-modal')?.classList.add('hidden');
  } catch (err) {
    showToast('Failed to remove photo.', 'error');
  }
}

function updateLocalStudentPhoto(source, thumb, googleUrl) {
  const user = authService.getCurrentUser();
  if (!user) return;
  const students = store.get('students') || [];
  const idx = students.findIndex(s => (s.id || s.uid) === user.uid || s.ownerUid === user.uid);
  if (idx !== -1) {
    students[idx].photoSource = source;
    if (thumb) students[idx].photoThumb = thumb; else delete students[idx].photoThumb;
    if (googleUrl) students[idx].googlePhotoUrl = googleUrl; else delete students[idx].googlePhotoUrl;
    store.set('students', [...students], true);
  }
}
