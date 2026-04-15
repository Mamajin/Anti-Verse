import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useColonyStore } from '../stores/colonyStore';
import { ColonyCard } from '../components/colony/ColonyCard';
import { Search } from 'lucide-react';

export const ColonyList = () => {
  const { colonies, fetchColonies, isLoading } = useColonyStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchColonies();
  }, [fetchColonies]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-base-100/50 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-base-100/20">
        <div>
          <h1 className="text-3xl font-bold text-primary">Telemetries</h1>
          <p className="text-base-content/70 mt-1">Manage and monitor all active bio-systems.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" size={18} />
            <input type="text" placeholder="Search parameters..." className="input input-bordered w-full pl-10 bg-base-200/50 focus:input-primary" />
          </div>
          <button className="btn btn-primary shadow-lg shadow-primary/20">New System</button>
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
