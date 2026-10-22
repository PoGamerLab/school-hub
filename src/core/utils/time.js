/**
 * Time and date formatting utilities.
 */

export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const time = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  const diffSec = Math.floor((now - time) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(time).toLocaleDateString();
}

/**
 * Calculates days until next birthday (ignores year, safe for privacy).
 * Birthday string expected like "14 March" or "14 Mar" or "March 14".
 */
export function daysUntilBirthday(dateStr) {
  if (!dateStr) return null;
  try {
    const months = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11
    };

    const tokens = dateStr.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
    let day = null;
    let month = null;

    for (const t of tokens) {
      const num = parseInt(t, 10);
      if (!isNaN(num) && num >= 1 && num <= 31) {
        day = num;
      } else if (months[t] !== undefined) {
        month = months[t];
      }
    }

    if (day === null || month === null) return null;

    const today = new Date();
    const nextBday = new Date(today.getFullYear(), month, day);
    if (nextBday < today) {
      nextBday.setFullYear(today.getFullYear() + 1);
    }

    const diff = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  } catch {
    return null;
  }
}
