/**
 * Profile caching and single-document fetching (Phase A1).
 */

import { getDocument } from '../../core/db/firestore.js';

const profileCache = new Map();

export function clearProfileCache(id = null) {
  if (id) profileCache.delete(id);
  else profileCache.clear();
}

export function getCachedProfile(id) {
  return profileCache.get(id) || null;
}

export function setCachedProfile(id, profile) {
  if (id && profile) profileCache.set(id, profile);
}

export async function fetchProfile(id) {
  if (!id) return null;
  if (profileCache.has(id)) return profileCache.get(id);
  const p = await getDocument('students', id);
  if (p) profileCache.set(id, p);
  return p;
}
