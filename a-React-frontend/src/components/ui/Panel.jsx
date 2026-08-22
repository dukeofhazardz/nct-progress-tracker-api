export default function Panel({ title, description, actions, footer, children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-lg border border-line bg-surface shadow-card ${className}`}>
      {(title || actions) && (
        <div className="flex flex-col justify-between gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-1 text-sm text-ink-subtle">{description}</p>}
          </div>
          {actions && (
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              {actions}
            </div>
          )}
        </div>
      )}

      {children}

      {footer && (
        <div className="border-t border-line bg-surface-raised px-5 py-4">{footer}</div>
      )}
    </section>
  );
}
