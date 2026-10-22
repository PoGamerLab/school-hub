import { db, isFirebaseConfigured, initFirebase } from '../../config/firebase.js';
import { store } from '../store/store.js';

let activeSubscriptions = new Map();

/**
 * Ensures Firebase is initialized before executing operations
 */
async function ensureDb() {
  if (isFirebaseConfigured() && db) return db;
  const res = await initFirebase();
  return res ? res.db : null;
}

/**
 * Screen-scoped, class-filtered subscription with limit(20)
 * Returns unsubscribe function.
 */
export async function subscribeClassCollection(collectionName, classId, onUpdate, limitCount = 20) {
  // Teardown previous subscription for this collection if active
  unsubscribeCollection(collectionName);

  const database = await ensureDb();
  if (!database) {
    // Local / Offline fallback: subscribe to store
    const storeUnsub = store.subscribe(collectionName, (data) => {
      const filtered = Array.isArray(data) 
        ? data.filter(item => !classId || item.classId === classId || item.classId === undefined)
        : data;
      onUpdate(filtered);
    });
    activeSubscriptions.set(collectionName, storeUnsub);
    const initial = store.get(collectionName) || [];
    onUpdate(Array.isArray(initial) ? initial.filter(item => !classId || item.classId === classId) : initial);
    return () => unsubscribeCollection(collectionName);
  }

  try {
    const { collection, query, where, limit, orderBy, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    
    let q = query(
      collection(database, collectionName),
      where('classId', '==', classId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      store.set(collectionName, items, false);
      onUpdate(items);
    }, (err) => {
      console.error(`[Firestore Subscription Error: ${collectionName}]`, err);
    });

    activeSubscriptions.set(collectionName, unsub);
    return unsub;
  } catch (err) {
    console.error(`Failed to setup query for ${collectionName}:`, err);
    return () => {};
  }
}

/**
 * Unsubscribes a screen-scoped collection listener
 */
export function unsubscribeCollection(collectionName) {
  if (activeSubscriptions.has(collectionName)) {
    const unsub = activeSubscriptions.get(collectionName);
    if (typeof unsub === 'function') unsub();
    activeSubscriptions.delete(collectionName);
  }
}

/**
 * Creates a new document with forced server timestamp
 */
export async function createDocument(collectionName, data, customId = null) {
  const database = await ensureDb();
  if (!database) {
    const id = customId || `${collectionName}-${Date.now()}`;
    const newItem = { id, ...data, createdAt: Date.now() };
    store.update(collectionName, list => [newItem, ...(list || [])]);
    return id;
  }

  const { collection, doc, addDoc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const payload = {
    ...data,
    createdAt: serverTimestamp()
  };

  if (customId) {
    const docRef = doc(database, collectionName, customId);
    await setDoc(docRef, payload);
    return customId;
  } else {
    const colRef = collection(database, collectionName);
    const docRef = await addDoc(colRef, payload);
    return docRef.id;
  }
}

/**
 * Updates specified fields in an existing document
 */
export async function updateDocument(collectionName, docId, updates) {
  const database = await ensureDb();
  if (!database) {
    store.update(collectionName, list => (list || []).map(item => item.id === docId ? { ...item, ...updates } : item));
    return;
  }

  const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const docRef = doc(database, collectionName, docId);
  await updateDoc(docRef, updates);
}

/**
 * Atomically sets or removes an own key in a map (votes.{uid}, reactions.{uid}, reports.{uid})
 */
export async function setOwnMapKey(collectionName, docId, mapName, key, value) {
  const database = await ensureDb();
  if (!database) {
    store.update(collectionName, list => (list || []).map(item => {
      if (item.id === docId) {
        const map = { ...(item[mapName] || {}) };
        if (value === null || value === undefined) {
          delete map[key];
        } else {
          map[key] = value;
        }
        return { ...item, [mapName]: map };
      }
      return item;
    }));
    return;
  }

  const { doc, updateDoc, deleteField } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const docRef = doc(database, collectionName, docId);
  const fieldPath = `${mapName}.${key}`;

  if (value === null || value === undefined) {
    await updateDoc(docRef, { [fieldPath]: deleteField() });
  } else {
    await updateDoc(docRef, { [fieldPath]: value });
  }
}

/**
 * Deletes a document by ID
 */
export async function deleteDocument(collectionName, docId) {
  const database = await ensureDb();
  if (!database) {
    store.update(collectionName, list => (list || []).filter(item => item.id !== docId));
    return;
  }

  const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const docRef = doc(database, collectionName, docId);
  await deleteDoc(docRef);
}
