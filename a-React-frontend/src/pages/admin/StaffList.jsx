import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  KeyRound,
  Pencil,
  Plus,
  RotateCw,
  SearchX,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { tracker } from '../../api/services/trackerService';
import { useAuth } from '../../context/authContext';
import useFetch from '../../hooks/useFetch';
import useListControls from '../../hooks/useListControls';
import { formatDate, formatDateTime } from '../../utils/dateFormatter';
import Alert from '../../components/ui/Alert';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import Field from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import Panel from '../../components/ui/Panel';
import SearchInput from '../../components/ui/SearchInput';
import SegmentedControl from '../../components/ui/SegmentedControl';
import Skeleton from '../../components/ui/Skeleton';
import StaffFormFields from '../../components/staff/StaffFormFields';
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table';

const emptyForm = {
  role: 'INSTRUCTOR',
  name: '',
  username: '',
  email: '',
  password: '',
  departmentId: '',
  departmentIds: [],
};

const emptyPasswordForm = { newPassword: '', confirmPassword: '' };

// Matches `MIN_PASSWORD` in the API's shared profile helpers.
const MIN_PASSWORD = 8;

// Stable reference so useListControls' memo does not recompute on every render.
const EMPTY = [];

const cohortsLabel = (count) => `${count} ${count === 1 ? 'cohort' : 'cohorts'}`;

const roleLabels = { INSTRUCTOR: 'Instructor', HOD: 'Head of Department' };

const departmentNames = (person) =>
  person.departments?.length ? person.departments.map((d) => d.name).join(', ') : null;

