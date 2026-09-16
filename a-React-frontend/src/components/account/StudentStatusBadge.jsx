import { statusLabels, statusTones } from '../../utils/studentStatus';
import Badge from '../ui/Badge';

/**
 * One student's status as a badge, shared by the list and the detail page so the two
 * cannot label or colour the same person differently.
 */
export default function StudentStatusBadge({ status, className }) {
  return (
    <Badge tone={statusTones[status]} className={className}>
      {statusLabels[status]}
    </Badge>
  );
}
