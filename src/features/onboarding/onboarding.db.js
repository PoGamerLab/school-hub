/**
 * Data layer operations for Onboarding Wizard & Activation Batch (Phase 1, section 4.5).
 */

import { getDocument, setDocument, deleteDocument, runBatchWrite } from '../../core/db/firestore.js';

const LOCAL_DRAFT_KEY = 'schoolhub_wizard_draft';

export async function saveDraft(uid, step, data) {
  // 1. Local backup
  const now = Date.now();
  const localPayload = { step, data, updatedAt: now };
  try {
    localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(localPayload));
  } catch (e) {
    console.warn('Failed to save draft to localStorage', e);
  }

  // 2. Cloud draft write
  try {
    await setDocument('drafts', uid, { step, data }, true, 'updatedAt');
  } catch (err) {
    console.warn('Draft cloud autosave failed (will use local backup):', err);
  }
}

export async function loadDraft(uid) {
  // Read local backup
  let localDraft = null;
  try {
    const raw = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (raw) localDraft = JSON.parse(raw);
  } catch {}

  // Read remote draft
  let remoteDraft = null;
  try {
    remoteDraft = await getDocument('drafts', uid);
  } catch (e) {
    console.warn('Could not fetch cloud draft:', e);
  }

  // The newest copy wins
  if (!remoteDraft) return localDraft;
  if (!localDraft) return remoteDraft;

  const localTime = localDraft.updatedAt || 0;
  const remoteTime = remoteDraft.updatedAt?.toMillis
    ? remoteDraft.updatedAt.toMillis()
    : (remoteDraft.updatedAt || 0);

  return remoteTime >= localTime ? remoteDraft : localDraft;
}

export async function clearLocalDraft() {
  try {
    localStorage.removeItem(LOCAL_DRAFT_KEY);
  } catch {}
}

/**
 * 4.5 Activation batch (client)
 * 1. create students/{uid} with verified true
 * 2. update users/{uid} to status active
 * 3. after success, delete drafts/{uid}
 */
export async function executeActivationBatch(uid, classId, studentData) {
  const operations = [
    {
      type: 'set',
      collection: 'students',
      id: uid,
      data: {
        ...studentData,
        classId,
        ownerUid: uid,
        verified: true
      },
      withTimestamp: true,
      timestampField: 'createdAt'
    },
    {
      type: 'update',
      collection: 'users',
      id: uid,
      data: {
        status: 'active'
      }
    }
  ];

  await runBatchWrite(operations);

  // Clean up draft both in cloud and locally
  try {
    await deleteDocument('drafts', uid);
  } catch (e) {
    console.warn('Failed to delete cloud draft after activation:', e);
  }
  clearLocalDraft();
}
