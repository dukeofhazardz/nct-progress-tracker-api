/** Compact segmented control for mutually exclusive view/filter choices. */
export default function SegmentedControl({
  value,
  onChange,
  options,
  label,
  stretch = false,
  className = '',
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`rounded-lg border border-line bg-surface p-0.5 ${
        stretch ? 'flex w-full' : 'inline-flex'
      } ${className}`}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              stretch ? 'flex-1' : ''
            } ${isActive ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'}`}
          >
            {option.label}
            {option.count != null && (
              <span className={isActive ? 'ml-1.5 text-white/70' : 'ml-1.5 text-ink-faint'}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
