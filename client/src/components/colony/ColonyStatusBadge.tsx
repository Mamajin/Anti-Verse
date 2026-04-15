export const ColonyStatusBadge = ({ status }: { status: 'active' | 'inactive' | 'deceased' | string }) => {
  const map: Record<string, string> = {
    'active': 'badge-success text-success-content',
    'inactive': 'badge-warning text-warning-content',
    'deceased': 'badge-error text-error-content',
  };
  return (
    <span className={`badge ${map[status] || 'badge-ghost'} badge-sm capitalize font-semibold shadow-sm`}>
      {status}
    </span>
  );
};
