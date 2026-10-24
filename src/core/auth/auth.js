/**
 * Auth service. Handles Google sign-in, sign-out and profile loading.
 *
 * P0-8: Retry profile load up to 3 times before showing the error banner.
 * P0-9: Removed ADMIN_EMAILS, removed preview-mode local user that sets classId.
 */

import { initFirebase } from '../../config/firebase.js';
import { store } from '../store/store.js';
import { showToast } from '../../components/toast/toast.js';

const MAX_PROFILE_RETRIES = 3;
const RETRY_DELAY_MS = 1200;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Show the retry/error banner (P0-8). */
function showProfileErrorBanner(onRetry) {
  let banner = document.getElementById('profile-error-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'profile-error-banner';
    banner.className = 'error-banner banner-error';
    document.body.prepend(banner);
  }
  banner.innerHTML = '';

  const msg = document.createElement('span');
  msg.textContent = 'Could not load your profile. Check your connection.';

  const btn = document.createElement('button');
  btn.className = 'btn btn-sm btn-outline';
  btn.textContent = 'Retry';
  btn.addEventListener('click', () => {
    banner.classList.add('hidden');
    onRetry();
  });

  banner.appendChild(msg);
  banner.appendChild(btn);
  banner.classList.remove('hidden');
}

function hideProfileErrorBanner() {
  const banner = document.getElementById('profile-error-banner');
  if (banner) banner.classList.add('hidden');
}

class AuthService {
  constructor() {
    this.user = null;
    this.initialized = false;
    this._userUnsub = null;
    /** Resolves when the first auth state is known (true = resolved). */
    this._authReady = new Promise(res => { this._resolveAuthReady = res; });
  }

  /** Returns a promise that resolves once auth state is determined. */
  ready() {
    return this._authReady;
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;

    const firebase = await initFirebase();

    if (firebase && firebase.auth) {
      const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');

      onAuthStateChanged(firebase.auth, async (firebaseUser) => {
        if (this._userUnsub) {
          this._userUnsub();
          this._userUnsub = null;
        }

        if (firebaseUser) {
          await this._loadProfile(firebase, firebaseUser, 1);
        } else {
          this.setUser(null);
          this._resolveAuthReady(true);
        }
      });
    } else {
      // Firebase not configured — no preview session; user is signed out.
      this.setUser(null);
      this._resolveAuthReady(true);
    }
  }

