import { auth, isFirebaseConfigured, initFirebase } from '../../config/firebase.js';
import { store } from '../store/store.js';
import { showToast } from '../../components/toast/toast.js';

class AuthService {
  constructor() {
    this.user = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;

    const firebase = await initFirebase();
    if (firebase && firebase.auth) {
      const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      const { doc, getDoc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

      onAuthStateChanged(firebase.auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const userRef = doc(firebase.db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);

            let userData = null;
            if (!userSnap.exists()) {
              userData = {
                displayName: firebaseUser.displayName || 'Classmate',
                photoURL: firebaseUser.photoURL || '',
                classId: '',
                role: 'member',
                points: 0,
                banned: false,
                createdAt: serverTimestamp()
              };
              await setDoc(userRef, userData);
            } else {
              userData = userSnap.data();
            }

            // Check admins/{uid} existence
            const adminRef = doc(firebase.db, 'admins', firebaseUser.uid);
            const adminSnap = await getDoc(adminRef);
            const isAdmin = adminSnap.exists();

            this.setUser({
              uid: firebaseUser.uid,
              displayName: userData.displayName || firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: userData.photoURL || firebaseUser.photoURL,
              classId: userData.classId || '',
              role: userData.role || 'member',
              banned: userData.banned || false,
              isAdmin
            });
          } catch (err) {
            console.error('[SchoolHub Auth Profile Load Error]', err);
            this.setUser(null);
          }
        } else {
          this.setUser(null);
        }
      });
    } else {
      // Offline / Preview fallback from localStorage
      const saved = localStorage.getItem('schoolhub_user');
      if (saved) {
        try { this.setUser(JSON.parse(saved)); } catch { this.setUser(null); }
      }
    }
  }

  setUser(userData) {
    this.user = userData;
    store.set('user', userData, true);
    store.set('isAdmin', !!(userData && userData.isAdmin), false);
    if (userData && userData.classId) {
      store.set('currentClassId', userData.classId, false);
    }
    this.updateWriteControlsVisibility();
  }

  updateWriteControlsVisibility() {
    const isAuthed = !!this.user;
    document.querySelectorAll('.auth-required').forEach(el => {
      if (isAuthed) {
        el.classList.remove('hidden-auth');
      } else {
        el.classList.add('hidden-auth');
      }
    });

    document.querySelectorAll('.anon-prompt').forEach(el => {
      if (isAuthed) {
        el.classList.add('hidden-auth');
      } else {
        el.classList.remove('hidden-auth');
      }
    });
  }

  async signInWithGoogle() {
    const firebase = await initFirebase();
    if (firebase && firebase.auth) {
      const { GoogleAuthProvider, signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(firebase.auth, provider);
        return result.user;
      } catch (err) {
        console.error('Google Sign-In failed:', err);
        showToast(`Sign in error: ${err.message}`, 'error');
        throw err;
      }
    } else {
      const name = prompt('Preview Mode: Enter your name for local testing:');
      if (!name) return null;
      const user = {
        uid: `local-${Date.now()}`,
        displayName: name,
        email: `${name.toLowerCase().replace(/\s+/g, '')}@student.aps`,
        photoURL: '',
        classId: '10-b',
        role: 'member',
        isAdmin: false
      };
      this.setUser(user);
      return user;
    }
  }

  async signOut() {
    const firebase = await initFirebase();
    if (firebase && firebase.auth) {
      const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      await signOut(firebase.auth);
    }
    localStorage.removeItem('schoolhub_user');
    this.setUser(null);
  }

  getCurrentUser() {
    return this.user;
  }

  isAuthenticated() {
    return !!this.user;
  }
}

export const authService = new AuthService();
