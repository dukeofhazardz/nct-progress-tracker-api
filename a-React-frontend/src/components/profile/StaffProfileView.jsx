import { CheckCircle2, GraduationCap, ShieldCheck } from 'lucide-react';
import { formatDate, formatDateTime } from '../../utils/dateFormatter';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import Panel from '../ui/Panel';
import ProgressBar from '../ui/ProgressBar';
import { Table, TBody, TD, TH, THead, TR } from '../ui/Table';

const roleLabels = {
  ADMIN: 'Administrator',
  HOD: 'Head of Department',
  INSTRUCTOR: 'Instructor',
  STUDENT: 'Student',
};

/**
 * Weighted by each cohort's own topic count rather than the mean of the
 * percentages: cohorts pinned to different curriculum versions have different
 * denominators, and this figure has to agree with the department page and the
 * instructor's own dashboard, which both weight the same way.
 */
const averageProgress = (cohorts) => {
  const topics = cohorts.reduce((total, cohort) => total + cohort.topicCount, 0);
  if (!topics) return 0;
  const covered = cohorts.reduce((total, cohort) => total + cohort.topicsCovered, 0);
  return Math.round((covered / topics) * 100);
};

const noCohortsCopy = {
  ADMIN: 'Administrator accounts oversee departments rather than deliver cohorts themselves.',
  HOD: 'Nothing being delivered yet. A head of department can take a cohort on from their department page.',
  INSTRUCTOR: 'No cohorts yet. They appear here once one is created or assigned.',
};

function CohortTable({ cohorts, withDepartment, dateLabel, dateOf }) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Cohort</TH>
          {withDepartment && <TH>Department</TH>}
          <TH align="right">Students</TH>
          <TH>Progress</TH>
          <TH>{dateLabel}</TH>
        </TR>
      </THead>
      <TBody>
        {cohorts.map((cohort) => (
          <TR key={cohort.id} className="hover:bg-surface-raised">
            <TD>
              <span className="font-medium text-ink">{cohort.name}</span>
              <span className="mt-0.5 block text-xs text-ink-subtle">
                {cohort.topicsCovered} of {cohort.topicCount} topics
                {cohort.curriculumVersion ? ` · curriculum v${cohort.curriculumVersion}` : ''}
              </span>
            </TD>
            {withDepartment && <TD className="text-ink-muted">{cohort.department.name}</TD>}
            <TD align="right" className="tabular-nums text-ink-muted">
              {cohort.studentCount}
            </TD>
            <TD>
              <div className="flex items-center gap-3 sm:w-48">
                <ProgressBar value={cohort.progressPercent} size="sm" className="flex-1" />
                <span className="w-9 text-right text-xs font-bold tabular-nums text-ink">
                  {cohort.progressPercent}%
                </span>
              </div>
            </TD>
            <TD>
              <span
                className="whitespace-nowrap text-ink-muted"
                title={formatDateTime(dateOf(cohort))}
              >
                {formatDate(dateOf(cohort))}
              </span>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

/**
 * One staff member as a person: who they are, what they are delivering now and
 * what they have finished.
 *
 * Presentational and role-agnostic, shared by `/profile` and `/admin/staff/:id` so
 * that reading your own profile and a manager reading it show the same thing.
 * `avatarActions` is the only difference between the two — the owning page passes
 * the picture controls, and a read-only view passes nothing.
 */
export default function StaffProfileView({ profile, avatarActions }) {
  const cohorts = profile.cohorts ?? [];
  const current = cohorts.filter((cohort) => !cohort.completedAt);
  const completed = cohorts.filter((cohort) => cohort.completedAt);
  const students = cohorts.reduce((total, cohort) => total + cohort.studentCount, 0);

  // Only worth a column when the person actually spans departments: an
  // instructor's cohorts are all in the one department they are posted to.
  const withDepartment = new Set(cohorts.map((cohort) => cohort.department.id)).size > 1;

  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-col items-center gap-5 p-5 text-center sm:flex-row sm:items-start sm:text-left">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <Avatar
              src={profile.avatarUrl}
              name={profile.name}
              className="h-20 w-20 text-2xl ring-1 ring-line"
              fallbackClassName="bg-brand-100 text-brand-800"
            />
            {avatarActions}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold tracking-tight text-ink">{profile.name}</h2>
            <p className="mt-0.5 text-sm text-ink-subtle">
              @{profile.username}
              {profile.email ? ` · ${profile.email}` : ''}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
              <Badge tone="brand" icon={profile.role === 'HOD' ? ShieldCheck : undefined}>
                {roleLabels[profile.role] ?? profile.role}
              </Badge>
              {profile.departments.map((department) => (
                <Badge key={department.id}>{department.name}</Badge>
              ))}
              {!profile.isActive && <Badge tone="danger">Deactivated</Badge>}
            </div>

            <p className="mt-3 text-xs text-ink-subtle">
              Joined {formatDate(profile.createdAt)}
            </p>
          </div>
        </div>
      </Panel>

      {cohorts.length === 0 ? (
        <Panel>
          <EmptyState
            icon={GraduationCap}
            title="No cohorts"
            description={noCohortsCopy[profile.role]}
          />
        </Panel>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-10 gap-y-4 rounded-lg border border-line bg-surface px-5 py-4 shadow-card">
            {[
              ['Cohorts', cohorts.length],
              ['Students', students],
              ['Average progress', `${averageProgress(cohorts)}%`],
              ['Completed', completed.length],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                  {label}
                </p>
                <p className="mt-1 text-xl font-bold tracking-tight text-ink">{value}</p>
              </div>
            ))}
          </div>

          <Panel
            title="Current cohorts"
            description={
              current.length > 0
                ? `${current.length} in progress · ${averageProgress(current)}% covered`
                : undefined
            }
          >
            {current.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Nothing in progress"
                description="Every cohort has been marked completed."
              />
            ) : (
              <CohortTable
                cohorts={current}
                withDepartment={withDepartment}
                dateLabel="Started"
                dateOf={(cohort) => cohort.createdAt}
              />
            )}
          </Panel>

          {/* Absent rather than empty when nothing is finished — a new instructor's
              profile should not open with a table of nothing. */}
          {completed.length > 0 && (
            <Panel title="Completed cohorts" description={`${completed.length} finished`}>
              <CohortTable
                cohorts={completed}
                withDepartment={withDepartment}
                dateLabel="Completed"
                dateOf={(cohort) => cohort.completedAt}
              />
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
