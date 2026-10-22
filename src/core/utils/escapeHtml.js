/**
 * Escapes unsafe HTML characters to prevent XSS.
 * Always wrap user-controlled text in escapeHtml before rendering into innerHTML.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escapes an attribute value (like inside href or data-*)
 */
export function escapeAttr(str) {
  return escapeHtml(str);
}
