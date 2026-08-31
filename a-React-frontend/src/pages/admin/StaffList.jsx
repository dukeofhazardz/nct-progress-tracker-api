import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, RotateCw, SearchX, ShieldCheck, UserCheck, UserX, Users } from 'lucide-react';
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

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const isCreatingHod = form.role === 'HOD';

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const toggleFormDepartment = (departmentId) =>
    setForm((current) => ({
      ...current,
      departmentIds: current.departmentIds.includes(departmentId)
        ? current.departmentIds.filter((id) => id !== departmentId)
        : [...current.departmentIds, departmentId],
    }));

  const closeForm = () => {
    setIsFormOpen(false);
    setForm(emptyForm);
    setFormError('');
  };

  const submit = async (event) => {
    event.preventDefault();

    if (isCreatingHod && form.departmentIds.length === 0) {
      setFormError('Select at least one department for a head of department.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await tracker.addStaff({
        role: form.role,
        name: form.name,
        username: form.username,
        password: form.password,
        email: form.email.trim() || undefined,
        ...(isCreatingHod
          ? { departmentIds: form.departmentIds }
          : { departmentId: form.departmentId }),
      });
      await reload({ quiet: true });
      setNotice(
        isCreatingHod
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
            onClick={() => setIsFormOpen(true)}
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
                <Button icon={Plus} onClick={() => setIsFormOpen(true)}>
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
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title="Add staff account"
        description="They sign in with this username. Instructors create cohorts; heads of department manage their departments."
        footer={
          <>
            <Button variant="secondary" onClick={closeForm} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="staff-form" isLoading={isSubmitting}>
              Create account
            </Button>
          </>
        }
      >
        <form id="staff-form" onSubmit={submit} className="space-y-4">
          {formError && <Alert tone="error">{formError}</Alert>}

          {/* Only an administrator can create heads of department; a HOD adds
              instructors to their own departments. */}
          {isAdmin && (
            <SegmentedControl
              label="Role"
              stretch
              value={form.role}
              onChange={(role) => setForm((current) => ({ ...current, role }))}
              options={[
                { value: 'INSTRUCTOR', label: 'Instructor' },
                { value: 'HOD', label: 'Head of Department' },
              ]}
            />
          )}

          <Field
            label="Full name"
            value={form.name}
            onChange={updateField('name')}
            placeholder="Ada Obi"
            autoComplete="off"
            required
          />
          <Field
            label="Username"
            hint="Lowercased automatically. Reusing a deactivated account's username restores it."
            value={form.username}
            onChange={updateField('username')}
            placeholder="ada.obi"
            autoComplete="off"
            required
          />
          <Field
            label="Email"
            hint="Optional."
            type="email"
            value={form.email}
            onChange={updateField('email')}
            placeholder="ada.obi@neocloud.example"
            autoComplete="off"
          />
          <Field
            label="Temporary password"
            type="password"
            value={form.password}
            onChange={updateField('password')}
            autoComplete="new-password"
            required
          />

          {isCreatingHod ? (
            <fieldset>
              <legend className="text-sm font-medium text-ink">
                Departments they head
                <span aria-hidden="true" className="ml-0.5 text-rose-600">
                  *
                </span>
              </legend>
              <p className="mt-0.5 text-xs text-ink-subtle">
                They can manage instructors, cohorts and disputes in each one.
              </p>
              <div className="mt-2 space-y-1.5 overflow-hidden rounded-lg border border-line">
                {departments.map((department) => (
                  <label
                    key={department.id}
                    className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-surface-raised"
                  >
                    <input
                      type="checkbox"
                      checked={form.departmentIds.includes(department.id)}
                      onChange={() => toggleFormDepartment(department.id)}
                      className="h-4 w-4 rounded border-line-strong text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                    />
                    <span className="text-ink">{department.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <Field
              as="select"
              label="Department"
              value={form.departmentId}
              onChange={updateField('departmentId')}
              required
            >
              <option value="">Select a department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Field>
          )}
        </form>
      </Modal>

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
