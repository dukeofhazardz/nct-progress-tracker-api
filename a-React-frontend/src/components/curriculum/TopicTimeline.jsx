import { Check } from 'lucide-react';

/**
 * A curriculum as a numbered timeline, each topic marked covered or not.
 *
 * Shared by the student's own progress page and a manager's view of that same
 * student, which must show the identical list — a difference between the two would
 * read as a bug in the tracking rather than a difference in the page.
 *
 * `renderAction(item)` is the only variation: the student's page returns the Report
 * issue control for a covered topic, a manager passes nothing and gets the list
 * alone. The zero-topics case belongs to the caller, whose wording differs — a
 * student is told their department has not published a curriculum, a manager is told
 * the cohort has none.
 */
export default function TopicTimeline({ curriculum, renderAction }) {
  return (
    <ol className="px-5 py-5">
      {curriculum.map((item, index) => {
        const isLast = index === curriculum.length - 1;

        return (
          <li key={item.id} className="relative flex gap-4 pb-5 last:pb-0">
            {/* The connector, stopping short of the last bubble so the line does
                not trail off the end of the list. */}
            {!isLast && (
              <span aria-hidden="true" className="absolute bottom-0 left-2.75 top-7 w-px bg-line" />
            )}

            <span
              aria-hidden="true"
              className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                item.isCompleted
                  ? 'bg-emerald-500 text-white'
                  : 'border-2 border-line-strong bg-surface'
              }`}
            >
              {item.isCompleted && <Check size={13} strokeWidth={3} aria-hidden="true" />}
            </span>

            <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                  Topic {index + 1}
                  {/* The tick and the colour carry this for a sighted reader; both
                      bubbles are aria-hidden, so it is stated here instead. */}
                  <span className="sr-only">
                    {item.isCompleted ? ' — covered' : ' — not yet covered'}
                  </span>
                </p>
                <h3
                  className={`mt-0.5 text-sm font-semibold ${
                    item.isCompleted ? 'text-ink' : 'text-ink-subtle'
                  }`}
                >
                  {item.title}
                </h3>
              </div>

              {renderAction?.(item)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
