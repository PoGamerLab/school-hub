/**
 * Firebase Initialization & Modular Service Wrapper
 */

// Paste your Firebase Web App credentials from console.firebase.google.com here:
export const firebaseConfig = {
  apiKey: "AIzaSyCqU3d2zWHpqrzC_Ji8_vriJGwd5q39xmw",
  authDomain: "school-hub-be296.firebaseapp.com",
  projectId: "school-hub-be296",
  storageBucket: "school-hub-be296.firebasestorage.app",
  messagingSenderId: "315184359214",
  appId: "1:315184359214:web:ee2f74b524c5a6826cfcbf",
  measurementId: "G-DSC7JY2X3T"
};

let app = null;
let auth = null;
let db = null;
let isConfigured = false;

export function isFirebaseConfigured() {
  return isConfigured;
}

export function showAppError(message, isWarning = false) {
  const banner = document.getElementById('app-error-banner');
  if (banner) {
    banner.textContent = message;
    banner.classList.remove('hidden');
    banner.className = isWarning ? 'error-banner banner-warning' : 'error-banner banner-error';
  } else {
    console.warn('[SchoolHub Error Banner]', message);
  }
}

export function hideAppError() {
  const banner = document.getElementById('app-error-banner');
  if (banner) banner.classList.add('hidden');
}

export async function initFirebase() {
  if (isConfigured && app) return { app, auth, db };

  // Check if placeholder API key is still present
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('YOUR_API_KEY')) {
    console.info('[SchoolHub] Firebase credentials unset. Running in preview/local mode.');
    showAppError('Preview Mode: Firebase is unconfigured. Real-time multi-user syncing is paused until project keys are set in src/config/firebase.js', true);
    return null;
  }

  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    isConfigured = true;

    hideAppError();
    console.log('[SchoolHub] Firebase successfully connected.');
    return { app, auth, db };
  } catch (err) {
    console.error('[SchoolHub] Firebase connection failed:', err);
    showAppError(`Firebase connection error: ${err.message || 'Unable to connect to cloud database.'}`);
    isConfigured = false;
    return null;
  }
}

export { app, auth, db, isConfigured };
