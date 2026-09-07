import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' };

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  footer,
  size = 'md',
  children,
}) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  // Held in a ref so the focus/scroll effect below depends only on `isOpen`.
  // Depending on `onClose` would re-run it on every render and steal focus back
  // to the first field while the user is typing.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const visibleTargets = () =>
      Array.from(panel?.querySelectorAll(FOCUSABLE) ?? []).filter(
        (node) => node.offsetParent !== null,
      );

    // Prefer the first form control so a dialog wrapping a form is ready to type
    // in; fall back to whatever is focusable, then the panel itself.
    const firstControl = Array.from(
      panel?.querySelectorAll('input:not([disabled]),select:not([disabled]),textarea:not([disabled])') ?? [],
    ).find((node) => node.offsetParent !== null);

    (firstControl ?? visibleTargets()[0] ?? panel)?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const targets = visibleTargets();
      if (!targets.length) return;

      const first = targets[0];
      const last = targets[targets.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-surface-inverse/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full flex-col rounded-t-lg bg-surface shadow-overlay sm:rounded-lg ${widths[size]}`}
      >
        {title && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold text-ink">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-ink-subtle">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {/* Wrapping matters once a footer holds three buttons: `Button` is
            `whitespace-nowrap`, so on a narrow phone the leftmost one would
            otherwise be pushed outside the panel and clipped. With room for
            them all this changes nothing. */}
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface-raised px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
