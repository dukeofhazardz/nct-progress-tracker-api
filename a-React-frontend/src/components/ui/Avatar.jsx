import initials from '../../utils/initials';

/**
 * Someone's face, or their initials when they have not set one.
 *
 * Four places render this — the profile header, the top bar, the sidebar and the
 * staff list — and each one wants its own size and its own fallback tone, so both
 * arrive as classes rather than as variants. Sizing lives entirely in `className`;
 * this component only owns the circle, the crop and the choice between the two.
 *
 * `src` is the absolute URL the API derives from the stored object path, so the
 * browser fetches it straight from the storage bucket and caches it. `avatar` is
 * the shape that came before: a `data:` URL held on the user row. It is still read
 * here so a session left open across that change keeps its face instead of
 * dropping to initials until the next sign-in.
 */
export default function Avatar({
  src,
  avatar,
  name,
  fallback = '?',
  className = '',
  fallbackClassName = '',
}) {
  const url = src || avatar;

  // Decorative in every use: the person's name is always rendered beside it.
  if (url) {
    return <img src={url} alt="" className={`shrink-0 rounded-full object-cover ${className}`} />;
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${fallbackClassName} ${className}`}
    >
      {initials(name, fallback)}
    </span>
  );
}
