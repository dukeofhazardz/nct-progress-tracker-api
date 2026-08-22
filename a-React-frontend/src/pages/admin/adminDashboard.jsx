import { useState } from 'react';
import { Building2, Plus, RotateCw } from 'lucide-react';
import { tracker } from '../../api/services/trackerService';
import useFetch from '../../hooks/useFetch';
import initials from '../../utils/initials';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Field from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import Panel from '../../components/ui/Panel';
import ProgressBar from '../../components/ui/ProgressBar';
import Skeleton from '../../components/ui/Skeleton';

const sum = (rows, pick) => rows.reduce((total, row) => total + pick(row), 0);

/**
 * The single most blocking gap, worst first: without a curriculum nothing can be
 * recorded at all, without instructors cohorts cannot be assigned, and without
 * cohorts there is simply nothing to track yet.
 */
const attentionBadge = (department) => {
  if (department.topicCount === 0) return { tone: 'danger', label: 'No curriculum' };
  if (department.instructorCount === 0) return { tone: 'warning', label: 'Needs instructors' };
  if (department.cohortCount === 0) return { tone: 'neutral', label: 'No cohorts yet' };
  return null;
};

const plural = (count, word) => `${count} ${count === 1 ? word : `${word}s`}`;

export default function AdminDashboard() {
  const { data, status, error, reload } = useFetch(() => tracker.departments(), []);
  const departments = data ?? [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [departmentName, setDepartmentName] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeModal = () => {
    setIsModalOpen(false);
    setDepartmentName('');
    setFormError('');
  };

  const addDepartment = async (event) => {
    event.preventDefault();
    const name = departmentName.trim();

    if (!name) {
      setFormError('Department name is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await tracker.addDepartment(name);
      await reload({ quiet: true });
      closeModal();
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || 'Could not add the department.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Departments with no published curriculum have no meaningful percentage, so
  // they are excluded rather than averaged in as 0% and dragging the figure down.
  const tracked = departments.filter((department) => department.topicCount > 0);

  const stats = [
    ['Departments', departments.length],
    ['Instructors', sum(departments, (d) => d.instructorCount)],
    ['Active cohorts', sum(departments, (d) => d.cohortCount)],
    [
      'Average progress',
      tracked.length ? `${Math.round(sum(tracked, (d) => d.progress) / tracked.length)}%` : '—',
    ],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        subtitle="Curriculum coverage across every department, instructor and cohort."
        actions={
          <Button icon={Plus} onClick={() => setIsModalOpen(true)}>
            Add department
          </Button>
        }
      />

      {status === 'error' && (
        <Alert
          tone="error"
          title="Could not load departments"
          action={
            <Button size="sm" variant="secondary" icon={RotateCw} onClick={() => reload()}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {status === 'ready' && departments.length > 0 && (
        <div className="flex flex-wrap gap-x-10 gap-y-4 rounded-lg border border-line bg-surface px-5 py-4 shadow-card">
          {stats.map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                {label}
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight text-ink">{value}</p>
            </div>
          ))}
        </div>
      )}

      {status === 'loading' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <div key={key} className="rounded-lg border border-line bg-surface p-5 shadow-card">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="mt-4 h-7 w-16" />
              <Skeleton className="mt-3 h-2 w-full" />
              <Skeleton className="mt-4 h-4 w-3/5" />
            </div>
          ))}
        </div>
      )}

      {status === 'ready' && departments.length === 0 && (
        <Panel>
          <EmptyState
            icon={Building2}
            title="No departments yet"
            description="Create a department, then add instructors and publish its curriculum."
            action={
              <Button icon={Plus} onClick={() => setIsModalOpen(true)}>
                Add department
              </Button>
            }
          />
        </Panel>
      )}

      {status === 'ready' && departments.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => {
            const attention = attentionBadge(department);
            const hasCurriculum = department.topicCount > 0;

            return (
              <Card
                key={department.id}
                to={`/admin/department/${department.id}`}
                className="flex flex-col p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 text-sm font-semibold text-ink">{department.name}</h2>
                  {attention && <Badge tone={attention.tone}>{attention.label}</Badge>}
                </div>

                <p className="mt-4 text-2xl font-bold tracking-tight text-ink">
                  {hasCurriculum ? `${department.progress}%` : '—'}
                </p>
                <ProgressBar value={hasCurriculum ? department.progress : 0} className="mt-2" />
                <p className="mt-2 text-xs text-ink-subtle">
                  {hasCurriculum
                    ? `${plural(department.topicCount, 'topic')} · ${plural(department.cohortCount, 'cohort')} · ${plural(department.instructorCount, 'instructor')}`
                    : `No curriculum published · ${plural(department.instructorCount, 'instructor')}`}
                </p>

                {department.instructors?.length > 0 && (
                  <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
                    <div className="flex -space-x-1.5">
                      {department.instructors.slice(0, 4).map((instructor) => (
                        <span
                          key={instructor.id}
                          title={`${instructor.name} · ${plural(instructor.activeCohorts, 'cohort')}`}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-800 ring-2 ring-white"
                        >
                          {initials(instructor.name)}
                        </span>
                      ))}
                    </div>
                    <span className="truncate text-xs text-ink-subtle">
                      {department.instructors.length > 4
                        ? `+${department.instructors.length - 4} more instructors`
                        : department.instructors.map((i) => i.name.split(' ')[0]).join(', ')}
                    </span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Add department"
        description="Create the department first, then assign instructors and publish a curriculum."
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="add-department-form" isLoading={isSubmitting}>
              Add department
            </Button>
          </>
        }
      >
        <form id="add-department-form" onSubmit={addDepartment} className="space-y-4">
          {formError && <Alert tone="error">{formError}</Alert>}
          <Field
            label="Department name"
            placeholder="e.g. Cloud Engineering"
            value={departmentName}
            onChange={(event) => setDepartmentName(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </form>
      </Modal>
    </div>
  );
}
