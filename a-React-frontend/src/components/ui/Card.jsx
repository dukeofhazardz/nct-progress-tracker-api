import { Link } from 'react-router-dom';

const base = 'block rounded-lg border border-line bg-surface shadow-card';
const interactive =
  'transition-colors hover:border-brand-300 hover:bg-brand-50/40 focus-visible:border-brand-400';

/** Bordered surface for repeated items. Pass `to` to make the whole card a link. */
export default function Card({ to, className = '', children, ...rest }) {
  if (to) {
    return (
      <Link to={to} className={`${base} ${interactive} ${className}`} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <div className={`${base} ${className}`} {...rest}>
      {children}
    </div>
  );
}
