/**
 * `onDark` uses the periwinkle chevron mark plus a text lockup — the full
 * `NCT-logo2.png` wordmark is dark-on-white artwork and cannot sit on a dark surface.
 */
export default function Brand({ onDark = false, className = '' }) {
  if (onDark) {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <img
          src="/NCT-logo.png"
          alt=""
          aria-hidden="true"
          className="h-7 w-7 shrink-0 object-contain"
        />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-white">NCT Progress Tracker</p>
          <p className="truncate text-[11px] text-white/45">NeoCloud Technologies</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/NCT-logo2.png"
        alt="NeoCloud Technologies"
        className="h-7 shrink-0 object-contain"
      />
      <span className="hidden border-l border-line pl-2.5 text-sm font-semibold text-ink sm:inline">
        Progress Tracker
      </span>
    </div>
  );
}
