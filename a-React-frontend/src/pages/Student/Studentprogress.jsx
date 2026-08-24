import { useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Flag,
  GraduationCap,
  RotateCw,
} from 'lucide-react';
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
  const { data, status, error, reload } = useFetch(() => tracker.studentProgress(), []);
  const courses = data ?? [];

  const [selectedItem, setSelectedItem] = useState(null); // { topic, cohortId }
  const [reportedIds, setReportedIds] = useState(new Set());
  const [notice, setNotice] = useState('');
  const [expandedIds, setExpandedIds] = useState(null);

  // One course opens on arrival; several start collapsed so the page is not a
  // wall of every topic of every course at once.
  const openIds = expandedIds ?? new Set(courses.length === 1 ? [courses[0].cohort.id] : []);

  const toggleExpanded = (cohortId) =>
    setExpandedIds(() => {
      const next = new Set(openIds);
      if (next.has(cohortId)) next.delete(cohortId);
      else next.add(cohortId);
      return next;
    });

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

  // An empty array means no active enrolment — not a failure to load.
  if (courses.length === 0) {
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

  const totalTopics = courses.reduce((total, course) => total + course.curriculum.length, 0);
  const totalCovered = courses.reduce(
    (total, course) => total + course.curriculum.filter((item) => item.isCompleted).length,
    0,
  );
  const overallPercent = totalTopics ? Math.round((totalCovered / totalTopics) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My progress"
        subtitle={
          courses.length === 1
            ? `${courses[0].cohort.name} · ${courses[0].cohort.department}`
            : `${courses.length} courses across ${new Set(courses.map((c) => c.cohort.department)).size} departments`
        }
      />

      {notice && (
        <Alert tone="success" title="Report submitted">
          {notice}
        </Alert>
      )}

      {/* With several courses a single percentage would be misleading on its own,
          so the summary states what it is averaging over. */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
              {courses.length === 1 ? 'Instructor' : 'Across all courses'}
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {courses.length === 1
                ? courses[0].cohort.instructor
                : `${courses.length} cohorts · ${totalTopics} topics`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tracking-tight text-ink">{overallPercent}%</p>
            <p className="mt-0.5 text-xs text-ink-subtle">
              {totalCovered} of {totalTopics} topics covered
            </p>
          </div>
        </div>
        <ProgressBar value={overallPercent} className="mt-5" />
      </Card>

      <div className="space-y-4">
        {courses.map((course) => {
          const { cohort, curriculum, progressPercent } = course;
          const isOpen = openIds.has(cohort.id);
          const covered = curriculum.filter((item) => item.isCompleted).length;

          return (
            <Card key={cohort.id} className="overflow-hidden">
              <h2>
                <button
                  type="button"
                  onClick={() => toggleExpanded(cohort.id)}
                  aria-expanded={isOpen}
                  className="flex w-full flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-raised sm:flex-row sm:items-center sm:gap-5"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                    {isOpen ? (
                      <ChevronDown size={16} className="shrink-0 text-ink-faint" aria-hidden="true" />
                    ) : (
                      <ChevronRight
                        size={16}
                        className="shrink-0 text-ink-faint"
                        aria-hidden="true"
                      />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {cohort.department}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-subtle">
                        {cohort.name} · {cohort.instructor} · {covered} of {curriculum.length} topics
                      </span>
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-3 sm:w-56">
                    <ProgressBar value={progressPercent} className="flex-1" />
                    <span className="w-9 text-right text-sm font-bold tabular-nums text-ink">
                      {progressPercent}%
                    </span>
                  </span>
                </button>
              </h2>

              {isOpen && (
                <div className="border-t border-line">
                  {curriculum.length === 0 ? (
                    <EmptyState
                      icon={BookOpen}
                      title="No curriculum published yet"
                      description="This department's curriculum has not been published. Check back shortly."
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
                              {item.isCompleted && (
                                <Check size={13} strokeWidth={3} aria-hidden="true" />
                              )}
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
                                    onClick={() =>
                                      setSelectedItem({ topic: item, cohortId: cohort.id })
                                    }
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
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {selectedItem && (
        <DisputeModal
          topic={selectedItem.topic}
          cohortId={selectedItem.cohortId}
          onClose={() => setSelectedItem(null)}
          onDone={onReported}
        />
      )}
    </div>
  );
}
