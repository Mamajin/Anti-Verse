import { Bug, Crown, Boxes, ArrowRight, Fingerprint } from 'lucide-react';
import type { Colony } from '@antiverse/types';
import { ColonyStatusBadge } from './ColonyStatusBadge';

interface ColonyCardProps {
  colony: Colony;
  onClick: (id: string) => void;
}

export function ColonyCard({ colony, onClick }: ColonyCardProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-3xl bg-base-100/40 backdrop-blur-md border border-base-content/5 hover:border-primary/40 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 cursor-pointer"
      onClick={() => onClick(colony.id)}
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors z-20" />
      
      <div className="h-48 overflow-hidden relative border-b border-base-content/5">
        <img 
          src="/assets/placeholders/specimen-placeholder.png" 
          alt="Specimen Preview" 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/assets/placeholders/specimen-placeholder.png';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-base-200/80 to-transparent" />
      </div>
      
      <div className="card-body p-7">
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 bg-base-200/50 rounded-2xl border border-base-content/5 group-hover:bg-primary/5 transition-colors">
             <Bug className="text-secondary group-hover:text-primary transition-colors" size={24} />
          </div>
          <ColonyStatusBadge status={colony.status} />
        </div>

        <div className="bg-glass-light p-4 rounded-2xl">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-base-content tracking-tight group-hover:text-primary transition-colors">{colony.name}</h3>
            <p className="text-sm font-bold text-base-content/40 uppercase tracking-widest flex items-center gap-2">
              <Fingerprint size={12} /> {colony.id.split('-')[0]}
            </p>
          </div>
        </div>

        <p className="bg-glass-light px-3 py-1 text-base-content/60 italic font-medium mt-4 line-clamp-1 border-l-2 border-primary/20 pl-3">
          {colony.species?.scientificName || 'Unknown Protocol'}
        </p>

        <div className="grid grid-cols-2 gap-3 mt-8">
          <div className="bg-base-200/30 p-3 rounded-2xl border border-base-content/5 flex flex-col items-center justify-center gap-1 group-hover:bg-base-100 transition-colors">
            <Crown size={14} className="text-secondary" />
            <span className="text-lg font-black">{colony.queenCount}</span>
            <span className="text-[10px] uppercase font-bold text-base-content/40">Queens</span>
          </div>
          <div className="bg-base-200/30 p-3 rounded-2xl border border-base-content/5 flex flex-col items-center justify-center gap-1 group-hover:bg-base-100 transition-colors">
            <Boxes size={14} className="text-primary" />
            <span className="text-lg font-black">{(colony.estimatedWorkerCount || 0).toLocaleString()}</span>
            <span className="text-[10px] uppercase font-bold text-base-content/40">Workers</span>
          </div>
        </div>

        <div className="mt-8 flex justify-between items-center pt-4 border-t border-base-content/5 opacity-40 group-hover:opacity-100 transition-opacity">
           <span className="text-[10px] font-bold uppercase tracking-tighter">
             Active Cycle: {new Date().getFullYear()}
           </span>
           <ArrowRight size={16} className="text-primary translate-x-[-4px] group-hover:translate-x-0 transition-transform" />
        </div>
      </div>
    </div>
  );
}
