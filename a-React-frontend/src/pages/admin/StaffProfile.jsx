import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, RotateCw } from 'lucide-react';
import { tracker } from '../../api/services/trackerService';
import useFetch from '../../hooks/useFetch';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import Panel from '../../components/ui/Panel';
import Skeleton from '../../components/ui/Skeleton';
import StaffProfileView from '../../components/profile/StaffProfileView';

/**
 * A staff member's profile, reached by clicking their name on the staff list.
 *
 * Read-only by design: nobody resets anyone else's password here. A forgotten
 * password is handled by deactivating the account and re-adding the username,
 * which reuses the row and sets a new one.
 *
 * The API answers 404 rather than 403 for an account outside the caller's scope,
 * so a HOD following a stale link sees "not found", not who exists elsewhere.
 */
export default function StaffProfile() {
  const { id } = useParams();
  const { data, status, error, reload } = useFetch(() => tracker.staffMember(id), [id]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: 'Staff', to: '/admin/staff' }, { label: data?.name ?? 'Profile' }]}
        title={data?.name ?? 'Staff profile'}
        subtitle="Deactivate or reactivate this account from the staff list."
        actions={
          <Button variant="secondary" icon={ArrowLeft} to="/admin/staff">
            Back to staff
          </Button>
        }
      />

      {status === 'error' && (
        <Alert
          tone="error"
          title="Could not load this profile"
          action={
            <Button size="sm" variant="secondary" icon={RotateCw} onClick={() => reload()}>
              Retry
            </Button>
          }
        >
          {error}{' '}
          <Link to="/admin/staff" className="font-semibold underline">
            Return to the staff list
          </Link>
          .
        </Alert>
      )}

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

      {status === 'ready' && data && <StaffProfileView profile={data} />}
    </div>
  );
}
