import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, RotateCw, ShieldCheck, Users } from 'lucide-react';
import { tracker } from '../../api/services/trackerService';
import { useAuth } from '../../context/authContext';
import useFetch from '../../hooks/useFetch';
import initials from '../../utils/initials';
import { formatDate, formatDateTime } from '../../utils/dateFormatter';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import Field from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import Panel from '../../components/ui/Panel';
import ProgressBar from '../../components/ui/ProgressBar';
import SegmentedControl from '../../components/ui/SegmentedControl';
import Skeleton from '../../components/ui/Skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table';

/**
 * Coverage across a set of cohorts, weighted by each cohort's own topic count.
 * Cohorts pinned to different curriculum versions have different denominators, so
 * averaging their percentages would let a short list outweigh a long one — and
 * would disagree with the figure `GET /departments` reports for the same
 * department.
 */
const averageProgress = (cohorts) => {
  const trackable = cohorts.reduce((total, cohort) => total + cohort.topicCount, 0);
  if (!trackable) return 0;
  const covered = cohorts.reduce((total, cohort) => total + cohort.progress.length, 0);
  return Math.round((covered / trackable) * 100);
};

const toTopicLines = (curriculum) => curriculum.map((item) => item.title).join('\n');

const parseTopics = (text) =>
  text
    .split('\n')
    .map((title) => title.trim())
    .filter(Boolean);

