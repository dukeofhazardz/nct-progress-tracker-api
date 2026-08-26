import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Plus,
  RotateCcw,
  RotateCw,
  UserPlus,
} from 'lucide-react';
import { tracker } from '../../api/services/trackerService';
import useFetch from '../../hooks/useFetch';
import initials from '../../utils/initials';
import { formatDate } from '../../utils/dateFormatter';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import Field from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import Panel from '../../components/ui/Panel';
import ProgressBar from '../../components/ui/ProgressBar';
import SegmentedControl from '../../components/ui/SegmentedControl';
import Skeleton from '../../components/ui/Skeleton';

const percent = (done, total) => (total ? Math.round((done / total) * 100) : 0);

/** Mirrors the server's calculation so an optimistic tick shows the right percentage. */
const applyToggle = (cohorts, cohortId, itemId, isCompleted) =>
  cohorts.map((cohort) => {
    if (cohort.id !== cohortId) return cohort;

    const curriculum = cohort.curriculum.map((item) =>
      item.id === itemId ? { ...item, isCompleted } : item,
    );

    return {
      ...cohort,
      curriculum,
      progressPercent: percent(
        curriculum.filter((item) => item.isCompleted).length,
        curriculum.length,
      ),
    };
  });

export default function InstructorDashboard() {
  const { data, status, error, reload, setData } = useFetch(() => tracker.cohorts(), []);
  // Memoised because the roster effect depends on it — a fresh [] each render
  // would re-run that effect forever.
  const cohorts = useMemo(() => data ?? [], [data]);

  const [expandedIds, setExpandedIds] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [cohortName, setCohortName] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [studentLogins, setStudentLogins] = useState({});
  const [enrollingId, setEnrollingId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [progressError, setProgressError] = useState('');
  const [view, setView] = useState('active');
  const [completing, setCompleting] = useState(null); // cohort pending confirmation
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionNotice, setCompletionNotice] = useState('');
  // Rosters are fetched per cohort on first expand, keyed by cohort id, so the
  // dashboard's initial load is unchanged.
  const [rosters, setRosters] = useState({});

  // A single cohort opens on arrival; more than one starts collapsed so the page
  // is not a wall of every topic of every cohort at once.
  const openIds = expandedIds ?? new Set(cohorts.length === 1 ? [cohorts[0].id] : []);

  const loadRoster = useCallback(async (cohortId) => {
    setRosters((current) => ({ ...current, [cohortId]: { status: 'loading', students: [] } }));
    try {
      const students = await tracker.cohortStudents(cohortId);
      setRosters((current) => ({ ...current, [cohortId]: { status: 'ready', students } }));
    } catch {
      setRosters((current) => ({ ...current, [cohortId]: { status: 'error', students: [] } }));
    }
  }, []);

  // The single-cohort case auto-expands without a click, so its roster is
  // requested here rather than in the toggle handler.
  useEffect(() => {
    if (cohorts.length !== 1 || expandedIds !== null) return;
    if (!rosters[cohorts[0].id]) loadRoster(cohorts[0].id);
  }, [cohorts, expandedIds, rosters, loadRoster]);

  const toggleExpanded = (cohortId) => {
    if (!openIds.has(cohortId) && !rosters[cohortId]) loadRoster(cohortId);
    setExpandedIds(() => {
      const next = new Set(openIds);
      if (next.has(cohortId)) next.delete(cohortId);
      else next.add(cohortId);
      return next;
    });
  };

  const setCohortFeedback = (cohortId, value) =>
    setFeedback((current) => ({ ...current, [cohortId]: value }));

  const createCohort = async (event) => {
    event.preventDefault();
    const name = cohortName.trim();

    if (!name) {
      setCreateError('Cohort name is required.');
      return;
    }

    setIsCreating(true);
    setCreateError('');

    try {
      await tracker.createCohort(name);
      await reload({ quiet: true });
      setCohortName('');
      setIsCreateOpen(false);
    } catch (requestError) {
      setCreateError(requestError.response?.data?.message || 'Could not create the cohort.');
    } finally {
      setIsCreating(false);
    }
  };

  const enrollStudent = async (event, cohort) => {
    event.preventDefault();
    const login = (studentLogins[cohort.id] || '').trim();

    if (!login) return;

    setEnrollingId(cohort.id);
    setCohortFeedback(cohort.id, null);

    try {
      await tracker.enrollStudent(cohort.id, login);
      await Promise.all([reload({ quiet: true }), loadRoster(cohort.id)]);
      setStudentLogins((current) => ({ ...current, [cohort.id]: '' }));
      setCohortFeedback(cohort.id, { tone: 'success', text: `${login} is now enrolled.` });
    } catch (requestError) {
      setCohortFeedback(cohort.id, {
        tone: 'error',
        text: requestError.response?.data?.message || 'Could not enrol that student.',
      });
    } finally {
      setEnrollingId(null);
    }
  };

  const toggleProgress = async (cohort, item) => {
    const isCompleted = !item.isCompleted;

    setProgressError('');
    setData((current) => applyToggle(current, cohort.id, item.id, isCompleted));

    try {
      await tracker.setProgress(cohort.id, item.id, isCompleted);
    } catch (requestError) {
      setData((current) => applyToggle(current, cohort.id, item.id, !isCompleted));
      setProgressError(
        requestError.response?.data?.message ||
          `Could not save "${item.title}". Your change was undone.`,
      );
    }
  };

  const confirmComplete = async () => {
    setIsCompleting(true);
    setProgressError('');
    try {
      await tracker.completeCohort(completing.id);
      await reload({ quiet: true });
      setCompletionNotice(`${completing.name} is marked completed and moved to the Completed tab.`);
      setCompleting(null);
    } catch (requestError) {
      setProgressError(
        requestError.response?.data?.message || 'Could not mark the cohort completed.',
      );
      setCompleting(null);
    } finally {
      setIsCompleting(false);
    }
  };

  const reopenCohort = async (cohort) => {
    setProgressError('');
    try {
      await tracker.reopenCohort(cohort.id);
      await reload({ quiet: true });
      setCompletionNotice(`${cohort.name} has been reopened for editing.`);
    } catch (requestError) {
      setProgressError(requestError.response?.data?.message || 'Could not reopen the cohort.');
    }
  };

  const totalStudents = cohorts.reduce((total, cohort) => total + cohort._count.enrollments, 0);
  // Weighted by each cohort's own list length: cohorts pinned to different
  // curriculum versions have different denominators, and this has to match the
  // coverage the administrator sees for this instructor on the department page.
  const trackableTopics = cohorts.reduce((total, cohort) => total + cohort.curriculum.length, 0);
  const averageProgress = trackableTopics
    ? Math.round(
        (cohorts.reduce(
          (total, cohort) => total + cohort.curriculum.filter((topic) => topic.isCompleted).length,
          0,
        ) /
          trackableTopics) *
          100,
      )
    : 0;

  const completedCount = cohorts.filter((cohort) => cohort.completedAt).length;
  const inProgressCount = cohorts.length - completedCount;
  const visibleCohorts = cohorts.filter((cohort) =>
    view === 'completed' ? cohort.completedAt : !cohort.completedAt,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="My cohorts"
        subtitle="Enrol students and record the curriculum topics you have covered."
        actions={
          <Button icon={Plus} onClick={() => setIsCreateOpen(true)}>
            Create cohort
          </Button>
        }
      />

      {status === 'error' && (
        <Alert
          tone="error"
          title="Could not load your cohorts"
          action={
            <Button size="sm" variant="secondary" icon={RotateCw} onClick={() => reload()}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {progressError && <Alert tone="error">{progressError}</Alert>}
      {completionNotice && <Alert tone="success">{completionNotice}</Alert>}

      {status === 'loading' && (
        <div className="space-y-4">
          {[0, 1].map((key) => (
            <div key={key} className="rounded-lg border border-line bg-surface p-5 shadow-card">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-3 h-2 w-full" />
              <Skeleton className="mt-4 h-4 w-32" />
            </div>
          ))}
        </div>
      )}

      {status === 'ready' && cohorts.length === 0 && (
        <Panel>
          <EmptyState
            icon={GraduationCap}
            title="No cohorts yet"
            description="Create your first cohort, enrol your students, then tick off topics as you cover them."
            action={
              <Button icon={Plus} onClick={() => setIsCreateOpen(true)}>
                Create cohort
              </Button>
            }
          />
        </Panel>
      )}

      {status === 'ready' && cohorts.length > 0 && (
        <>
          <div className="flex flex-wrap gap-x-10 gap-y-4 rounded-lg border border-line bg-surface px-5 py-4 shadow-card">
            {[
              ['Cohorts', cohorts.length],
              ['Students', totalStudents],
              ['Average progress', `${averageProgress}%`],
              ['Completed', completedCount],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                  {label}
                </p>
                <p className="mt-1 text-xl font-bold tracking-tight text-ink">{value}</p>
              </div>
            ))}
          </div>

          {/* Completed cohorts get their own tab so a finished delivery does not
              clutter the working list, while staying one click away. */}
          {completedCount > 0 && (
            <SegmentedControl
              label="Cohort status"
              value={view}
              onChange={setView}
              options={[
                { value: 'active', label: 'In progress', count: inProgressCount },
                { value: 'completed', label: 'Completed', count: completedCount },
              ]}
            />
          )}

          {visibleCohorts.length === 0 ? (
            <Panel>
              <EmptyState
                icon={view === 'completed' ? CheckCircle2 : GraduationCap}
                title={view === 'completed' ? 'No completed cohorts' : 'No cohorts in progress'}
                description={
                  view === 'completed'
                    ? 'A cohort appears here once you have covered every topic and marked it completed.'
                    : 'Every cohort you are running has been completed. Reopen one from the Completed tab to make changes.'
                }
              />
            </Panel>
          ) : (
          <div className="space-y-4">
            {visibleCohorts.map((cohort) => {
              const isOpen = openIds.has(cohort.id);
              const done = cohort.curriculum.filter((item) => item.isCompleted).length;
              const cohortFeedback = feedback[cohort.id];
              const roster = rosters[cohort.id];
              const isDone = Boolean(cohort.completedAt);
              // The button only appears once every topic is ticked; the server
              // re-checks this, so hiding it is convenience rather than the rule.
              const canComplete =
                !isDone && cohort.curriculum.length > 0 && done === cohort.curriculum.length;

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
                          <ChevronRight size={16} className="shrink-0 text-ink-faint" aria-hidden="true" />
                        )}
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-ink">
                              {cohort.name}
                            </span>
                            {isDone && (
                              <Badge tone="success" icon={CheckCircle2}>
                                Completed
                              </Badge>
                            )}
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-subtle">
                            {cohort._count.enrollments}{' '}
                            {cohort._count.enrollments === 1 ? 'student' : 'students'} ·{' '}
                            {done} of {cohort.curriculum.length} topics
                            {isDone && ` · completed ${formatDate(cohort.completedAt)}`}
                          </span>
                        </span>
                      </span>

                      <span className="flex shrink-0 items-center gap-3 sm:w-56">
                        <ProgressBar value={cohort.progressPercent} className="flex-1" />
                        <span className="w-9 text-right text-sm font-bold tabular-nums text-ink">
                          {cohort.progressPercent}%
                        </span>
                      </span>
                    </button>
                  </h2>

                  {/* Surfaced on the collapsed card too, so an instructor who has
                      just ticked the last topic does not have to hunt for it. */}
                  {canComplete && (
                    <div className="flex flex-col gap-2 border-t border-line bg-emerald-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-emerald-900">
                        Every topic is covered. Mark this cohort completed to close it out.
                      </p>
                      <Button
                        size="sm"
                        icon={CheckCircle2}
                        onClick={() => setCompleting(cohort)}
                        className="shrink-0"
                      >
                        Mark completed
                      </Button>
                    </div>
                  )}

                  {isDone && (
                    <div className="flex flex-col gap-2 border-t border-line bg-surface-raised px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-ink-muted">
                        Recorded progress is locked while this cohort is completed.
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={RotateCcw}
                        onClick={() => reopenCohort(cohort)}
                        className="shrink-0"
                      >
                        Reopen
                      </Button>
                    </div>
                  )}

                  {isOpen && (
                    <div className="border-t border-line">
                      {/* Enrolment is closed once a cohort is completed — its roster
                          is a finished record. */}
                      {!isDone && (
                      <form
                        onSubmit={(event) => enrollStudent(event, cohort)}
                        className="flex flex-col gap-2 bg-surface-raised px-5 py-4 sm:flex-row sm:items-end"
                      >
                        <Field
                          label="Enrol a student"
                          hint="Their registered username or email."
                          className="flex-1"
                          value={studentLogins[cohort.id] || ''}
                          onChange={(event) =>
                            setStudentLogins((current) => ({
                              ...current,
                              [cohort.id]: event.target.value,
                            }))
                          }
                          placeholder="ada.obi"
                          required
                        />
                        <Button
                          type="submit"
                          variant="secondary"
                          icon={UserPlus}
                          isLoading={enrollingId === cohort.id}
                        >
                          Enrol
                        </Button>
                      </form>
                      )}

                      {cohortFeedback && (
                        <div className="border-t border-line px-5 py-3">
                          <Alert tone={cohortFeedback.tone}>{cohortFeedback.text}</Alert>
                        </div>
                      )}

                      <div className="border-t border-line px-5 py-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                          Enrolled students
                          {roster?.status === 'ready' && ` · ${roster.students.length}`}
                        </p>

                        {roster?.status === 'loading' && <Skeleton className="mt-2 h-4 w-48" />}

                        {roster?.status === 'error' && (
                          <Alert tone="error" className="mt-2">
                            Could not load the roster.{' '}
                            <button
                              type="button"
                              onClick={() => loadRoster(cohort.id)}
                              className="font-semibold underline"
                            >
                              Try again
                            </button>
                          </Alert>
                        )}

                        {roster?.status === 'ready' &&
                          (roster.students.length === 0 ? (
                            <p className="mt-1.5 text-sm text-ink-subtle">
                              Nobody is enrolled yet. Add a student using the form above.
                            </p>
                          ) : (
                            <ul className="mt-2.5 flex flex-wrap gap-1.5">
                              {roster.students.map((student) => (
                                <li
                                  key={student.id}
                                  className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3"
                                >
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-800">
                                    {initials(student.name)}
                                  </span>
                                  <span className="text-xs font-medium text-ink">
                                    {student.name}
                                  </span>
                                  <span className="text-xs text-ink-subtle">
                                    @{student.username}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ))}
                      </div>

                      {/* Placed with the topics rather than in the already-dense
                          header — it explains this list, not the cohort. */}
                      {cohort.curriculumVersion?.isOutdated && (
                        <div className="border-t border-line px-5 py-3">
                          <Alert tone="info">
                            You are delivering curriculum v{cohort.curriculumVersion.version}. Your
                            department published v{cohort.curriculumVersion.currentVersion} on{' '}
                            {formatDate(cohort.curriculumVersion.currentPublishedAt)}, which applies
                            to cohorts starting from now — this one keeps the topics it began with.
                          </Alert>
                        </div>
                      )}

                      {cohort.curriculum.length === 0 ? (
                        <EmptyState
                          icon={BookOpen}
                          title="No curriculum published"
                          description="An administrator has to publish your department's curriculum before you can record progress."
                        />
                      ) : (
                        <ul className="divide-y divide-line border-t border-line">
                          {cohort.curriculum.map((item, index) => (
                            <li key={item.id}>
                              <label
                                className={`flex min-h-12 items-center gap-3 px-5 py-2.5 transition-colors ${
                                  isDone ? 'cursor-default' : 'cursor-pointer hover:bg-surface-raised'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={item.isCompleted}
                                  onChange={() => toggleProgress(cohort, item)}
                                  disabled={isDone}
                                  className="peer sr-only"
                                />
                                <span
                                  aria-hidden="true"
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600 ${
                                    item.isCompleted
                                      ? 'border-emerald-500 bg-emerald-500 text-white'
                                      : 'border-line-strong bg-surface'
                                  }`}
                                >
                                  {item.isCompleted && (
                                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                                  )}
                                </span>
                                <span className="w-6 shrink-0 text-xs font-semibold tabular-nums text-ink-faint">
                                  {index + 1}
                                </span>
                                <span
                                  className={`text-sm ${
                                    item.isCompleted
                                      ? 'text-ink-faint line-through'
                                      : 'font-medium text-ink'
                                  }`}
                                >
                                  {item.title}
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="border-t border-line px-5 py-3">
                        <Badge tone={done === cohort.curriculum.length ? 'success' : 'neutral'}>
                          {done} of {cohort.curriculum.length} topics covered
                        </Badge>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(completing)}
        onClose={() => setCompleting(null)}
        onConfirm={confirmComplete}
        title="Mark cohort completed?"
        confirmLabel="Mark completed"
        tone="primary"
        isBusy={isCompleting}
      >
        {completing && (
          <>
            <strong className="font-semibold text-ink">{completing.name}</strong> will move to your
            Completed tab and appear under completed cohorts for your department. Recorded progress
            and enrolment are locked while it is completed — you can reopen it at any time, and
            nothing is deleted.
          </>
        )}
      </ConfirmDialog>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateError('');
        }}
        title="Create cohort"
        description="Cohort names must be unique within your department."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" form="create-cohort-form" isLoading={isCreating}>
              Create cohort
            </Button>
          </>
        }
      >
        <form id="create-cohort-form" onSubmit={createCohort} className="space-y-4">
          {createError && <Alert tone="error">{createError}</Alert>}
          <Field
            label="Cohort name"
            value={cohortName}
            onChange={(event) => setCohortName(event.target.value)}
            placeholder="e.g. Cohort 7 — August intake"
            required
          />
        </form>
      </Modal>
    </div>
  );
}
