const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
});

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "14 Aug 2026" */
export const formatDate = (value) => {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : '—';
};

/** "14 Aug 2026, 09:32" */
export const formatDateTime = (value) => {
  const date = toDate(value);
  return date ? `${dateFormatter.format(date)}, ${timeFormatter.format(date)}` : '—';
};

/** "Today" / "Yesterday" / "4 days ago", falling back to an absolute date past a week. */
export const formatRelativeDate = (value) => {
  const date = toDate(value);
  if (!date) return '—';

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfValue = new Date(date);
  startOfValue.setHours(0, 0, 0, 0);

  const dayDiff = Math.round((startOfToday - startOfValue) / 86_400_000);

  if (dayDiff === 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff > 1 && dayDiff < 7) return `${dayDiff} days ago`;

  return dateFormatter.format(date);
};
