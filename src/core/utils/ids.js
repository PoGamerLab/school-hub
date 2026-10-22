/**
 * ID generation, initials extraction, and avatar gradient utilities.
 */

export const AVATAR_GRADIENTS = [
  'linear-gradient(150deg, #1E6B4C, #0E271A)',
  'linear-gradient(150deg, #D9A441, #A6742A)',
  'linear-gradient(150deg, #153826, #1E6B4C)',
  'linear-gradient(150deg, #A63B32, #7A2A23)',
  'linear-gradient(150deg, #1E6B4C, #153826)',
  'linear-gradient(150deg, #D9A441, #153826)',
  'linear-gradient(150deg, #0E271A, #1E6B4C)',
  'linear-gradient(150deg, #A6742A, #D9A441)'
];

export function getRandomGradient() {
  return AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)];
}

export function extractInitials(name, defaultInitials = 'ST') {
  if (!name || typeof name !== 'string') return defaultInitials;
  const cleaned = name.replace(/(Sir|Ma'am|Mr|Mrs|Ms|Dr)\s+/gi, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return defaultInitials;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function generateId(prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}
