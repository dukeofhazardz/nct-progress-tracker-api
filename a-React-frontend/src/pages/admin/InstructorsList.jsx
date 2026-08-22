import { useState } from 'react';
import { Plus, RotateCw, SearchX, UserCheck, UserX, Users } from 'lucide-react';
import { tracker } from '../../api/services/trackerService';
import useFetch from '../../hooks/useFetch';
import useListControls from '../../hooks/useListControls';
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
import SearchInput from '../../components/ui/SearchInput';
import SegmentedControl from '../../components/ui/SegmentedControl';
import Skeleton from '../../components/ui/Skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table';

const emptyForm = { name: '', username: '', email: '', password: '', departmentId: '' };

// Stable reference so useListControls' memo does not recompute on every render.
const EMPTY = [];

const cohortsLabel = (count) => `${count} ${count === 1 ? 'cohort' : 'cohorts'}`;

export default function InstructorsList() {
  const { data, status, error, reload } = useFetch(
    () =>
      Promise.all([tracker.instructors(), tracker.departments()]).then(
        ([instructorRows, departmentRows]) => ({
          instructors: instructorRows,
          departments: departmentRows,
        }),
      ),
    [],
  );

  const instructors = data?.instructors ?? EMPTY;
  const departments = data?.departments ?? EMPTY;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pendingAction, setPendingAction] = useState(null); // { type, instructor }
  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const { rows, query, setQuery, filterValues, setFilter, sort, toggleSort, reset } =
    useListControls(instructors, {
      searchKeys: ['name', 'username', 'email', 'department.name'],
      filters: {
        status: (row, value) => (value === 'active' ? row.isActive : !row.isActive),
        department: (row, value) => row.department?.id === value,
      },
      initialFilters: { status: 'active' },
      sorters: {
        name: (row) => row.name,
        department: (row) => row.department?.name ?? '',
        cohorts: (row) => row.activeCohorts,
        updated: (row) => new Date(row.updatedAt).getTime(),
      },
      initialSort: { key: 'name', direction: 'asc' },
    });

  const activeCount = instructors.filter((instructor) => instructor.isActive).length;
  const deactivatedCount = instructors.length - activeCount;
  const viewingDeactivated = filterValues.status === 'inactive';

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const closeForm = () => {
    setIsFormOpen(false);
    setForm(emptyForm);
    setFormError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      await tracker.addInstructor({ ...form, email: form.email.trim() || undefined });
      await reload({ quiet: true });
      setNotice(`${form.name.trim()} can now sign in and create cohorts.`);
      closeForm();
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || 'Could not add the instructor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const runPendingAction = async () => {
    const { type, instructor } = pendingAction;
    setIsActing(true);
    setActionError('');

    try {
      if (type === 'deactivate') {
        await tracker.deactivateInstructor(instructor.id);
        setNotice(
          `${instructor.name} has been deactivated and can no longer sign in. You can restore the account from the Deactivated tab.`,
        );
      } else {
        await tracker.reactivateInstructor(instructor.id);
        setNotice(`${instructor.name} can sign in again with their existing password.`);
      }
      await reload({ quiet: true });
      setPendingAction(null);
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message ||
          `Could not ${type} ${instructor.name}. Please try again.`,
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
          description="Every instructor account is currently active."
        />
      );
    }

    return (
      <EmptyState
        icon={SearchX}
        title="No instructors match those filters"
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
        title="Instructors"
        subtitle="Instructor accounts, their departments, and how many cohorts each is running."
        actions={
          <Button
            icon={Plus}
            onClick={() => setIsFormOpen(true)}
            disabled={status === 'ready' && departments.length === 0}
          >
            Add instructor
          </Button>
        }
      />

      {status === 'error' && (
        <Alert
          tone="error"
          title="Could not load instructors"
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
          Every instructor belongs to a department. Create one first, then add instructors.
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

      {status === 'ready' && instructors.length === 0 && (
        <Panel>
          <EmptyState
            icon={Users}
            title="No instructors yet"
            description="Add an instructor and assign them to a department to start tracking delivery."
            action={
              departments.length > 0 && (
                <Button icon={Plus} onClick={() => setIsFormOpen(true)}>
                  Add instructor
                </Button>
              )
            }
          />
        </Panel>
      )}

      {status === 'ready' && instructors.length > 0 && (
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
                label="Search instructors"
                placeholder="Name or username…"
                className="w-full sm:w-56"
              />
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
                  { value: 'all', label: 'All', count: instructors.length },
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
                    Instructor
                  </TH>
                  <TH sortKey="department" sort={sort} onSort={toggleSort}>
                    Department
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
                {rows.map((instructor) => (
                  <TR key={instructor.id} className="hover:bg-surface-raised">
                    <TD>
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            instructor.isActive
                              ? 'bg-brand-100 text-brand-800'
                              : 'bg-surface-sunken text-ink-faint'
                          }`}
                        >
                          {initials(instructor.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium">
                            <span className={instructor.isActive ? 'text-ink' : 'text-ink-subtle'}>
                              {instructor.name}
                            </span>
                            {!instructor.isActive && <Badge tone="neutral">Deactivated</Badge>}
                          </p>
                          <p className="truncate text-xs text-ink-subtle">
                            @{instructor.username}
                            {instructor.email ? ` · ${instructor.email}` : ''}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD className="text-ink-muted">
                      {instructor.department?.name ?? (
                        <span className="text-ink-faint">Unassigned</span>
                      )}
                    </TD>
                    <TD align="right">
                      <Badge tone={instructor.activeCohorts > 0 ? 'brand' : 'neutral'}>
                        {instructor.activeCohorts}
                      </Badge>
                    </TD>
                    <TD>
                      <span
                        className="whitespace-nowrap text-ink-muted"
                        title={formatDateTime(instructor.updatedAt)}
                      >
                        {formatDate(instructor.updatedAt)}
                      </span>
                    </TD>
                    <TD align="right">
                      {instructor.isActive ? (
                        <Button
                          size="sm"
                          variant="danger-quiet"
                          icon={UserX}
                          onClick={() => setPendingAction({ type: 'deactivate', instructor })}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={UserCheck}
                          onClick={() => setPendingAction({ type: 'reactivate', instructor })}
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
        title="Add instructor"
        description="The instructor signs in with this username and can then create cohorts."
        footer={
          <>
            <Button variant="secondary" onClick={closeForm} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="instructor-form" isLoading={isSubmitting}>
              Create instructor
            </Button>
          </>
        }
      >
        <form id="instructor-form" onSubmit={submit} className="space-y-4">
          {formError && <Alert tone="error">{formError}</Alert>}

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
            hint="Lowercased automatically. Reusing a deactivated instructor's username restores that account."
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
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={pendingAction?.type === 'deactivate'}
        onClose={() => setPendingAction(null)}
        onConfirm={runPendingAction}
        title="Deactivate instructor?"
        confirmLabel="Deactivate"
        tone="danger"
        isBusy={isActing}
      >
        {pendingAction?.instructor && (
          <>
            <strong className="font-semibold text-ink">{pendingAction.instructor.name}</strong> will
            no longer be able to sign in, and their{' '}
            {cohortsLabel(pendingAction.instructor.activeCohorts)} will become unassigned. Recorded
            progress and student disputes are preserved, and you can reactivate the account at any
            time.
          </>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={pendingAction?.type === 'reactivate'}
        onClose={() => setPendingAction(null)}
        onConfirm={runPendingAction}
        title="Reactivate instructor?"
        confirmLabel="Reactivate"
        tone="primary"
        isBusy={isActing}
      >
        {pendingAction?.instructor && (
          <>
            <strong className="font-semibold text-ink">{pendingAction.instructor.name}</strong> will
            be able to sign in again with their existing password. Cohorts unassigned when they were
            deactivated stay unassigned — reassign those from the department page.
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
