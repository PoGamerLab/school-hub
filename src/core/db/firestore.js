/**
 * Firestore data layer (live subscriptions, pagination cursor, atomic batches).
 */

import { initFirebase } from '../../config/firebase.js';
import { store } from '../store/store.js';
import { LIMITS } from '../../config/constants.js';

const activeSubscriptions = new Map();

async function ensureDb() {
  const res = await initFirebase();
  return res ? res.db : null;
}

function showListError(collectionName, message) {
  const ids = {
    students: '#class-students-grid, #hub-students-grid, .grid',
    memories: '#memories-container',
    gallery: '#gallery-container',
    teachers: '#teachers-container',
    superlatives: '#superlatives-container'
  };
  const el = ids[collectionName] ? document.querySelector(ids[collectionName]) : null;
  if (el) {
    el.innerHTML = `<div class="empty-state full-width-empty">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">Could not load data</div>
      <div class="empty-state-desc">${message}</div>
    </div>`;
  }
  console.error(`[Firestore:${collectionName}]`, message);
}

export async function subscribeClassCollection(collectionName, classId, onUpdate) {
  unsubscribeCollection(collectionName);
  const pageSize = collectionName === 'students' ? LIMITS.PAGE_SIZE_STUDENTS : LIMITS.PAGE_SIZE_DEFAULT;
  const database = await ensureDb();

  if (!database) {
    const list = store.get(collectionName) || [];
    if (onUpdate) onUpdate(list, false);
    return { loadMore: async () => {}, unsubscribe: () => {} };
  }

  const { collection, onSnapshot, query, where, orderBy, limit, startAfter, getDocs } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  let lastDoc = null;
  let hasMorePages = false;
  let firstPageItems = [];
  let appendedItems = [];

  const buildBaseQuery = (limitCount, afterCursor = null) => {
    const coll = collection(database, collectionName);
    const clauses = [];
    if (classId && collectionName !== 'teachers') clauses.push(where('classId', '==', classId));
    if (collectionName === 'students') clauses.push(where('verified', '==', true));

    const sortField = (collectionName === 'superlatives' || collectionName === 'memories' || collectionName === 'gallery') ? 'createdAt' : 'name';
    clauses.push(orderBy(sortField, sortField === 'createdAt' ? 'desc' : 'asc'));
    if (afterCursor) clauses.push(startAfter(afterCursor));
    clauses.push(limit(limitCount));
    return query(coll, ...clauses);
  };

  const publishCombined = () => {
    const combined = [...firstPageItems, ...appendedItems];
    store.set(collectionName, combined, false);
    if (onUpdate) onUpdate(combined, hasMorePages);
  };

  const unsub = onSnapshot(buildBaseQuery(pageSize), (snapshot) => {
    firstPageItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    hasMorePages = snapshot.docs.length === pageSize;
    publishCombined();
  }, (err) => {
    showListError(collectionName, err.message || 'Permission denied or connection lost.');
  });

  activeSubscriptions.set(collectionName, unsub);

  const loadMore = async () => {
    if (!lastDoc || !hasMorePages) return;
    try {
      const snap = await getDocs(buildBaseQuery(pageSize, lastDoc));
      const nextItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      lastDoc = snap.docs[snap.docs.length - 1] || null;
      hasMorePages = snap.docs.length === pageSize;
      appendedItems = [...appendedItems, ...nextItems];
      publishCombined();
    } catch (err) {
      console.error(`[Firestore:${collectionName}:loadMore]`, err);
    }
  };

  return { loadMore, unsubscribe: () => unsubscribeCollection(collectionName), get hasMore() { return hasMorePages; } };
}

export function unsubscribeCollection(collectionName) {
  const unsub = activeSubscriptions.get(collectionName);
  if (unsub) {
    unsub();
    activeSubscriptions.delete(collectionName);
  }
}

export async function createDocument(collectionName, data, docId = null) {
  const database = await ensureDb();
  if (!database) {
    const newItem = { id: docId || `local_${Date.now()}`, ...data, createdAt: new Date() };
    store.update(collectionName, list => [newItem, ...(list || [])]);
    return newItem;
  }
  const { collection, addDoc, setDoc, doc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const payload = { ...data, createdAt: serverTimestamp() };
  if (typeof docId === 'string' && docId) {
    // Use a specific document ID (e.g. students/{uid})
    await setDoc(doc(database, collectionName, docId), payload);
    return { id: docId, ...payload };
  }
  if (docId !== null && typeof docId !== 'string') {
    // Legacy boolean behaviour: set classId if truthy but no specific ID
    if (docId && !payload.classId) payload.classId = store.get('currentClassId') || '';
  } else {
    if (!payload.classId) payload.classId = store.get('currentClassId') || '';
  }
  const ref = await addDoc(collection(database, collectionName), payload);
  return { id: ref.id, ...payload };
}

export async function updateDocument(collectionName, docId, updates) {
  const database = await ensureDb();
  if (!database) {
    store.update(collectionName, list => (list || []).map(item => item.id === docId ? { ...item, ...updates } : item));
    return;
  }
  const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  await updateDoc(doc(database, collectionName, docId), updates);
}

export async function setOwnMapKey(collectionName, docId, mapName, uidKey, value) {
  const database = await ensureDb();
  if (!database) return;
  const { doc, updateDoc, deleteField } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const fieldPath = `${mapName}.${uidKey}`;
  const update = (value === null || value === undefined) ? { [fieldPath]: deleteField() } : { [fieldPath]: value };
  await updateDoc(doc(database, collectionName, docId), update);
}

export async function deleteDocument(collectionName, docId) {
  const database = await ensureDb();
  if (!database) {
    store.update(collectionName, list => (list || []).filter(item => item.id !== docId));
    return;
  }
  const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  await deleteDoc(doc(database, collectionName, docId));
}

export async function getDocument(collectionName, docId) {
  const database = await ensureDb();
  if (!database) return null;
  const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const snap = await getDoc(doc(database, collectionName, docId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function setDocument(collectionName, docId, data, withTimestamp = false, timestampField = 'updatedAt') {
  const database = await ensureDb();
  if (!database) return { id: docId, ...data };
  const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const payload = { ...data, ...(withTimestamp ? { [timestampField]: serverTimestamp() } : {}) };
  await setDoc(doc(database, collectionName, docId), payload);
  return payload;
}

export async function runBatchWrite(operations) {
  const database = await ensureDb();
  if (!database) return;
  const { doc, writeBatch, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const batch = writeBatch(database);
  operations.forEach(op => {
    const ref = doc(database, op.collection, op.id);
    if (op.type === 'set') {
      const tsField = op.timestampField || 'createdAt';
      const payload = { ...op.data, ...(op.withTimestamp ? { [tsField]: serverTimestamp() } : {}) };
      batch.set(ref, payload, op.merge ? { merge: true } : undefined);
    } else if (op.type === 'update') {
      batch.update(ref, op.data);
    } else if (op.type === 'delete') {
      batch.delete(ref);
    }
  });
  await batch.commit();
}
