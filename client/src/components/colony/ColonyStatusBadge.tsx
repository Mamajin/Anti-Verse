import { ColonyStatus } from '@antiverse/types';

export const ColonyStatusBadge = ({ status }: { status: ColonyStatus | string }) => {
  const map: Record<string, string> = {
    [ColonyStatus.Active]: 'badge-success text-success-content',
    [ColonyStatus.Inactive]: 'badge-warning text-warning-content',
    [ColonyStatus.Deceased]: 'badge-error text-error-content',
  };
  return (
    <span className={`badge ${map[status] || 'badge-ghost'} badge-sm capitalize font-semibold shadow-sm`}>
      {status}
    </span>
  );
};
