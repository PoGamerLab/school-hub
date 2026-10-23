/**
 * Shared answer normalization helper (Phase 1, section 4.2).
 *
 * Rules:
 * - trim
 * - lowercase
 * - collapse repeated spaces
 * - remove punctuation except letters, numbers and spaces
 *
 * Used identically by:
 * 1. The student gate submission form (before writing gate/{uid})
 * 2. The admin Gate Questions editor (before saving gateConfig/answers)
 */

export function normalizeAnswer(val) {
  if (!val || typeof val !== 'string') return '';
  return val
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // remove punctuation, keep letters, numbers, spaces
    .replace(/\s+/g, ' ')           // collapse multiple whitespace characters into a single space
    .trim();
}
