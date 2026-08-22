import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-60';

const variants = {
  primary: 'bg-brand-600 text-white shadow-card hover:bg-brand-700',
  secondary: 'border border-line-strong bg-surface text-ink shadow-card hover:bg-surface-raised',
  ghost: 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
  danger: 'bg-red-600 text-white shadow-card hover:bg-red-700',
  'danger-quiet': 'border border-red-200 bg-surface text-red-600 hover:bg-red-50',
};

const sizes = {
  sm: 'min-h-8 px-2.5 py-1.5 text-xs',
  md: 'min-h-10 px-4 py-2.5 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  isLoading = false,
  disabled = false,
  to,
  className = '',
  children,
  ...rest
}) {
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  const iconSize = size === 'sm' ? 14 : 16;

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {Icon && <Icon size={iconSize} aria-hidden="true" />}
        {children}
      </Link>
    );
  }

  return (
    <button
      type={rest.type || 'button'}
      disabled={disabled || isLoading}
      className={classes}
      {...rest}
    >
      {isLoading ? (
        <Loader2 size={iconSize} className="animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon size={iconSize} aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
