/**
 * Firestore data layer.
 *
 * P0-4: Query errors are surfaced visibly (not console-only).
 * P0-5: Page size 30 for students, 20 for others.
 *        subscribeClassCollection returns { unsubscribe, loadMore, hasMore }.
 * P0-6: Subscriptions are managed per screen; the router calls
 *        unsubscribeCollection when a screen is exited.
 */

import { initFirebase } from '../../config/firebase.js';
import { store } from '../store/store.js';
import { LIMITS } from '../../config/constants.js';

/** Map of collectionName → Firestore unsubscribe function */
const activeSubscriptions = new Map();

async function ensureDb() {
  const res = await initFirebase();
  return res ? res.db : null;
}

/** Show a visible error on the current screen container. */
function showListError(collectionName, message) {
  const ids = {
    students:    '.grid',
    memories:    '#memories-container',
    gallery:     '#gallery-container',
    teachers:    '#teachers-container',
    superlatives:'#superlatives-container'
  };
  const selector = ids[collectionName];
  const el = selector ? document.querySelector(selector) : null;
  if (el) {
    el.innerHTML = `<div class="empty-state full-width-empty">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">Could not load data</div>
      <div class="empty-state-desc">${message}</div>
    </div>`;
  }
  console.error(`[Firestore:${collectionName}]`, message);
}

/**
 * Subscribe to a class-scoped collection with live updates (first page).
 *
 * Returns { loadMore, unsubscribe }
 *   loadMore() → fetches the next page via getDocs (cursor-based, P0-5).
 *   hasMore    → getter boolean.
 *
 * Callers append to the local list when loadMore() resolves.
 */
export async function subscribeClassCollection(collectionName, classId, onUpdate) {
  unsubscribeCollection(collectionName);

  const pageSize = collectionName === 'students'
    ? LIMITS.PAGE_SIZE_STUDENTS
    : LIMITS.PAGE_SIZE_DEFAULT;

  const database = await ensureDb();

  if (!database) {
    // Offline fallback — mirror local store, no pagination
    const storeUnsub = store.subscribe(collectionName, (data) => {
      const filtered = Array.isArray(data)
        ? data.filter(item => !classId || item.classId === classId)
        : [];
      onUpdate(filtered, false);
    });
    activeSubscriptions.set(collectionName, storeUnsub);

    const initial = (store.get(collectionName) || [])
      .filter(item => !classId || item.classId === classId);
    onUpdate(initial, false);
    return { loadMore: async () => {}, hasMore: false };
  }

  const { collection, query, where, limit, orderBy, onSnapshot, getDocs, startAfter } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  const baseQuery = () => query(
    collection(database, collectionName),
    where('classId', '==', classId),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  let lastVisible = null;
  let _hasMore = true;

  // Live first-page listener
  let unsub;
  try {
    unsub = onSnapshot(baseQuery(), (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
      _hasMore = snapshot.docs.length >= pageSize;
      store.set(collectionName, items, false);
      onUpdate(items, _hasMore);
    }, (err) => {
      showListError(collectionName, `${err.message}. Try refreshing.`);
    });
  } catch (err) {
    showListError(collectionName, `Query failed: ${err.message}`);
    return { loadMore: async () => {}, hasMore: false };
  }

  activeSubscriptions.set(collectionName, unsub);

  /** Fetch the next page using a cursor (P0-5). */
  async function loadMore() {
    if (!lastVisible || !_hasMore) return;

    const nextQuery = query(
      collection(database, collectionName),
      where('classId', '==', classId),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
      startAfter(lastVisible)
    );

    try {
      const snap = await getDocs(nextQuery);
      const newItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      lastVisible = snap.docs[snap.docs.length - 1] || lastVisible;
      _hasMore = snap.docs.length >= pageSize;

      const current = store.get(collectionName) || [];
      const merged = [...current, ...newItems];
      store.set(collectionName, merged, false);
      onUpdate(merged, _hasMore);
    } catch (err) {
      showListError(collectionName, `Load more failed: ${err.message}`);
    }
  }

  return {
    loadMore,
    get hasMore() { return _hasMore; }
  };
}

/** Tear down the live listener for a given collection. */
export function unsubscribeCollection(collectionName) {
  if (activeSubscriptions.has(collectionName)) {
    const unsub = activeSubscriptions.get(collectionName);
    if (typeof unsub === 'function') unsub();
    activeSubscriptions.delete(collectionName);
  }
}

/** Tear down all active listeners (used on sign-out). */
export function unsubscribeAll() {
  activeSubscriptions.forEach((unsub) => {
    if (typeof unsub === 'function') unsub();
  });
  activeSubscriptions.clear();
}

/** Create a document, optionally with a custom ID. */
export async function createDocument(collectionName, data, customId = null) {
  const database = await ensureDb();
  if (!database) {
    const id = customId || `${collectionName}-${Date.now()}`;
    const newItem = { id, ...data, createdAt: Date.now() };
    store.update(collectionName, list => [newItem, ...(list || [])]);
    return id;
  }

  const { collection, doc, addDoc, setDoc, serverTimestamp } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  const payload = { ...data, createdAt: serverTimestamp() };

  if (customId) {
    const docRef = doc(database, collectionName, customId);
    await setDoc(docRef, payload);
    return customId;
  }
  const colRef = collection(database, collectionName);
  const docRef = await addDoc(colRef, payload);
  return docRef.id;
}

/** Update specific fields on an existing document. */
export async function updateDocument(collectionName, docId, updates) {
  const database = await ensureDb();
  if (!database) {
    store.update(collectionName, list =>
      (list || []).map(item => item.id === docId ? { ...item, ...updates } : item)
    );
    return;
  }
  const { doc, updateDoc } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  await updateDoc(doc(database, collectionName, docId), updates);
}

/**
 * Atomically set or delete the caller's own key inside a map field.
 * value=null → deleteField (un-vote / un-react).
 * P0-7: own-key removal path is validated by rules first.
 */
export async function setOwnMapKey(collectionName, docId, mapName, uidKey, value) {
  const database = await ensureDb();
  if (!database) {
    store.update(collectionName, list => (list || []).map(item => {
      if (item.id !== docId) return item;
      const map = { ...(item[mapName] || {}) };
      if (value === null || value === undefined) {
        delete map[uidKey];
      } else {
        map[uidKey] = value;
      }
      return { ...item, [mapName]: map };
    }));
    return;
  }

  const { doc, updateDoc, deleteField } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  const fieldPath = `${mapName}.${uidKey}`;
  const update = (value === null || value === undefined)
    ? { [fieldPath]: deleteField() }
    : { [fieldPath]: value };

  await updateDoc(doc(database, collectionName, docId), update);
}

/** Delete a document by ID. */
export async function deleteDocument(collectionName, docId) {
  const database = await ensureDb();
  if (!database) {
    store.update(collectionName, list =>
      (list || []).filter(item => item.id !== docId)
    );
    return;
  }
  const { doc, deleteDoc } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  await deleteDoc(doc(database, collectionName, docId));
}
