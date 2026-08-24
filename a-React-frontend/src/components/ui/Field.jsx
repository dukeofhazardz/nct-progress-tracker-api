import { useId } from 'react';

/**
 * Label + control + hint + error with the a11y wiring done once.
 * `as` selects the native control: 'input' (default), 'textarea' or 'select'.
 */
export default function Field({
  as = 'input',
  label,
  hint,
  error,
  required,
  trailing,
  className = '',
  inputClassName = '',
  children,
  ...rest
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const Control = as;

  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ');

  const control = (
    <Control
      id={id}
      required={required}
      aria-describedby={describedBy || undefined}
      aria-invalid={error ? true : undefined}
      className={`field ${trailing ? 'pr-11' : ''} ${inputClassName}`}
      {...rest}
    >
      {children}
    </Control>
  );

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-red-600" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {hint && (
        <p id={hintId} className="mt-1 text-xs text-ink-subtle">
          {hint}
        </p>
      )}

      <div className="relative mt-1.5">
        {control}
        {trailing && (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>
        )}
      </div>

      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