export default function DepartmentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState('overview');
  const [cohortView, setCohortView] = useState('active');
  const [topics, setTopics] = useState('');

  const load = useCallback(
    () =>
      tracker.department(id).then((department) => {
        setTopics(toTopicLines(department.curriculum));
        return department;
      }),
    [id],
  );

  const { data: department, status, error, reload } = useFetch(load, [id]);

  const [isSaving, setIsSaving] = useState(false);
  const [curriculumMessage, setCurriculumMessage] = useState(null);
  // Set when the API reports cohorts mid-delivery; holds the topics to re-submit
  // once the admin has acknowledged that those cohorts keep their own list.
  const [publishWarning, setPublishWarning] = useState(null);

  const [cohortToAssign, setCohortToAssign] = useState(null);
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Roster of whichever cohort's student count was clicked.
  const [rosterCohort, setRosterCohort] = useState(null);
  const [roster, setRoster] = useState({ status: 'loading', students: [] });

  const openRoster = async (cohort) => {
    setRosterCohort(cohort);
    setRoster({ status: 'loading', students: [] });
    try {
      setRoster({ status: 'ready', students: await tracker.cohortStudents(cohort.id) });
    } catch (requestError) {
      setRoster({
        status: 'error',
        students: [],
        message: requestError.response?.data?.message || 'Could not load the roster.',
      });
    }
  };

  /**
   * Publishing is a two-step exchange. The first attempt is refused with the list
   * of cohorts already in progress, which the admin confirms before it goes
   * through; the server owns that list because only it knows every cohort's
   * pinned version.
   */
  const publishCurriculum = async (items, { acknowledge = false } = {}) => {
    setIsSaving(true);
    setCurriculumMessage(null);

    try {
      const published = await tracker.updateCurriculum(id, items, { acknowledge });
      const kept = published.cohortsInProgress;
      setPublishWarning(null);
      await reload({ quiet: true });
      setCurriculumMessage({
        tone: 'success',
        text: kept
          ? `Curriculum v${published.version} published. ${kept} ${kept === 1 ? 'cohort' : 'cohorts'} already in progress kept the list they started with.`
          : `Curriculum v${published.version} published successfully.`,
      });
    } catch (requestError) {
      const data = requestError.response?.data;

      // Not a failure — the publish is being held until the warning is seen.
      if (data?.requiresAcknowledgement) {
        setPublishWarning({ items, cohorts: data.affectedCohorts });
        return;
      }

      setCurriculumMessage({
        tone: 'error',
        text: data?.message || 'Could not publish the curriculum.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveCurriculum = (event) => {
    event.preventDefault();
    const items = parseTopics(topics).map((title) => ({ title }));

    if (!items.length) {
      setCurriculumMessage({ tone: 'error', text: 'Add at least one curriculum topic.' });
      return undefined;
    }

    return publishCurriculum(items);
  };

  const openAssign = (cohort) => {
    setCohortToAssign(cohort);
    setSelectedInstructorId(cohort.instructor?.isActive ? cohort.instructor.id : '');
    setAssignError('');
  };

  const assignInstructor = async (event) => {
    event.preventDefault();

    if (!selectedInstructorId) {
      setAssignError('Choose an instructor to continue.');
      return;
    }

    setIsAssigning(true);
    setAssignError('');

    try {
      await tracker.assignInstructor(cohortToAssign.id, selectedInstructorId);
      await reload({ quiet: true });
      setCohortToAssign(null);
    } catch (requestError) {
      setAssignError(requestError.response?.data?.message || 'Could not assign the instructor.');
    } finally {
      setIsAssigning(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <Alert
        tone="error"
        title="Could not load this department"
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

  const { cohorts, users: eligible, curriculum } = department;

  // Everyone the server will accept as a deliverer here: this department's
  // instructors, plus the heads who head it.
  //
  // A head only *counts* as delivering once they hold a cohort here, so
  // "Instructors" keeps meaning "people delivering" — the same rule
  // `GET /departments` applies to its own totals. The assign dropdown offers the
  // wider list, because taking a cohort on is how a head joins the narrower one.
  const delivering = eligible.filter(
    (person) => person.role === 'INSTRUCTOR' || person.cohorts.length > 0,
  );

  // A HOD may only read instructor profiles — the API answers 404 for any head,
  // including themselves — so those rows stay plain text rather than dead links.
  const canOpenProfile = (person) => isAdmin || person.role === 'INSTRUCTOR';

  const completedCohorts = cohorts.filter((cohort) => cohort.completedAt);
  const inProgressCohorts = cohorts.filter((cohort) => !cohort.completedAt);
  const shownCohorts = cohortView === 'completed' ? completedCohorts : inProgressCohorts;

  const stats = [
    ['Instructors', delivering.length],
    ['Cohorts in progress', inProgressCohorts.length],
    ['Completed cohorts', completedCohorts.length],
    ['Curriculum topics', curriculum.length],
    // Coverage is meaningless without a published curriculum, matching the
    // departments list.
    [
      'Average progress',
      cohorts.length && curriculum.length ? `${averageProgress(cohorts)}%` : '—',
    ],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: 'Departments', to: '/admin' }, { label: department.name }]}
        title={department.name}
        subtitle="Publish the curriculum and monitor how each instructor is delivering it."
        actions={
          <SegmentedControl
            label="Department view"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: 'overview', label: 'Overview' },
              { value: 'curriculum', label: 'Curriculum' },
            ]}
          />
        }
      />

      <div className="flex flex-wrap gap-x-10 gap-y-4 rounded-lg border border-line bg-surface px-5 py-4 shadow-card">
        {stats.map(([label, value]) => (
          <div key={label}>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">{label}</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-ink">{value}</p>
          </div>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <>
          <Panel
            title="Cohorts"
            description={
              cohortView === 'completed'
                ? 'Delivery finished and signed off by the instructor.'
                : 'Assign unstaffed cohorts, or move an ongoing cohort to another instructor.'
            }
            actions={
              completedCohorts.length > 0 && (
                <SegmentedControl
                  label="Cohort status"
                  value={cohortView}
                  onChange={setCohortView}
                  options={[
                    { value: 'active', label: 'In progress', count: inProgressCohorts.length },
                    { value: 'completed', label: 'Completed', count: completedCohorts.length },
                  ]}
                />
              )
            }
          >
            {shownCohorts.length === 0 ? (
              <EmptyState
                icon={cohortView === 'completed' ? CheckCircle2 : Users}
                title={
                  cohortView === 'completed' ? 'No completed cohorts' : 'No cohorts in progress'
                }
                description={
                  cohortView === 'completed'
                    ? 'A cohort appears here once its instructor has covered every topic and marked it completed.'
                    : 'Instructors in this department create cohorts from their own workspace.'
                }
              />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Cohort</TH>
                    <TH align="right">Students</TH>
                    <TH>Instructor</TH>
                    <TH className="w-48">Progress</TH>
                    <TH>{cohortView === 'completed' ? 'Completed' : 'Started'}</TH>
                    <TH align="right">
                      <span className="sr-only">Actions</span>
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {shownCohorts.map((cohort) => {
                    const hasInstructor = Boolean(cohort.instructor?.isActive);
                    const isDone = Boolean(cohort.completedAt);
                    // Pinned below the department's current version: this cohort
                    // started before the latest curriculum was published.
                    const isOutdated =
                      cohort.curriculumVersion &&
                      department.curriculumVersion &&
                      cohort.curriculumVersion.version < department.curriculumVersion.version;
                    return (
                      <TR key={cohort.id} className="hover:bg-surface-raised">
                        <TD className="font-medium text-ink">
                          <span className="flex items-center gap-2">
                            {cohort.name}
                            {isDone && (
                              <Badge tone="success" icon={CheckCircle2}>
                                Completed
                              </Badge>
                            )}
                          </span>
                          {isOutdated && (
                            <p className="mt-0.5 text-xs font-normal text-ink-subtle">
                              Curriculum v{cohort.curriculumVersion.version} ·{' '}
                              {cohort.topicCount} topics
                            </p>
                          )}
                        </TD>
                        <TD align="right" className="text-ink-muted">
                          {cohort._count.enrollments === 0 ? (
                            <span className="text-ink-faint">0</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openRoster(cohort)}
                              className="rounded font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 transition-colors hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                            >
                              {cohort._count.enrollments}
                              <span className="sr-only"> students — view roster</span>
                            </button>
                          )}
                        </TD>
                        <TD>
                          {hasInstructor ? (
                            <span className="text-ink-muted">{cohort.instructor.name}</span>
                          ) : (
                            <Badge tone="warning">Unassigned</Badge>
                          )}
                        </TD>
                        <TD>
                          <div className="flex items-center gap-2.5">
                            <ProgressBar
                              value={cohort.progressPercent}
                              size="sm"
                              className="w-24 shrink-0"
                            />
                            <span className="text-xs font-semibold text-ink-muted">
                              {cohort.progressPercent}%
                            </span>
                          </div>
                        </TD>
                        <TD>
                          <span
                            className="whitespace-nowrap text-ink-muted"
                            title={formatDateTime(cohort.completedAt ?? cohort.createdAt)}
                          >
                            {formatDate(cohort.completedAt ?? cohort.createdAt)}
                          </span>
                        </TD>
                        <TD align="right">
                          {/* Reassigning a finished cohort would rewrite history, so
                              the instructor reopens it first. */}
                          {isDone ? (
                            <span className="text-xs text-ink-faint">Locked</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openAssign(cohort)}
                              disabled={eligible.length === 0}
                            >
                              {hasInstructor ? 'Reassign' : 'Assign'}
                            </Button>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}

            {eligible.length === 0 && cohorts.length > 0 && (
              <div className="border-t border-line px-5 py-4">
                <Alert tone="warning">
                  Add an instructor to this department before cohorts can be assigned. A head of
                  this department can also take a cohort on.
                </Alert>
              </div>
            )}
          </Panel>

          <Panel
            title="Delivery"
            description="Average curriculum coverage across the active cohorts each person is delivering here."
          >
            {delivering.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nobody is delivering yet"
                description="Add an instructor to this department from the Staff page, or assign a cohort to one of its heads."
                action={
                  <Button variant="secondary" to="/admin/staff">
                    Go to staff
                  </Button>
                }
              />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Instructor</TH>
                    <TH align="right">Cohorts</TH>
                    <TH align="right">Students</TH>
                    <TH className="w-56">Average progress</TH>
                  </TR>
                </THead>
                <TBody>
                  {delivering.map((instructor) => {
                    const average = averageProgress(instructor.cohorts);
                    const students = instructor.cohorts.reduce(
                      (total, cohort) => total + cohort._count.enrollments,
                      0,
                    );

                    return (
                      <TR key={instructor.id} className="hover:bg-surface-raised">
                        <TD>
                          <p className="flex items-center gap-2 font-medium text-ink">
                            {canOpenProfile(instructor) ? (
                              <Link
                                to={`/admin/staff/${instructor.id}`}
                                className="rounded transition-colors hover:text-brand-700"
                              >
                                {instructor.name}
                              </Link>
                            ) : (
                              instructor.name
                            )}
                            {instructor.role === 'HOD' && (
                              <Badge tone="brand" icon={ShieldCheck}>
                                Head
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-ink-subtle">@{instructor.username}</p>
                        </TD>
                        <TD align="right" className="text-ink-muted">
                          {instructor.cohorts.length}
                        </TD>
                        <TD align="right" className="text-ink-muted">
                          {students}
                        </TD>
                        <TD>
                          {instructor.cohorts.length === 0 ? (
                            <span className="text-xs text-ink-faint">No cohorts assigned</span>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <ProgressBar value={average} size="sm" className="w-28 shrink-0" />
                              <span className="text-xs font-semibold text-ink-muted">
                                {average}%
                              </span>
                            </div>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </Panel>
        </>
      ) : (
        <Panel
          className="max-w-3xl"
          title="Department curriculum"
          description="One topic per line. Instructors in this department deliver them in this order."
          actions={
            department.curriculumVersion && (
              <Badge tone="neutral">
                v{department.curriculumVersion.version} · published{' '}
                {formatDate(department.curriculumVersion.publishedAt)}
              </Badge>
            )
          }
          footer={
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              {curriculumMessage ? (
                <Alert tone={curriculumMessage.tone} className="sm:flex-1">
                  {curriculumMessage.text}
                </Alert>
              ) : (
                <p className="text-sm text-ink-subtle">
                  Publishing adds a new version. Cohorts already in progress keep the list they
                  started with.
                </p>
              )}
              <Button
                type="submit"
                form="curriculum-form"
                isLoading={isSaving}
                className="shrink-0"
              >
                Publish curriculum
              </Button>
            </div>
          }
        >
          <form id="curriculum-form" onSubmit={saveCurriculum} className="p-5">
            <Field
              as="textarea"
              label="Topics"
              hint="Order matters — students see this sequence on their progress page."
              value={topics}
              onChange={(event) => setTopics(event.target.value)}
              placeholder={'HTML fundamentals\nCSS and responsive design\nJavaScript fundamentals'}
              inputClassName="min-h-80 resize-y font-mono leading-7"
            />
            <p className="mt-2 text-xs text-ink-subtle">
              {parseTopics(topics).length} {parseTopics(topics).length === 1 ? 'topic' : 'topics'}
            </p>
          </form>
        </Panel>
      )}

      <ConfirmDialog
        isOpen={Boolean(publishWarning)}
        onClose={() => setPublishWarning(null)}
        onConfirm={() => publishCurriculum(publishWarning.items, { acknowledge: true })}
        title="Cohorts already in progress"
        confirmLabel="Publish anyway"
        tone="primary"
        isBusy={isSaving}
      >
        <p>
          Changes to the curriculum will not be applied to cohorts that have already started. They
          keep the topics they began with:
        </p>

        <ul className="my-3 divide-y divide-line overflow-hidden rounded-lg border border-line">
          {publishWarning?.cohorts.map((cohort) => (
            <li
              key={cohort.id}
              className="flex items-baseline justify-between gap-3 bg-surface px-3 py-2"
            >
              <span className="font-medium text-ink">{cohort.name}</span>
              <span className="shrink-0 text-xs text-ink-subtle">
                v{cohort.version} · {cohort.topicsCovered} of {cohort.topicCount} covered
              </span>
            </li>
          ))}
        </ul>

        <p>
          The new list applies to cohorts that have not started yet, and to every cohort created
          from now on.
        </p>
      </ConfirmDialog>

      <Modal
        isOpen={Boolean(rosterCohort)}
        onClose={() => setRosterCohort(null)}
        title="Cohort roster"
        description={rosterCohort?.name}
        footer={
          <Button variant="secondary" onClick={() => setRosterCohort(null)}>
            Close
          </Button>
        }
      >
        {roster.status === 'loading' && (
          <div className="space-y-2">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-10 w-full" />
            ))}
          </div>
        )}

        {roster.status === 'error' && <Alert tone="error">{roster.message}</Alert>}

        {roster.status === 'ready' &&
          (roster.students.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nobody enrolled yet"
              description="The instructor enrols students from their own workspace."
            />
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
              {roster.students.map((student) => (
                <li key={student.id} className="flex items-center gap-3 bg-surface px-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-800">
                    {initials(student.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{student.name}</p>
                    <p className="truncate text-xs text-ink-subtle">
                      @{student.username}
                      {student.email ? ` · ${student.email}` : ''}
                    </p>
                  </div>
                  <span
                    className="shrink-0 whitespace-nowrap text-xs text-ink-subtle"
                    title={formatDateTime(student.enrolledAt)}
                  >
                    {formatDate(student.enrolledAt)}
                  </span>
                </li>
              ))}
            </ul>
          ))}
      </Modal>

      <Modal
        isOpen={Boolean(cohortToAssign)}
        onClose={() => setCohortToAssign(null)}
        title={cohortToAssign?.instructor?.isActive ? 'Reassign cohort' : 'Assign instructor'}
        description={cohortToAssign?.name}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCohortToAssign(null)}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button type="submit" form="assign-form" isLoading={isAssigning}>
              Save assignment
            </Button>
          </>
        }
      >
        <form id="assign-form" onSubmit={assignInstructor} className="space-y-4">
          {assignError && <Alert tone="error">{assignError}</Alert>}

          {cohortToAssign?.instructor?.isActive && (
            <p className="text-sm text-ink-muted">
              Currently delivered by{' '}
              <span className="font-semibold text-ink">{cohortToAssign.instructor.name}</span>.
              Recorded progress stays with the cohort.
            </p>
          )}

          <Field
            as="select"
            label="Instructor"
            hint="A head of this department can deliver a cohort themselves."
            value={selectedInstructorId}
            onChange={(event) => setSelectedInstructorId(event.target.value)}
            required
          >
            <option value="">Select an instructor</option>
            {eligible.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
                {person.id === user?.id ? ' (you)' : ''}
                {person.role === 'HOD' ? ' · Head of Department' : ''} ·{' '}
                {person.cohorts.length} cohorts
              </option>
            ))}
          </Field>
        </form>
      </Modal>
    </div>
  );
}
