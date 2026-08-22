import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const tones = {
  error: { style: 'border-red-200 bg-red-50 text-red-700', Icon: AlertCircle },
  warning: { style: 'border-amber-200 bg-amber-50 text-amber-800', Icon: AlertTriangle },
  success: { style: 'border-emerald-200 bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
  info: { style: 'border-brand-200 bg-brand-50 text-brand-800', Icon: Info },
};

export default function Alert({ tone = 'info', title, children, action, className = '' }) {
  const { style, Icon } = tones[tone];

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${style} ${className}`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : undefined}>{children}</div>}
      </div>
      {action}
    </div>
  );
}
