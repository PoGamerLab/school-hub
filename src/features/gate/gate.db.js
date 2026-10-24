/**
 * Data layer operations for Gate verification (Phase 1).
 */

import { getDocument, setDocument, updateDocument } from '../../core/db/firestore.js';
import { initFirebase } from '../../config/firebase.js';

export async function fetchGateQuestions() {
  const doc = await getDocument('gateConfig', 'questions');
  if (doc && doc.q1Text && doc.q2Text && doc.q3Text) return doc;
  return null;
}

export async function fetchActiveClasses() {
  const res = await initFirebase();
  if (!res || !res.db) {
    return [];
  }
  const { collection, query, where, getDocs } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const q = query(collection(res.db, 'classes'), where('status', '==', 'active'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchUserGateRecord(uid) {
  return await getDocument('gate', uid);
}

export async function submitGateAttempt(uid, answers, classId, previousAttempts = 0) {
  const nextAttempts = previousAttempts + 1;
  const payload = {
    answers: {
      q1: (answers.q1 || '').slice(0, 60),
      q2: (answers.q2 || '').slice(0, 60),
      q3: (answers.q3 || '').slice(0, 60)
    },
    classId: (classId || '').slice(0, 30),
    attempts: nextAttempts
  };
  return await setDocument('gate', uid, payload, true, 'lastAttemptAt');
}

export async function completeGatePass(uid, classId) {
  return await updateDocument('users', uid, {
    status: 'needs_profile',
    classId
  });
}
