import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  GraduationCap,
  KeyRound,
  RotateCw,
  SearchX,
  UserCheck,
  UserX,
} from 'lucide-react';
import { tracker } from '../../api/services/trackerService';
import { useAuth } from '../../context/authContext';
import useFetch from '../../hooks/useFetch';
import useListControls from '../../hooks/useListControls';
import { downloadCsv } from '../../utils/csv';
import { formatDate, formatDateTime } from '../../utils/dateFormatter';
import { statusLabels, statusOrder } from '../../utils/studentStatus';
import Alert from '../../components/ui/Alert';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import Panel from '../../components/ui/Panel';
import ProgressBar from '../../components/ui/ProgressBar';
import SearchInput from '../../components/ui/SearchInput';
import SegmentedControl from '../../components/ui/SegmentedControl';
import Skeleton from '../../components/ui/Skeleton';
import PasswordResetModal from '../../components/account/PasswordResetModal';
import StudentStatusBadge from '../../components/account/StudentStatusBadge';
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table';

// Stable reference so useListControls' memo does not recompute on every render.
const EMPTY = [];

const departmentNames = (student) => student.departments.map((d) => d.name).join(', ');

const cohortNames = (student) => student.cohorts.map((c) => c.name).join(', ');

export default function StudentList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const { data, status, error, reload } = useFetch(
    () =>
      Promise.all([tracker.students(), tracker.departments()]).then(
        ([studentRows, departmentRows]) => ({ students: studentRows, departments: departmentRows }),
      ),
    [],
  );

  const students = data?.students ?? EMPTY;
  // A head of department is only sent their own, so the filter offers exactly what
  // the list can contain either way.
  const departments = data?.departments ?? EMPTY;

  const [passwordTarget, setPasswordTarget] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // { type, student }
  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const { rows, query, setQuery, filterValues, setFilter, sort, toggleSort, reset } =
    useListControls(students, {
      // Cohort names are searchable because "who is in cohort1" is the question this
      // page is most often opened to answer.
      searchKeys: ['name', 'username', 'email', departmentNames, cohortNames],
      filters: {
        progress: (row, value) => row.status === value,
        department: (row, value) => row.departments.some((d) => d.id === value),
        account: (row, value) => (value === 'active' ? row.isActive : !row.isActive),
      },
      initialFilters: { account: 'active' },
      sorters: {
        name: (row) => row.name,
        departments: departmentNames,
        cohorts: (row) => row.cohorts.length,
        progress: (row) => statusOrder[row.status],
        covered: (row) => row.progressPercent,
        registered: (row) => new Date(row.createdAt).getTime(),
      },
      initialSort: { key: 'name', direction: 'asc' },
    });

  const activeCount = students.filter((student) => student.isActive).length;
  const deactivatedCount = students.length - activeCount;
  const viewingDeactivated = filterValues.account === 'inactive';

  /**
   * The rows on screen, in the order they are on screen — the search, the filters and
   * the sort all carry through, which is the whole reason this is built here rather
   * than asked of the API.
   */
  const exportRows = () => {
    downloadCsv(
      `students-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'Name',
        'Username',
        'Email',
        'Departments',
        'Cohorts',
        'Status',
        'Topics covered',
        'Topics total',
        'Progress %',
        'Account',
        'Registered',
      ],
      rows.map((student) => [
        student.name,
        student.username,
        student.email ?? '',
        departmentNames(student),
        cohortNames(student),
        statusLabels[student.status],
        student.topicsCovered,
        student.topicCount,
        student.progressPercent,
        student.isActive ? 'Active' : 'Deactivated',
        formatDate(student.createdAt),
      ]),
    );
    setNotice(`${rows.length} ${rows.length === 1 ? 'student' : 'students'} exported, matching what is shown here.`);
  };

  /**
   * The modal validates and reports its own failures; what belongs here is what
   * happens to the list afterwards. Throwing back to it is deliberate — a rejected
   * request must render inside the modal, where the fields still are.
   */
  const submitPasswordReset = async (newPassword) => {
    await tracker.resetStudentPassword(passwordTarget.id, newPassword);
    setNotice(
      `${passwordTarget.name}'s password has been changed. Pass it on to them, and ask them to set their own from their profile.`,
    );
    setPasswordTarget(null);
  };

  const runPendingAction = async () => {
    const { type, student } = pendingAction;
    setIsActing(true);
    setActionError('');

    try {
      if (type === 'deactivate') {
        await tracker.deactivateStudent(student.id);
        setNotice(
          `${student.name} has been deactivated and can no longer sign in. They stay on their cohort's roster, and you can restore the account from the Deactivated tab.`,
        );
      } else {
        await tracker.reactivateStudent(student.id);
        setNotice(`${student.name} can sign in again with their existing password.`);
      }
      await reload({ quiet: true });
      setPendingAction(null);
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message ||
          `Could not ${type} ${student.name}. Please try again.`,
      );
      setPendingAction(null);
    } finally {
      setIsActing(false);
    }
  };

  const emptyForFilter = () => {
    if (viewingDeactivated && !query) {
      return (
        <EmptyState
          icon={UserCheck}
          title="No deactivated accounts"
          description="Every student account is currently active."
        />
      );
    }

    return (
      <EmptyState
        icon={SearchX}
        title="No students match those filters"
        action={
          <Button variant="secondary" onClick={reset}>
            Clear filters
          </Button>
        }
      />
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle={
          isAdmin
            ? 'Everyone who has registered, the courses they are taking and how far each has got.'
            : 'Students in your departments, the courses they are taking and how far each has got.'
        }
        actions={
          <Button
            variant="secondary"
            icon={Download}
            onClick={exportRows}
            disabled={rows.length === 0}
          >
            Export CSV
          </Button>
        }
      />

      {status === 'error' && (
        <Alert
          tone="error"
          title="Could not load students"
          action={
            <Button size="sm" variant="secondary" icon={RotateCw} onClick={() => reload()}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {actionError && <Alert tone="error">{actionError}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {status === 'loading' && (
        <Panel>
          <div className="divide-y divide-line">
            {[0, 1, 2, 3, 4].map((key) => (
              <div key={key} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </Panel>
      )}

      {status === 'ready' && students.length === 0 && (
        <Panel>
          <EmptyState
            icon={GraduationCap}
            title={isAdmin ? 'No students have registered yet' : 'No students in your departments yet'}
            description="Students appear here as soon as they sign up, whether or not an instructor has enrolled them."
          />
        </Panel>
      )}

      {status === 'ready' && students.length > 0 && (
        <Panel
          title={`${rows.length} shown`}
          description={
            viewingDeactivated
              ? 'These accounts cannot sign in. Reactivating restores their existing password.'
              : undefined
          }
          actions={
            <>
              <SearchInput
                value={query}
                onChange={setQuery}
                label="Search students"
                placeholder="Name, username or cohort…"
                className="w-full sm:w-56"
              />
              {/* A `<select>` rather than a SegmentedControl: that control is
                  `inline-flex` and does not wrap, so four labelled options would
                  overflow the panel on a phone. */}
              <select
                aria-label="Filter by progress"
                className="field sm:w-40"
                value={filterValues.progress}
                onChange={(event) => setFilter('progress', event.target.value)}
              >
                <option value="all">All progress</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="NOT_ENROLLED">Not enrolled</option>
              </select>
              <select
                aria-label="Filter by department"
                className="field sm:w-44"
                value={filterValues.department}
                onChange={(event) => setFilter('department', event.target.value)}
              >
                <option value="all">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <SegmentedControl
                label="Filter by account status"
                value={filterValues.account}
                onChange={(value) => setFilter('account', value)}
                options={[
                  { value: 'active', label: 'Active', count: activeCount },
                  { value: 'inactive', label: 'Deactivated', count: deactivatedCount },
                ]}
              />
            </>
          }
        >
          {rows.length === 0 ? (
            emptyForFilter()
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH sortKey="name" sort={sort} onSort={toggleSort}>
                    Student
                  </TH>
                  <TH sortKey="departments" sort={sort} onSort={toggleSort}>
                    Departments
                  </TH>
                  <TH sortKey="cohorts" sort={sort} onSort={toggleSort} align="right">
                    Cohorts
                  </TH>
                  <TH sortKey="progress" sort={sort} onSort={toggleSort}>
                    Status
                  </TH>
                  <TH sortKey="covered" sort={sort} onSort={toggleSort}>
                    Progress
                  </TH>
                  <TH sortKey="registered" sort={sort} onSort={toggleSort}>
                    Registered
                  </TH>
                  <TH align="right">
                    <span className="sr-only">Actions</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((student) => (
                  <TR key={student.id} className="hover:bg-surface-raised">
                    <TD>
                      <Link
                        to={`/admin/students/${student.id}`}
                        className="flex items-center gap-3 rounded transition-colors hover:text-brand-700"
                      >
                        <Avatar
                          name={student.name}
                          className="h-9 w-9 text-xs"
                          fallbackClassName={
                            student.isActive
                              ? 'bg-brand-100 text-brand-800'
                              : 'bg-surface-sunken text-ink-faint'
                          }
                        />
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium">
                            <span className={student.isActive ? 'text-ink' : 'text-ink-subtle'}>
                              {student.name}
                            </span>
                            {!student.isActive && <Badge tone="neutral">Deactivated</Badge>}
                          </p>
                          <p className="truncate text-xs text-ink-subtle">
                            @{student.username}
                            {student.email ? ` · ${student.email}` : ''}
                          </p>
                        </div>
                      </Link>
                    </TD>
                    <TD>
                      {student.departments.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {student.departments.map((department) => (
                            <Badge key={department.id} tone="neutral">
                              {department.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        // Not "Unassigned": nobody failed to assign them, they
                        // registered without choosing a department.
                        <span className="text-ink-faint">None</span>
                      )}
                    </TD>
                    <TD align="right">
                      {/* The names go in a tooltip rather than the cell: a student in
                          three cohorts would otherwise widen the table for everyone. */}
                      <span title={cohortNames(student) || undefined}>
                        <Badge tone={student.cohorts.length > 0 ? 'brand' : 'neutral'}>
                          {student.cohorts.length}
                        </Badge>
                      </span>
                    </TD>
                    <TD>
                      <StudentStatusBadge status={student.status} />
                    </TD>
                    <TD>
                      {student.topicCount === 0 ? (
                        <span className="text-xs text-ink-faint">—</span>
                      ) : (
                        <div className="flex items-center gap-3 sm:w-36">
                          <ProgressBar value={student.progressPercent} className="flex-1" size="sm" />
                          <span className="whitespace-nowrap text-xs tabular-nums text-ink-muted">
                            {student.topicsCovered} of {student.topicCount}
                          </span>
                        </div>
                      )}
                    </TD>
                    <TD>
                      <span
                        className="whitespace-nowrap text-ink-muted"
                        title={formatDateTime(student.createdAt)}
                      >
                        {formatDate(student.createdAt)}
                      </span>
                    </TD>
                    <TD align="right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Icon-only, unlike StaffList's labelled pair: this table carries
                            two columns more, and with both labels it wanted 1242px inside a
                            1118px container at 1440 — so deactivate, the consequential
                            action, sat behind a horizontal scroll on a normal laptop. The
                            one that keeps its words is the one whose label also reports the
                            account's state.

                            A reset works on a deactivated account too: setting the
                            password before restoring it is the useful order. */}
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={KeyRound}
                          aria-label={`Reset ${student.name}'s password`}
                          title="Reset password"
                          onClick={() => setPasswordTarget(student)}
                        />
                        {student.isActive ? (
                          <Button
                            size="sm"
                            variant="danger-quiet"
                            icon={UserX}
                            onClick={() => setPendingAction({ type: 'deactivate', student })}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={UserCheck}
                            onClick={() => setPendingAction({ type: 'reactivate', student })}
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>
      )}

      {/* Rendered only when there is a target, so the modal owns its two fields and
          they reset with it. */}
      {passwordTarget && (
        <PasswordResetModal
          person={passwordTarget}
          onClose={() => setPasswordTarget(null)}
          onSubmit={submitPasswordReset}
        />
      )}

      <ConfirmDialog
        isOpen={pendingAction?.type === 'deactivate'}
        onClose={() => setPendingAction(null)}
        onConfirm={runPendingAction}
        title="Deactivate student?"
        confirmLabel="Deactivate"
        tone="danger"
        isBusy={isActing}
      >
        {pendingAction?.student && (
          <>
            <strong className="font-semibold text-ink">{pendingAction.student.name}</strong> will no
            longer be able to sign in. They stay enrolled and still appear on their cohort's roster,
            because progress is recorded against the cohort rather than the student — no number
            anyone sees will change. You can reactivate the account at any time.
          </>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={pendingAction?.type === 'reactivate'}
        onClose={() => setPendingAction(null)}
        onConfirm={runPendingAction}
        title="Reactivate student?"
        confirmLabel="Reactivate"
        tone="primary"
        isBusy={isActing}
      >
        {pendingAction?.student && (
          <>
            <strong className="font-semibold text-ink">{pendingAction.student.name}</strong> will be
            able to sign in again with their existing password, and will see the same courses they
            had before. Reset their password instead if they have forgotten it.
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
