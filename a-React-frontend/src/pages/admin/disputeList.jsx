import { useState } from 'react';
import { ChevronDown, ChevronRight, CircleCheck, RotateCw, SearchX } from 'lucide-react';
import { tracker } from '../../api/services/trackerService';
import useFetch from '../../hooks/useFetch';
import useListControls from '../../hooks/useListControls';
import { formatDateTime, formatRelativeDate } from '../../utils/dateFormatter';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import Panel from '../../components/ui/Panel';
import SearchInput from '../../components/ui/SearchInput';
import SegmentedControl from '../../components/ui/SegmentedControl';
import Skeleton from '../../components/ui/Skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table';

// Stable reference so useListControls' memo does not recompute on every render.
const EMPTY = [];

export default function DisputesList() {
  const { data, status, error, reload } = useFetch(() => tracker.disputes(), []);
  const disputes = data ?? EMPTY;

  const [expandedId, setExpandedId] = useState(null);
  const [disputeToResolve, setDisputeToResolve] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [actionError, setActionError] = useState('');

  const { rows, query, setQuery, filterValues, setFilter, sort, toggleSort, isFiltered, reset } =
    useListControls(disputes, {
      searchKeys: [
        'student.name',
        'curriculumItem.title',
        'cohort.name',
        'cohort.department.name',
        'cohort.instructor.name',
        'reason',
      ],
      filters: { status: (row, value) => row.status === value },
      sorters: {
        student: (row) => row.student.name,
        topic: (row) => row.curriculumItem.title,
        cohort: (row) => row.cohort.name,
        raised: (row) => new Date(row.createdAt).getTime(),
        status: (row) => row.status,
      },
      initialSort: { key: 'raised', direction: 'desc' },
    });

  const pendingCount = disputes.filter((dispute) => dispute.status === 'PENDING').length;

  const resolveDispute = async () => {
    setIsResolving(true);
    setActionError('');

    try {
      await tracker.resolve(disputeToResolve.id);
      await reload({ quiet: true });
      setDisputeToResolve(null);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Could not resolve the dispute.');
      setDisputeToResolve(null);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disputes"
        subtitle="Students raise a dispute when a topic is marked covered but was not delivered."
      />

      {status === 'error' && (
        <Alert
          tone="error"
          title="Could not load disputes"
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

      {status === 'loading' && (
        <Panel>
          <div className="divide-y divide-line">
            {[0, 1, 2, 3, 4].map((key) => (
              <div key={key} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </Panel>
      )}

      {status === 'ready' && disputes.length === 0 && (
        <Panel>
          <EmptyState
            icon={CircleCheck}
            title="No disputes raised"
            description="Nothing to review. Disputes appear here as soon as a student reports a topic."
          />
        </Panel>
      )}

      {status === 'ready' && disputes.length > 0 && (
        <Panel
          title={`${rows.length} of ${disputes.length} ${disputes.length === 1 ? 'dispute' : 'disputes'}`}
          actions={
            <>
              <SearchInput
                value={query}
                onChange={setQuery}
                label="Search disputes"
                placeholder="Student, topic, cohort…"
                className="w-full sm:w-64"
              />
              <SegmentedControl
                label="Filter by status"
                value={filterValues.status}
                onChange={(value) => setFilter('status', value)}
                options={[
                  { value: 'all', label: 'All', count: disputes.length },
                  { value: 'PENDING', label: 'Pending', count: pendingCount },
                  {
                    value: 'RESOLVED',
                    label: 'Resolved',
                    count: disputes.length - pendingCount,
                  },
                ]}
              />
            </>
          }
        >
          {rows.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No disputes match those filters"
              action={
                <Button variant="secondary" onClick={reset}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH sortKey="student" sort={sort} onSort={toggleSort}>
                    Student
                  </TH>
                  <TH sortKey="topic" sort={sort} onSort={toggleSort}>
                    Topic
                  </TH>
                  <TH sortKey="cohort" sort={sort} onSort={toggleSort}>
                    Cohort
                  </TH>
                  <TH>Instructor</TH>
                  <TH sortKey="raised" sort={sort} onSort={toggleSort}>
                    Raised
                  </TH>
                  <TH sortKey="status" sort={sort} onSort={toggleSort}>
                    Status
                  </TH>
                  <TH align="right">
                    <span className="sr-only">Actions</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((dispute) => {
                  const isExpanded = expandedId === dispute.id;
                  const isPending = dispute.status === 'PENDING';

                  return [
                    <TR key={dispute.id} className="hover:bg-surface-raised">
                      <TD>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : dispute.id)}
                          aria-expanded={isExpanded}
                          className="flex items-center gap-1.5 rounded text-left font-medium text-ink transition-colors hover:text-brand-700"
                        >
                          {isExpanded ? (
                            <ChevronDown size={14} aria-hidden="true" />
                          ) : (
                            <ChevronRight size={14} aria-hidden="true" />
                          )}
                          {dispute.student.name}
                        </button>
                      </TD>
                      <TD className="text-ink-muted">{dispute.curriculumItem.title}</TD>
                      <TD>
                        <p className="text-ink-muted">{dispute.cohort.name}</p>
                        <p className="text-xs text-ink-subtle">{dispute.cohort.department.name}</p>
                      </TD>
                      <TD className="text-ink-muted">
                        {dispute.cohort.instructor?.name ?? (
                          <span className="text-ink-faint">Unassigned</span>
                        )}
                      </TD>
                      <TD>
                        <span
                          className="whitespace-nowrap text-ink-muted"
                          title={formatDateTime(dispute.createdAt)}
                        >
                          {formatRelativeDate(dispute.createdAt)}
                        </span>
                      </TD>
                      <TD>
                        <Badge tone={isPending ? 'warning' : 'success'}>
                          {isPending ? 'Pending' : 'Resolved'}
                        </Badge>
                      </TD>
                      <TD align="right">
                        {isPending && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setDisputeToResolve(dispute)}
                          >
                            Resolve
                          </Button>
                        )}
                      </TD>
                    </TR>,

                    isExpanded && (
                      <TR key={`${dispute.id}-detail`} className="bg-surface-raised">
                        <TD colSpan={7} className="px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                            Student&apos;s report
                          </p>
                          <p className="mt-1.5 max-w-3xl whitespace-pre-line text-sm leading-6 text-ink">
                            {dispute.reason}
                          </p>
                          <p className="mt-3 text-xs text-ink-subtle">
                            Raised {formatDateTime(dispute.createdAt)}
                            {dispute.resolvedAt &&
                              ` · Resolved ${formatDateTime(dispute.resolvedAt)}`}
                          </p>
                        </TD>
                      </TR>
                    ),
                  ].filter(Boolean);
                })}
              </TBody>
            </Table>
          )}
        </Panel>
      )}

      {status === 'ready' && disputes.length > 0 && pendingCount === 0 && !isFiltered && (
        <Alert tone="success" title="All disputes resolved">
          Every reported topic has been reviewed and closed.
        </Alert>
      )}

      <ConfirmDialog
        isOpen={Boolean(disputeToResolve)}
        onClose={() => setDisputeToResolve(null)}
        onConfirm={resolveDispute}
        title="Resolve this dispute?"
        confirmLabel="Resolve dispute"
        tone="primary"
        isBusy={isResolving}
      >
        {disputeToResolve && (
          <>
            Mark <strong className="font-semibold text-ink">{disputeToResolve.student.name}</strong>
            &apos;s report on{' '}
            <strong className="font-semibold text-ink">
              {disputeToResolve.curriculumItem.title}
            </strong>{' '}
            as resolved. This is permanent — a resolved dispute cannot be reopened.
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
