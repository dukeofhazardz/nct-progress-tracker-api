import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

export function Table({ children, className = '' }) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full min-w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }) {
  return <thead className="bg-surface-raised">{children}</thead>;
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function TR({ children, className = '', ...rest }) {
  return (
    <tr className={className} {...rest}>
      {children}
    </tr>
  );
}

const alignment = { left: 'text-left', right: 'text-right', center: 'text-center' };

/**
 * When `sortKey` is supplied the header becomes a sort control and reports
 * `aria-sort` so screen readers announce the current order.
 */
export function TH({
  children,
  sortKey,
  sort,
  onSort,
  align = 'left',
  className = '',
  ...rest
}) {
  const isSortable = Boolean(sortKey && onSort);
  const isActive = isSortable && sort?.key === sortKey;
  const direction = isActive ? sort.direction : undefined;

  const cell = (
    <th
      scope="col"
      aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}
      className={`border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle ${alignment[align]} ${className}`}
      {...rest}
    >
      {isSortable ? (
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={`inline-flex items-center gap-1.5 rounded transition-colors hover:text-ink ${isActive ? 'text-ink' : ''}`}
        >
          {children}
          {!isActive && <ChevronsUpDown size={12} aria-hidden="true" />}
          {isActive && direction === 'asc' && <ArrowUp size={12} aria-hidden="true" />}
          {isActive && direction === 'desc' && <ArrowDown size={12} aria-hidden="true" />}
        </button>
      ) : (
        children
      )}
    </th>
  );

  return cell;
}

export function TD({ children, align = 'left', className = '', ...rest }) {
  return (
    <td className={`px-4 py-3 align-middle ${alignment[align]} ${className}`} {...rest}>
      {children}
    </td>
  );
}
