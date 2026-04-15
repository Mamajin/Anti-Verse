import { Users, Bug } from 'lucide-react';
import type { Colony } from '@antiverse/types';
import { ColonyStatusBadge } from './ColonyStatusBadge';

interface ColonyCardProps {
  colony: Colony;
  onClick: (id: string) => void;
}

export function ColonyCard({ colony, onClick }: ColonyCardProps) {
  return (
    <div
      className="card bg-base-200/50 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-base-300 hover:border-primary/50 group"
      onClick={() => onClick(colony.id)}
    >
      <div className="card-body p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="card-title text-xl group-hover:text-primary transition-colors">{colony.name}</h3>
            <p className="text-sm text-base-content/60 italic font-medium mt-1">
              {colony.species?.scientificName || 'Unknown Protocol'}
            </p>
          </div>
          <ColonyStatusBadge status={colony.status} />
        </div>

        <div className="flex gap-6 mt-6 text-sm font-semibold text-base-content/80">
          <span className="flex items-center gap-2 bg-base-300/50 px-3 py-1.5 rounded-lg border border-base-content/5">
            <span className="text-xl">👑</span> {colony.queenCount}
          </span>
          {colony.estimatedWorkerCount != null && (
            <span className="flex items-center gap-2 bg-base-300/50 px-3 py-1.5 rounded-lg border border-base-content/5">
              <Bug size={16} className="text-primary" /> ~{(colony.estimatedWorkerCount || 0).toLocaleString()}
            </span>
          )}
        </div>

        <div className="card-actions justify-between items-end mt-4 pt-4 border-t border-base-300">
          <span className="text-xs text-base-content/40 font-mono">
            ID: {colony.id.split('-')[0]}
          </span>
          <span className="text-xs text-base-content/50">
            {colony.foundingDate ? `Authored ${new Date(colony.foundingDate).toLocaleDateString()}` : 'Date Unknown'}
          </span>
        </div>
      </div>
    </div>
  );
}
