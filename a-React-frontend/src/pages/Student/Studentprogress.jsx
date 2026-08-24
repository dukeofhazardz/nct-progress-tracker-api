import { useState } from 'react';
import { BookOpen, Check, Flag, GraduationCap, RotateCw } from 'lucide-react';
import { tracker } from '../../api/services/trackerService';
import useFetch from '../../hooks/useFetch';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import Panel from '../../components/ui/Panel';
import ProgressBar from '../../components/ui/ProgressBar';
import Skeleton from '../../components/ui/Skeleton';
import DisputeModal from './Disputemodal';

export default function StudentProgress() {
  const { data: progress, status, error, reload } = useFetch(() => tracker.studentProgress(), []);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reportedIds, setReportedIds] = useState(new Set());
  const [notice, setNotice] = useState('');

  const onReported = (topic) => {
    setReportedIds((current) => new Set(current).add(topic.id));
    setSelectedItem(null);
    setNotice(`Your report on "${topic.title}" has been sent to the administrator for review.`);
  };

  if (status === 'loading') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <Alert
        tone="error"
        title="Could not load your progress"
        action={
          <Button size="sm" variant="secondary" icon={RotateCw} onClick={() => reload()}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  // The endpoint returns null when the student is not enrolled in an active cohort.
  if (!progress) {
    return (
      <Panel>
        <EmptyState
          icon={GraduationCap}
          title="You are not in an active cohort yet"
          description="Your progress appears here as soon as an instructor enrols you. Share your username with them if you are waiting."
        />
      </Panel>
    );
  }

  const { cohort, curriculum, progressPercent } = progress;
  const completed = curriculum.filter((item) => item.isCompleted).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My progress"
        subtitle={`${cohort.name} · ${cohort.department}`}
      />

      {notice && (
        <Alert tone="success" title="Report submitted">
          {notice}
        </Alert>
      )}

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
              Instructor
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">{cohort.instructor}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tracking-tight text-ink">{progressPercent}%</p>
            <p className="mt-0.5 text-xs text-ink-subtle">
              {completed} of {curriculum.length} topics covered
            </p>
          </div>
        </div>
        <ProgressBar value={progressPercent} className="mt-5" />
      </Card>

      <Panel
        title="Curriculum"
        description="Topics your instructor has recorded as covered, in delivery order."
      >
        {curriculum.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No curriculum published yet"
            description="Your department's curriculum has not been published. Check back shortly."
          />
        ) : (
          <ol className="px-5 py-5">
            {curriculum.map((item, index) => {
              const isLast = index === curriculum.length - 1;
              const isReported = reportedIds.has(item.id);

              return (
                <li key={item.id} className="relative flex gap-4 pb-5 last:pb-0">
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-[11px] top-7 w-px bg-line"
                    />
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

                    {item.isCompleted &&
                      (isReported ? (
                        <Badge tone="warning">Reported</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Flag}
                          onClick={() => setSelectedItem(item)}
                          className="shrink-0"
                        >
                          Report issue
                        </Button>
                      ))}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>

      {selectedItem && (
        <DisputeModal
          topic={selectedItem}
          cohortId={cohort.id}
          onClose={() => setSelectedItem(null)}
          onDone={onReported}
        />
      )}
    </div>
  );
}
