/**
 * Firebase Initialization & Modular Service Wrapper
 * Supports Firebase v10/v11 ESM with graceful local fallback if credentials are unset.
 */

// Paste your Firebase Web App credentials from console.firebase.google.com here:
export const firebaseConfig = {
  apiKey: "AIzaSy_YOUR_API_KEY_HERE",
  authDomain: "school-hub-apsacs.firebaseapp.com",
  projectId: "school-hub-apsacs",
  storageBucket: "school-hub-apsacs.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

let app = null;
let auth = null;
let db = null;
let isConfigured = false;

// Check if credentials have been replaced with real project keys
if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('YOUR_API_KEY')) {
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const { 
      getFirestore, 
      collection, 
      doc, 
      onSnapshot, 
      addDoc, 
      setDoc, 
      updateDoc, 
      deleteDoc, 
      query, 
      where 
    } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    isConfigured = true;

    console.log('[SchoolHub] Firebase successfully connected.');
  } catch (err) {
    console.warn('[SchoolHub] Firebase initialization skipped or failed:', err);
    isConfigured = false;
  }
} else {
  console.info('[SchoolHub] Running in Local Mode. Add your Firebase keys in src/config/firebase.js to sync live across devices.');
}

export { app, auth, db, isConfigured };
