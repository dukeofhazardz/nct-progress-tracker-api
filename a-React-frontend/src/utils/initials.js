/** "Ada Nwosu Obi" -> "AN". Falls back to the given placeholder for empty names. */
export const initials = (name, fallback = '?') => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return fallback;

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

export default initials;