export default function StaffList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const { data, status, error, reload } = useFetch(
    () =>
      Promise.all([tracker.staff(), tracker.departments()]).then(([staffRows, departmentRows]) => ({
        staff: staffRows,
        departments: departmentRows,
      })),
    [],
  );

  const staff = data?.staff ?? EMPTY;
  const departments = data?.departments ?? EMPTY;

  // One piece of state for the form modal: null closed, 'new' creating, or the
  // person being edited. The two share every field but the temporary password.
  const [formTarget, setFormTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [cohortWarning, setCohortWarning] = useState(null); // { person, cohorts }

  const [passwordTarget, setPasswordTarget] = useState(null);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordError, setPasswordError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const [pendingAction, setPendingAction] = useState(null); // { type, person }
  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const { rows, query, setQuery, filterValues, setFilter, sort, toggleSort, reset } =
    useListControls(staff, {
      searchKeys: ['name', 'username', 'email', (row) => departmentNames(row) ?? ''],
      filters: {
        status: (row, value) => (value === 'active' ? row.isActive : !row.isActive),
        role: (row, value) => row.role === value,
        department: (row, value) => row.departments?.some((d) => d.id === value),
      },
      initialFilters: { status: 'active' },
      sorters: {
        name: (row) => row.name,
        role: (row) => row.role,
        department: (row) => departmentNames(row) ?? '',
        cohorts: (row) => row.activeCohorts,
        updated: (row) => new Date(row.updatedAt).getTime(),
      },
      initialSort: { key: 'name', direction: 'asc' },
    });

  const activeCount = staff.filter((person) => person.isActive).length;
  const deactivatedCount = staff.length - activeCount;
  const viewingDeactivated = filterValues.status === 'inactive';

  const editing = formTarget === 'new' ? null : formTarget;
  const isHodForm = form.role === 'HOD';

  const openCreate = () => {
    setFormTarget('new');
    setForm(emptyForm);
    setFormError('');
  };

  const openEdit = (person) => {
    setFormTarget(person);
    // Seeded from the row: `GET /staff` normalises both shapes into `departments`,
    // so neither key needs a fetch — a head's set is all of them, an instructor's
    // single department is the only one.
    setForm({
      role: person.role,
      name: person.name,
      username: person.username,
      email: person.email ?? '',
      password: '',
      departmentIds: person.departments?.map((department) => department.id) ?? [],
      departmentId: person.departments?.[0]?.id ?? '',
    });
    setFormError('');
  };

  const closeForm = () => {
    setFormTarget(null);
    setForm(emptyForm);
    setFormError('');
  };

  const create = async () => {
    setIsSubmitting(true);
    setFormError('');

    try {
      await tracker.addStaff({
        role: form.role,
        name: form.name,
        username: form.username,
        password: form.password,
        email: form.email.trim() || undefined,
        ...(isHodForm ? { departmentIds: form.departmentIds } : { departmentId: form.departmentId }),
      });
      await reload({ quiet: true });
      setNotice(
        isHodForm
          ? `${form.name.trim()} can now sign in and manage ${form.departmentIds.length === 1 ? 'their department' : `${form.departmentIds.length} departments`}.`
          : `${form.name.trim()} can now sign in and create cohorts.`,
      );
      closeForm();
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || 'Could not create the account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Every field is sent every time, even untouched ones — the API treats an absent
   * key as "leave it alone", which suits a partial client but not a whole form.
   *
   * `acknowledge` is the second attempt after the API has listed the cohorts this
   * will unassign, the same exchange publishing a curriculum uses.
   */
  const saveEdit = async (person, { acknowledge = false } = {}) => {
    setIsSubmitting(true);
    setFormError('');

    try {
      await tracker.updateStaff(
        person.id,
        {
          role: form.role,
          name: form.name,
          username: form.username,
          // Trimmed to empty rather than omitted, which is how an email is cleared.
          email: form.email.trim(),
          ...(isHodForm
            ? { departmentIds: form.departmentIds }
            : { departmentId: form.departmentId }),
        },
        { acknowledge },
      );
      await reload({ quiet: true });
      setNotice(
        form.role === person.role
          ? `${form.name.trim()}'s account has been updated.`
          : `${form.name.trim()} is now ${form.role === 'HOD' ? 'a head of department' : 'an instructor'}, and keeps their old permissions until they next sign in.`,
      );
      setCohortWarning(null);
      closeForm();
    } catch (requestError) {
      const data = requestError.response?.data;

      // Not a failure — the save is being held until the admin has seen the list.
      if (data?.requiresAcknowledgement) {
        // The form closes as the dialog opens rather than nesting: Modal traps
        // focus, and two traps would fight over it. Cancelling puts it back, and
        // `form` is left alone so nothing typed is lost either way.
        setFormTarget(null);
        setCohortWarning({ person, cohorts: data.affectedCohorts });
        return;
      }

      const message = data?.message || 'Could not save the changes.';
      // Confirming happens with the form closed, so its inline Alert would go
      // unread — that failure belongs on the page, with the row actions' errors.
      if (acknowledge) {
        setCohortWarning(null);
        setActionError(message);
      } else {
        setFormError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();

    if (isHodForm && form.departmentIds.length === 0) {
      setFormError('Select at least one department for a head of department.');
      return;
    }

    if (editing) saveEdit(editing);
    else create();
  };

  const cancelCohortWarning = () => {
    setFormTarget(cohortWarning?.person ?? null);
    setCohortWarning(null);
  };

  const openPasswordReset = () => {
    // Again one modal at a time. `form` survives, so this is a detour out of the
    // edit form and back, not a discard.
    setPasswordTarget(editing);
    setFormTarget(null);
    setPasswordForm(emptyPasswordForm);
    setPasswordError('');
  };

  const cancelPasswordReset = () => {
    setFormTarget(passwordTarget);
    setPasswordTarget(null);
    setPasswordForm(emptyPasswordForm);
    setPasswordError('');
  };

  const submitPasswordReset = async (event) => {
    event.preventDefault();

    // Checked here as well as by the API so a typo costs no round trip; the
    // confirmation field is the client's alone — only one password is sent.
    if (passwordForm.newPassword.length < MIN_PASSWORD) {
      setPasswordError(`The new password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('The two passwords do not match.');
      return;
    }

    setIsResetting(true);
    setPasswordError('');

    try {
      await tracker.resetStaffPassword(passwordTarget.id, passwordForm.newPassword);
      // Only for the Last updated column — nothing else about the row moves.
      await reload({ quiet: true });
      setNotice(
        `${passwordTarget.name}'s password has been changed. Pass it on to them, and ask them to set their own from their profile.`,
      );
      setPasswordTarget(null);
      setPasswordForm(emptyPasswordForm);
      closeForm();
    } catch (requestError) {
      setPasswordError(
        requestError.response?.data?.message || 'Could not change the password.',
      );
    } finally {
      setIsResetting(false);
    }
  };

  const runPendingAction = async () => {
    const { type, person } = pendingAction;
    setIsActing(true);
    setActionError('');

    try {
      if (type === 'deactivate') {
        await tracker.deactivateStaff(person.id);
        setNotice(
          `${person.name} has been deactivated and can no longer sign in. You can restore the account from the Deactivated tab.`,
        );
      } else {
        await tracker.reactivateStaff(person.id);
        setNotice(`${person.name} can sign in again with their existing password.`);
      }
      await reload({ quiet: true });
      setPendingAction(null);
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message ||
          `Could not ${type} ${person.name}. Please try again.`,
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
          description="Every staff account is currently active."
        />
      );
    }

    return (
      <EmptyState
        icon={SearchX}
        title="No accounts match those filters"
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
        title="Staff"
        subtitle={
          isAdmin
            ? 'Instructor and head-of-department accounts, their departments, and how many cohorts each is running.'
            : 'Instructors in your departments, and how many cohorts each is running.'
        }
        actions={
          <Button
            icon={Plus}
            onClick={openCreate}
            disabled={status === 'ready' && departments.length === 0}
          >
            Add account
          </Button>
        }
      />

      {status === 'error' && (
        <Alert
          tone="error"
          title="Could not load staff accounts"
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

      {status === 'ready' && departments.length === 0 && (
        <Alert tone="warning" title="No departments yet">
          Every staff account belongs to a department. Create one first, then add accounts.
        </Alert>
      )}

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

      {status === 'ready' && staff.length === 0 && (
        <Panel>
          <EmptyState
            icon={Users}
            title="No staff accounts yet"
            description="Add an instructor or a head of department to start tracking delivery."
            action={
              departments.length > 0 && (
                <Button icon={Plus} onClick={openCreate}>
                  Add account
                </Button>
              )
            }
          />
        </Panel>
      )}

      {status === 'ready' && staff.length > 0 && (
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
                label="Search staff"
                placeholder="Name or username…"
                className="w-full sm:w-56"
              />
              {/* A HOD only ever sees instructors, so the role filter would be a
                  single-option control for them. */}
              {isAdmin && (
                <select
                  aria-label="Filter by role"
                  className="field sm:w-40"
                  value={filterValues.role}
                  onChange={(event) => setFilter('role', event.target.value)}
                >
                  <option value="all">All roles</option>
                  <option value="INSTRUCTOR">Instructors</option>
                  <option value="HOD">Heads of Department</option>
                </select>
              )}
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
                value={filterValues.status}
                onChange={(value) => setFilter('status', value)}
                options={[
                  { value: 'active', label: 'Active', count: activeCount },
                  { value: 'inactive', label: 'Deactivated', count: deactivatedCount },
                  { value: 'all', label: 'All', count: staff.length },
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
                    Name
                  </TH>
                  {isAdmin && (
                    <TH sortKey="role" sort={sort} onSort={toggleSort}>
                      Role
                    </TH>
                  )}
                  <TH sortKey="department" sort={sort} onSort={toggleSort}>
                    {isAdmin ? 'Departments' : 'Department'}
                  </TH>
                  <TH sortKey="cohorts" sort={sort} onSort={toggleSort} align="right">
                    Active cohorts
                  </TH>
                  <TH sortKey="updated" sort={sort} onSort={toggleSort}>
                    Last updated
                  </TH>
                  <TH align="right">
                    <span className="sr-only">Actions</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((person) => (
                  <TR key={person.id} className="hover:bg-surface-raised">
                    <TD>
                      {/* The whole name block links through to the profile — this is
                          the way in to someone's cohorts, current and completed. */}
                      <Link
                        to={`/admin/staff/${person.id}`}
                        className="flex items-center gap-3 rounded transition-colors hover:text-brand-700"
                      >
                        <Avatar
                          src={person.avatarUrl}
                          name={person.name}
                          className="h-9 w-9 text-xs"
                          fallbackClassName={
                            person.isActive
                              ? 'bg-brand-100 text-brand-800'
                              : 'bg-surface-sunken text-ink-faint'
                          }
                        />
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium">
                            <span className={person.isActive ? 'text-ink' : 'text-ink-subtle'}>
                              {person.name}
                            </span>
                            {!person.isActive && <Badge tone="neutral">Deactivated</Badge>}
                          </p>
                          <p className="truncate text-xs text-ink-subtle">
                            @{person.username}
                            {person.email ? ` · ${person.email}` : ''}
                          </p>
                        </div>
                      </Link>
                    </TD>
                    {isAdmin && (
                      <TD>
                        {person.role === 'HOD' ? (
                          <Badge tone="brand" icon={ShieldCheck}>
                            {roleLabels.HOD}
                          </Badge>
                        ) : (
                          <span className="text-ink-muted">{roleLabels.INSTRUCTOR}</span>
                        )}
                      </TD>
                    )}
                    <TD className="text-ink-muted">
                      {departmentNames(person) ?? <span className="text-ink-faint">Unassigned</span>}
                    </TD>
                    <TD align="right">
                      {/* A head of department can hold cohorts of their own now, so
                          this is a real number for both roles. */}
                      <Badge tone={person.activeCohorts > 0 ? 'brand' : 'neutral'}>
                        {person.activeCohorts}
                      </Badge>
                    </TD>
                    <TD>
                      <span
                        className="whitespace-nowrap text-ink-muted"
                        title={formatDateTime(person.updatedAt)}
                      >
                        {formatDate(person.updatedAt)}
                      </span>
                    </TD>
                    <TD align="right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Editing works on a deactivated account too — putting it
                            right before restoring it is the useful order. */}
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={Pencil}
                          onClick={() => openEdit(person)}
                        >
                          Edit
                        </Button>
                        {person.isActive ? (
                          <Button
                            size="sm"
                            variant="danger-quiet"
                            icon={UserX}
                            onClick={() => setPendingAction({ type: 'deactivate', person })}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={UserCheck}
                            onClick={() => setPendingAction({ type: 'reactivate', person })}
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

      <Modal
        isOpen={formTarget !== null}
        onClose={closeForm}
        title={editing ? 'Edit staff account' : 'Add staff account'}
        description={
          editing
            ? `Editing ${editing.name}. Their password is set separately.`
            : 'They sign in with this username. Instructors create cohorts; heads of department manage their departments.'
        }
        footer={
          <>
            {editing && (
              <Button
                variant="secondary"
                // Away from the two actions it is not an alternative to, except on a
                // phone, where there is no room for three across: there it takes a
                // row of its own above them instead of being clipped.
                className="w-full sm:mr-auto sm:w-auto"
                icon={KeyRound}
                onClick={openPasswordReset}
                disabled={isSubmitting}
              >
                Reset password…
              </Button>
            )}
            <Button variant="secondary" onClick={closeForm} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="staff-form" isLoading={isSubmitting}>
              {editing ? 'Save changes' : 'Create account'}
            </Button>
          </>
        }
      >
        <form id="staff-form" onSubmit={submit} className="space-y-4">
          {formError && <Alert tone="error">{formError}</Alert>}

          {/* A role is read from the token issued at sign-in and nothing re-checks
              it, so say so here rather than let an admin believe a demotion took
              hold the moment they saved it. */}
          {editing && form.role !== editing.role && (
            <Alert tone="warning" title="This takes effect when they next sign in">
              {editing.name} keeps the permissions of{' '}
              {editing.role === 'HOD' ? 'a head of department' : 'an instructor'} until they sign out
              and back in — at most a day, when their current session expires.
            </Alert>
          )}

          <StaffFormFields
            form={form}
            setForm={setForm}
            departments={departments}
            isAdmin={isAdmin}
            mode={editing ? 'edit' : 'create'}
          />
        </form>
      </Modal>

      <Modal
        isOpen={passwordTarget !== null}
        onClose={cancelPasswordReset}
        title="Reset password"
        description={
          passwordTarget
            ? `Set a new password for ${passwordTarget.name} and pass it on to them.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={cancelPasswordReset} disabled={isResetting}>
              Back
            </Button>
            <Button type="submit" form="reset-password-form" isLoading={isResetting}>
              Change password
            </Button>
          </>
        }
      >
        <form id="reset-password-form" onSubmit={submitPasswordReset} className="space-y-4">
          {passwordError && <Alert tone="error">{passwordError}</Alert>}

          {/* The other half of the same limitation as the role warning above: a
              token is trusted until it expires, so this is a way back in rather
              than a way to lock someone out. */}
          <Alert tone="warning" title="This does not sign them out">
            Anywhere they are already signed in stays signed in for up to a day. Deactivate the
            account instead if the point is to stop them working now.
          </Alert>

          <Field
            label="New password"
            type="password"
            hint={`At least ${MIN_PASSWORD} characters.`}
            value={passwordForm.newPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
            }
            autoComplete="new-password"
            required
          />
          <Field
            label="Confirm new password"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
            }
            autoComplete="new-password"
            required
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={cohortWarning !== null}
        onClose={cancelCohortWarning}
        onConfirm={() => saveEdit(cohortWarning.person, { acknowledge: true })}
        title="Leave these cohorts unassigned?"
        confirmLabel="Save and unassign"
        cancelLabel="Go back"
        tone="danger"
        isBusy={isSubmitting}
      >
        {cohortWarning && (
          <>
            <strong className="font-semibold text-ink">{cohortWarning.person.name}</strong> will no
            longer be able to deliver{' '}
            {cohortWarning.cohorts.length === 1
              ? 'in the department this cohort belongs to'
              : 'in the departments these cohorts belong to'}
            , so {cohortWarning.cohorts.length === 1 ? 'it' : 'they'} will be left without an
            instructor:
            <ul className="my-3 divide-y divide-line overflow-hidden rounded-lg border border-line">
              {cohortWarning.cohorts.map((cohort) => (
                <li
                  key={cohort.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-ink">{cohort.name}</span>
                  <span className="text-xs text-ink-subtle">{cohort.department}</span>
                </li>
              ))}
            </ul>
            Recorded progress and enrolments are preserved. Reassign{' '}
            {cohortWarning.cohorts.length === 1 ? 'it' : 'them'} from the department page.
          </>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={pendingAction?.type === 'deactivate'}
        onClose={() => setPendingAction(null)}
        onConfirm={runPendingAction}
        title="Deactivate account?"
        confirmLabel="Deactivate"
        tone="danger"
        isBusy={isActing}
      >
        {pendingAction?.person && (
          <>
            <strong className="font-semibold text-ink">{pendingAction.person.name}</strong> will no
            longer be able to sign in, and their{' '}
            {cohortsLabel(pendingAction.person.activeCohorts)} will become unassigned.
            {pendingAction.person.role === 'HOD' &&
              ' The departments they head are unaffected.'}{' '}
            Recorded progress and student disputes are preserved, and you can reactivate the account
            at any time.
          </>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={pendingAction?.type === 'reactivate'}
        onClose={() => setPendingAction(null)}
        onConfirm={runPendingAction}
        title="Reactivate account?"
        confirmLabel="Reactivate"
        tone="primary"
        isBusy={isActing}
      >
        {pendingAction?.person && (
          <>
            <strong className="font-semibold text-ink">{pendingAction.person.name}</strong> will be
            able to sign in again with their existing password
            {pendingAction.person.role === 'HOD' && ' and resume managing their departments'}.
            Cohorts unassigned when they were deactivated stay unassigned — reassign those from the
            department page.
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
