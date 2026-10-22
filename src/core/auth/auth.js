import { auth, isConfigured } from '../../config/firebase.js';
import { store } from '../store/store.js';
import { ADMIN_EMAILS } from '../../config/constants.js';

class AuthService {
  constructor() {
    this.user = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;

    if (isConfigured && auth) {
      const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          const isAdmin = ADMIN_EMAILS.includes(firebaseUser.email);
          this.setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Class Member',
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            isAdmin
          });
        } else {
          this.setUser(null);
        }
      });
    } else {
      // Local fallback: check localStorage for saved session
      const savedUser = localStorage.getItem('apsacs_local_user');
      if (savedUser) {
        try {
          this.setUser(JSON.parse(savedUser));
        } catch {
          this.setUser(null);
        }
      }
    }
  }

  setUser(userData) {
    this.user = userData;
    store.set('user', userData, false);
    store.set('isAdmin', !!(userData && userData.isAdmin), false);
  }

  async signInWithGoogle() {
    if (isConfigured && auth) {
      const { GoogleAuthProvider, signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
      } catch (err) {
        console.error('Google Sign-In failed:', err);
        throw err;
      }
    } else {
      // Simulated sign-in for local development
      const name = prompt('Enter your name for student actions:') || 'Class Member';
      const localUser = {
        uid: `local-${Date.now()}`,
        displayName: name,
        email: `${name.toLowerCase().replace(/\s+/g, '')}@student.local`,
        photoURL: '',
        isAdmin: true
      };
      localStorage.setItem('apsacs_local_user', JSON.stringify(localUser));
      this.setUser(localUser);
      return localUser;
    }
  }

  async signOut() {
    if (isConfigured && auth) {
      const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      await signOut(auth);
    } else {
      localStorage.removeItem('apsacs_local_user');
    }
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