  /** Load user profile with retry (P0-8). Keeps Google session on failure. */
  async _loadProfile(firebase, firebaseUser, attempt) {
    try {
      const { doc, getDoc, setDoc, serverTimestamp, onSnapshot } =
        await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

      const userRef = doc(firebase.db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      let userData;
      if (!userSnap.exists()) {
        const rawPhoto = firebaseUser.photoURL || '';
        const safePhotoURL = (rawPhoto.length <= 300 && /^https:\/\/lh3\.googleusercontent\.com\/.*/.test(rawPhoto)) ? rawPhoto : '';
        userData = {
          displayName: (firebaseUser.displayName || 'Classmate').slice(0, 80),
          photoURL: safePhotoURL,
          classId: '',
          role: 'member',
          points: 0,
          banned: false,
          status: 'needs_gate',
          onboardingStep: 0,
          createdAt: serverTimestamp()
        };
        await setDoc(userRef, userData);
      } else {
        userData = userSnap.data();
      }

      // Confirm admin status strictly via admins/{uid} document (Phase A1)
      const adminRef = doc(firebase.db, 'admins', firebaseUser.uid);
      let adminSnap = null;
      try {
        adminSnap = await getDoc(adminRef);
      } catch (err) {
        console.warn('[Auth] Check admin doc warning:', err);
      }

      const isAdmin = !!(adminSnap && adminSnap.exists());
      store.set('profileLoadFailed', false, false);
      hideProfileErrorBanner();

      // Admins always get treated as active even if status field is missing/wrong
      const effectiveStatus = isAdmin
        ? 'active'
        : (userData.status || 'needs_gate');

      this.setUser({
        uid: firebaseUser.uid,
        displayName: userData.displayName || firebaseUser.displayName || 'Classmate',
        email: firebaseUser.email,
        photoURL: userData.photoURL || firebaseUser.photoURL || '',
        classId: userData.classId || '',
        role: isAdmin ? 'admin' : (userData.role || 'member'),
        banned: userData.banned || false,
        status: effectiveStatus,
        onboardingStep: userData.onboardingStep || 0,
        profileDeletedReason: userData.profileDeletedReason || null,
        mutedUntil: userData.mutedUntil || null,
        photoRemovedNotice: userData.photoRemovedNotice || null,
        isAdmin
      });

      if (userData.photoRemovedNotice) {
        showToast(userData.photoRemovedNotice, 'error');
      }

      // Listen for real-time status/ban changes (multi-tab sync, admin actions)
      if (this._userUnsub) {
        this._userUnsub();
      }
      this._userUnsub = onSnapshot(userRef, (snap) => {
        if (!snap.exists()) return;
        const currentData = snap.data();
        const currentEffectiveStatus = isAdmin
          ? 'active'
          : (currentData.status || 'needs_gate');
        this.setUser({
          uid: firebaseUser.uid,
          displayName: currentData.displayName || firebaseUser.displayName || 'Classmate',
          email: firebaseUser.email,
          photoURL: currentData.photoURL || firebaseUser.photoURL || '',
          classId: currentData.classId || '',
          role: currentData.role || 'member',
          banned: currentData.banned || false,
          status: currentEffectiveStatus,
          onboardingStep: currentData.onboardingStep || 0,
          profileDeletedReason: currentData.profileDeletedReason || null,
          mutedUntil: currentData.mutedUntil || null,
          photoRemovedNotice: currentData.photoRemovedNotice || null,
          isAdmin
        });
      });
    } catch (err) {
      console.error(`[Auth] Profile load attempt ${attempt} failed:`, err);

      if (attempt < MAX_PROFILE_RETRIES) {
        await delay(RETRY_DELAY_MS * attempt);
        return this._loadProfile(firebase, firebaseUser, attempt + 1);
      }

      // All retries exhausted — show banner, keep Google session (P0-8, E5)
      store.set('profileLoadFailed', true);
      showProfileErrorBanner(() => this._loadProfile(firebase, firebaseUser, 1));
      if (window.location.hash !== '#loading-failed') {
        window.location.hash = '#loading-failed';
      }
      // Do NOT call setUser(null) — that would sign the person out silently
    }
    this._resolveAuthReady(true);
  }

  setUser(userData) {
    this.user = userData;
    store.set('user', userData, false);
    store.set('isAdmin', !!(userData && userData.isAdmin), false);
    if (userData && userData.classId) {
      store.set('currentClassId', userData.classId, false);
    }
    this._updateWriteControlsVisibility();
    // Resolve authReady in case setUser is called from a non-retry path
    if (this._resolveAuthReady) {
      this._resolveAuthReady(true);
    }
  }

  _updateWriteControlsVisibility() {
    const isAuthed = !!this.user;
    document.querySelectorAll('.auth-required').forEach(el => {
      el.classList.toggle('hidden-auth', !isAuthed);
    });
    document.querySelectorAll('.anon-prompt').forEach(el => {
      el.classList.toggle('hidden-auth', isAuthed);
    });
  }

  async signInWithGoogle() {
    const firebase = await initFirebase();
    if (!firebase || !firebase.auth) {
      showToast('Firebase is not configured. Cannot sign in.', 'error');
      throw new Error('Firebase not configured');
    }
    const { GoogleAuthProvider, signInWithPopup } =
      await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(firebase.auth, provider);
      return result.user;
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      showToast(`Sign-in failed: ${err.message}`, 'error');
      throw err;
    }
  }

  async signOut() {
    if (this._userUnsub) {
      this._userUnsub();
      this._userUnsub = null;
    }
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('local_') || k.startsWith('schoolhub_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (storageErr) {
      console.warn('[Auth] Error clearing localStorage on sign out:', storageErr);
    }
    const firebase = await initFirebase();
    if (firebase && firebase.auth) {
      const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      await signOut(firebase.auth);
    }
    this.setUser(null);
    store.set('isAdmin', false, false);
    store.set('profileLoadFailed', false, false);
  }

  async claimAdminAccess(_unused) {
    showToast('Admin access is managed by the site owner in Firebase Console.', 'info');
    return false;
  }

  getCurrentUser() {
    return this.user;
  }

  isAuthenticated() {
    return !!this.user;
  }
}

export const authService = new AuthService();
