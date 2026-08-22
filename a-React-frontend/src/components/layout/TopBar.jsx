import { Menu } from 'lucide-react';
import Brand from './Brand';
import UserMenu from './UserMenu';

/**
 * `onOpenNav` is only supplied by the sidebar shell; without it the bar carries
 * the brand lockup instead of a menu trigger.
 */
export default function TopBar({ onOpenNav, context }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        {onOpenNav ? (
          <>
            <button
              type="button"
              onClick={onOpenNav}
              aria-label="Open navigation"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink lg:hidden"
            >
              <Menu size={16} aria-hidden="true" />
            </button>
            {context && (
              <p className="truncate text-sm font-semibold text-ink-muted">{context}</p>
            )}
          </>
        ) : (
          <Brand />
        )}
      </div>

      <UserMenu />
    </header>
  );
}
