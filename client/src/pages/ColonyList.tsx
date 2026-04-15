import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useColonyStore } from '../stores/colonyStore';
import { ColonyCard } from '../components/colony/ColonyCard';
import { Search, FlaskConical, Filter, Plus } from 'lucide-react';

export const ColonyList = () => {
  const { colonies, fetchColonies, isLoading } = useColonyStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchColonies();
  }, [fetchColonies]);

  return (
    <div className="space-y-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 bg-base-100/40 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-sm border border-base-content/5">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <FlaskConical size={24} strokeWidth={2.5} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Bio-System Index</span>
          </div>
          <h1 className="text-4xl font-black text-base-content tracking-tight">Telemetries</h1>
          <p className="text-base-content/50 font-medium text-sm">Managing and monitoring {colonies.length} active bio-systems.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/30 group-focus-within:text-primary transition-colors" size={18} />
            <input type="text" placeholder="Search parameters..." className="input input-bordered w-full sm:w-64 pl-12 bg-base-100/50 border-base-content/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 rounded-2xl transition-all" />
          </div>
          <button className="btn btn-primary rounded-2xl px-6 font-black uppercase tracking-widest text-[10px] gap-2 shadow-xl shadow-primary/20">
            <Plus size={16} /> New System
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-12"><span className="loading loading-spinner loading-lg text-primary"></span></div>
      ) : colonies.length === 0 ? (
        <div className="text-center py-20 text-base-content/50 bg-base-200/30 rounded-3xl border border-base-200">
          No telemetries found. Initialize a new system to begin monitoring.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {colonies.map(c => (
            <ColonyCard key={c.id} colony={c} onClick={(id) => navigate(`/colonies/${id}`)} />
          ))}
        </div>
      )}
    </div>
  );
};
