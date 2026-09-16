import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle2, KeyRound, RotateCw, UserCheck, UserX } from 'lucide-react';
import { tracker } from '../../api/services/trackerService';
import useFetch from '../../hooks/useFetch';
import { formatDate } from '../../utils/dateFormatter';
import Alert from '../../components/ui/Alert';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import Panel from '../../components/ui/Panel';
import ProgressBar from '../../components/ui/ProgressBar';
import Skeleton from '../../components/ui/Skeleton';
import PasswordResetModal from '../../components/account/PasswordResetModal';
import StudentStatusBadge from '../../components/account/StudentStatusBadge';
import TopicTimeline from '../../components/curriculum/TopicTimeline';

/**
 * One student, topic by topic — the same view of their progress the student has of
 * their own, read by a manager.
 *
 * Unlike `StaffProfile`, which only reads, the three account actions are here as well
 * as on the list: a manager following a link from a cohort roster or a search result
 * arrives here, and sending them back to the list to unlock somebody would be busywork.
 *
 * The API answers 404 rather than 403 for a student outside the caller's scope, so a
 * head of department following a stale link sees "not found", never who exists
 * elsewhere.
 */
export default function StudentProfile() {
  const { id } = useParams();
  const { data, status, error, reload } = useFetch(() => tracker.student(id), [id]);

  const [isResetting, setIsResetting] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'deactivate' | 'reactivate'
  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const submitPasswordReset = async (newPassword) => {
    await tracker.resetStudentPassword(id, newPassword);
    setNotice(
      `${data.name}'s password has been changed. Pass it on to them, and ask them to set their own once they are back in.`,
    );
    setIsResetting(false);
  };

  const runPendingAction = async () => {
    setIsActing(true);
    setActionError('');

    try {
      if (pendingAction === 'deactivate') {
        await tracker.deactivateStudent(id);
        setNotice(`${data.name} can no longer sign in. Their enrolments and progress are untouched.`);
      } else {
        await tracker.reactivateStudent(id);
        setNotice(`${data.name} can sign in again with their existing password.`);
      }
      await reload({ quiet: true });
      setPendingAction(null);
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message ||
          `Could not ${pendingAction} this account. Please try again.`,
      );
      setPendingAction(null);
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: 'Students', to: '/admin/students' },
          { label: data?.name ?? 'Student' },
        ]}
        title={data?.name ?? 'Student'}
        subtitle="Every course they are enrolled in, and which topics their cohort has covered."
        actions={
          data && (
            <>
              <Button variant="secondary" icon={ArrowLeft} to="/admin/students">
                Back to students
              </Button>
              <Button variant="secondary" icon={KeyRound} onClick={() => setIsResetting(true)}>
                Reset password
              </Button>
              {data.isActive ? (
                <Button
                  variant="danger-quiet"
                  icon={UserX}
                  onClick={() => setPendingAction('deactivate')}
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  icon={UserCheck}
                  onClick={() => setPendingAction('reactivate')}
                >
                  Reactivate
                </Button>
              )}
            </>
          )
        }
      />

      {status === 'error' && (
        <Alert
          tone="error"
          title="Could not load this student"
          action={
            <Button size="sm" variant="secondary" icon={RotateCw} onClick={() => reload()}>
              Retry
            </Button>
          }
        >
          {error}{' '}
          <Link to="/admin/students" className="font-semibold underline">
            Return to the student list
          </Link>
          .
        </Alert>
      )}

      {actionError && <Alert tone="error">{actionError}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {status === 'loading' && (
        <Panel>
          <div className="flex items-center gap-5 p-5">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
          </div>
        </Panel>
      )}

      {status === 'ready' && data && (
        <>
          <Panel>
            <div className="flex flex-col items-center gap-5 p-5 text-center sm:flex-row sm:items-start sm:text-left">
              {/* A student has no way to upload a picture yet, so this is initials
                  today — the same component the staff profile uses, for the day
                  they do. */}
              <Avatar
                src={data.avatarUrl}
                name={data.name}
                className="h-20 w-20 shrink-0 text-2xl ring-1 ring-line"
                fallbackClassName="bg-brand-100 text-brand-800"
              />

              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold tracking-tight text-ink">{data.name}</h2>
                <p className="mt-0.5 text-sm text-ink-subtle">
                  @{data.username}
                  {data.email ? ` · ${data.email}` : ''}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                  <StudentStatusBadge status={data.status} />
                  {data.departments.map((department) => (
                    <Badge key={department.id}>{department.name}</Badge>
                  ))}
                  {!data.isActive && <Badge tone="danger">Deactivated</Badge>}
                </div>

                <p className="mt-3 text-xs text-ink-subtle">
                  Registered {formatDate(data.createdAt)}
                </p>

                {data.topicCount > 0 && (
                  <div className="mt-4">
                    <ProgressBar
                      value={data.progressPercent}
                      label={`${data.topicsCovered} of ${data.topicCount} topics covered across ${data.courses.length === 1 ? 'their course' : `${data.courses.length} courses`}`}
                      showValue
                    />
                  </div>
                )}
              </div>
            </div>
          </Panel>

          {data.courses.length === 0 ? (
            <Panel>
              <EmptyState
                icon={BookOpen}
                title="Not enrolled in anything"
                description="They have an account but no active cohort. An instructor enrols them by username from their own workspace."
              />
            </Panel>
          ) : (
            data.courses.map(({ cohort, curriculum, progressPercent }) => {
              const covered = curriculum.filter((item) => item.isCompleted).length;
              // The one case where the badge and the bar look like they disagree:
              // `completedAt` is the instructor's sign-off, so a cohort can sit at
              // 100% and still read in progress. Said in words rather than left to
              // look like a bug.
              const awaitingSignOff =
                curriculum.length > 0 && covered === curriculum.length && !cohort.completedAt;

              return (
                <Panel
                  key={cohort.id}
                  title={cohort.name}
                  description={
                    <>
                      <Link
                        to={`/admin/department/${cohort.department.id}`}
                        className="font-medium underline transition-colors hover:text-brand-700"
                      >
                        {cohort.department.name}
                      </Link>
                      {` · ${cohort.instructor} · ${covered} of ${curriculum.length} topics`}
                      {cohort.completedAt && ` · completed ${formatDate(cohort.completedAt)}`}
                    </>
                  }
                  actions={
                    <div className="flex items-center gap-3 sm:w-56">
                      {cohort.completedAt && (
                        <Badge tone="success" icon={CheckCircle2} className="shrink-0">
                          Signed off
                        </Badge>
                      )}
                      <ProgressBar value={progressPercent} className="flex-1" />
                      <span className="w-9 shrink-0 text-right text-sm font-bold tabular-nums text-ink">
                        {progressPercent}%
                      </span>
                    </div>
                  }
                >
                  {curriculum.length === 0 ? (
                    <EmptyState
                      icon={BookOpen}
                      title="No curriculum published"
                      description="This department has not published any topics, so there is nothing for the instructor to record yet."
                    />
                  ) : (
                    <>
                      {awaitingSignOff && (
                        <div className="px-5 pt-5">
                          <Alert tone="info" title="Every topic is covered">
                            The instructor has not marked delivery finished, so this course still
                            counts as in progress. They complete it from their own workspace.
                          </Alert>
                        </div>
                      )}
                      <TopicTimeline curriculum={curriculum} />
                    </>
                  )}
                </Panel>
              );
            })
          )}
        </>
      )}

      {isResetting && data && (
        <PasswordResetModal
          person={data}
          onClose={() => setIsResetting(false)}
          onSubmit={submitPasswordReset}
        />
      )}

      <ConfirmDialog
        isOpen={pendingAction === 'deactivate'}
        onClose={() => setPendingAction(null)}
        onConfirm={runPendingAction}
        title="Deactivate student?"
        confirmLabel="Deactivate"
        tone="danger"
        isBusy={isActing}
      >
        <strong className="font-semibold text-ink">{data?.name}</strong> will no longer be able to
        sign in. They stay enrolled and still appear on their cohort's roster, because progress is
        recorded against the cohort rather than the student — no number anyone sees will change. You
        can reactivate the account at any time.
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={pendingAction === 'reactivate'}
        onClose={() => setPendingAction(null)}
        onConfirm={runPendingAction}
        title="Reactivate student?"
        confirmLabel="Reactivate"
        tone="primary"
        isBusy={isActing}
      >
        <strong className="font-semibold text-ink">{data?.name}</strong> will be able to sign in
        again with their existing password, and will see the same courses they had before. Reset
        their password instead if they have forgotten it.
      </ConfirmDialog>
    </div>
  );
}
