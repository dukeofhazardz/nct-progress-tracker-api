const tones = {
  brand: 'bg-brand-600',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  neutral: 'bg-ink-faint',
};

const heights = { sm: 'h-1.5', md: 'h-2' };

/** Tone follows the value unless overridden: complete reads green, untouched reads grey. */
const toneFor = (value) => (value === 100 ? 'success' : value === 0 ? 'neutral' : 'brand');

export default function ProgressBar({
  value,
  label,
  tone,
  size = 'md',
  showValue = false,
  className = '',
}) {
  const percent = Math.max(0, Math.min(100, Math.round(value || 0)));

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
          {label && <span className="font-medium text-ink-muted">{label}</span>}
          {showValue && <span className="font-semibold text-ink">{percent}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? undefined : `${percent}% complete`}
        className={`w-full overflow-hidden rounded-full bg-surface-sunken ${heights[size]}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${tones[tone ?? toneFor(percent)]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
