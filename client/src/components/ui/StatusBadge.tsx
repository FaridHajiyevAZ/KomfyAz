import { clsx } from 'clsx';

const statusStyles: Record<string, string> = {
  ACTIVE: 'badge-active',
  APPROVED: 'badge-active',
  OPEN: 'badge-info',
  IN_PROGRESS: 'badge-pending',
  PENDING: 'badge-pending',
  PENDING_REVIEW: 'badge-pending',
  INFO_REQUESTED: 'badge-pending',
  EXPIRED: 'badge-expired',
  REJECTED: 'badge-expired',
  VOIDED: 'badge-expired',
  RESOLVED: 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20',
  CLOSED: 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20',
};

const statusLabels: Record<string, string> = {
  PENDING_REVIEW: 'Pending Review',
  INFO_REQUESTED: 'Info Requested',
  IN_PROGRESS: 'In Progress',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx('badge', statusStyles[status] || 'badge-info')}>
      {statusLabels[status] || status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
