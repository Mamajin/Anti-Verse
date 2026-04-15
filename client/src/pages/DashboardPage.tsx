import { useEffect, useState, type FormEvent } from 'react';
import Chart from 'react-apexcharts';
import { useAuthStore } from '../stores/authStore';
import { useColonyStore } from '../stores/colonyStore';
import { useNavigate } from 'react-router-dom';
import { Zap, TrendingUp, Box, Microscope, Activity, Play, Plus, ChevronRight, ShieldCheck, Bug } from 'lucide-react';

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const { colonies = [], speciesLookup = [], fetchColonies, fetchSpecies, createColony, isLoading } = useColonyStore();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', speciesId: '', queenCount: 1 });

  useEffect(() => {
    fetchColonies();
    fetchSpecies();
  }, [fetchColonies, fetchSpecies]);

  const handleSubmitColony = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createColony(formData);
      setIsModalOpen(false);
      setFormData({ name: '', speciesId: '', queenCount: 1 });
    } catch (err) {
       console.error("Failed to create", err);
    }
  };

    const chartOptions = {
      chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
      colors: ['#6B705C', '#CB997E'], // Primary and Secondary earth tones
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
      dataLabels: { enabled: false },
      theme: { mode: 'light' },
      xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
      tooltip: { theme: 'light' },
    } as ApexCharts.ApexOptions;

  const chartSeries = [
    { name: 'Workers', data: [31, 40, 68, 120, 250, 480] },
    { name: 'Brood', data: [111, 150, 203, 350, 410, 600] }
  ];

  return (
    <div className="space-y-10 animate-fade-in-up pb-10">
      <header className="relative overflow-hidden bg-primary/10 rounded-[2rem] p-10 border border-primary/20 group">
        <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-secondary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-accent/20 rounded-full blur-3xl animate-pulse" />
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
               <Activity size={12} className="animate-pulse" /> System Operational
            </div>
            <h1 className="text-5xl font-black tracking-tight text-base-content leading-tight">
              <span className="bg-glass-light px-3 py-1 mr-2 inline-block">Command</span>
              <span className="text-primary italic">Hub</span>
            </h1>
            <div className="bg-glass-light px-4 py-2 mt-4 inline-block">
               <p className="text-base-content/60 font-medium max-w-md">
                 Monitoring <span className="text-secondary font-bold">{colonies.length}</span> biological systems with deep telemetry integration. {user?.email}
               </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="stats shadow-2xl bg-base-100/80 backdrop-blur-md border border-white/20 rounded-3xl overflow-hidden p-2">
              <div className="stat px-6 py-4">
                <div className="stat-figure text-primary">
                  <Box size={32} strokeWidth={1.5} />
                </div>
                <div className="bg-glass-light px-2 py-0.5 rounded-lg mb-1 inline-block">
                   <div className="stat-title text-[10px] uppercase font-bold tracking-widest text-base-content/60">Active Biomes</div>
                </div>
                <div className="stat-value text-4xl font-black">{colonies?.length || 0}</div>
                <div className="stat-desc text-[10px] mt-1 text-primary/60 font-bold uppercase">Ready for Sync</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Population Growth Chart */}
        <div className="lg:col-span-2 card bg-base-100/50 backdrop-blur-md shadow-xl border border-base-100/20">
          <div className="card-body">
            <h2 className="card-title text-xl text-primary">Global Population Trends</h2>
            <div className="h-72 w-full mt-4">
              <Chart options={chartOptions} series={chartSeries} type="area" height="100%" />
            </div>
          </div>
        </div>

        {/* Quick Actions / Colony List */}
        <div className="card glass-lab rounded-[2rem] overflow-hidden">
          <div className="card-body p-8">
            <div className="flex justify-between items-center mb-6 bg-glass-light px-4 py-2">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                 <ShieldCheck className="text-primary" size={24} /> Monitored Entities
              </h2>
            </div>
            
            {((colonies || []).length === 0) ? (
              <div className="text-center text-base-content/30 py-16 flex flex-col items-center gap-4 border-2 border-dashed border-base-content/5 rounded-3xl">
                <Microscope size={48} strokeWidth={1} />
                <span className="text-xs uppercase font-bold tracking-widest">No active telemetry found</span>
              </div>
            ) : (
              <ul className="space-y-3">
                {colonies.slice(0, 5).map(c => {
                  // Ensure species data is attached
                  const species = c.species || speciesLookup.find(s => s.id === c.speciesId);
                  
                  return (
                    <li 
                      key={c.id} 
                      className="flex justify-between items-center p-4 bg-base-200/40 hover:bg-primary/5 border border-transparent hover:border-primary/20 rounded-2xl transition-all cursor-pointer group"
                      onClick={() => navigate(`/colonies/${c.id}`)}
                    >
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-base-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            <Bug className="text-secondary group-hover:text-primary transition-colors" size={18} />
                         </div>
                         <div className="bg-glass-light px-3 py-1">
                           <div className="font-black text-sm group-hover:text-primary transition-colors">{c.name}</div>
                           <div className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">
                             {(species?.scientificName?.split(' ') || [])[0] || 'Unknown'}
                           </div>
                         </div>
                       </div>
                       <ChevronRight size={16} className="text-base-content/20 group-hover:text-primary transition-colors" />
                    </li>
                  );
                })}
              </ul>
            )}

            <button type="button" className="btn btn-primary btn-block rounded-2xl mt-8 shadow-lg shadow-primary/20 gap-2 font-black uppercase tracking-widest text-[10px]" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> New System
            </button>
          </div>
        </div>
        
      </div>

      {/* Initialize Colony Modal */}
      <dialog className={`modal ${isModalOpen ? 'modal-open' : ''}`}>
        <div className="modal-box bg-base-100/90 backdrop-blur-md border border-base-200/50 shadow-2xl">
          <h3 className="font-bold text-2xl text-primary mb-4">Initialize Colony</h3>
          <form onSubmit={handleSubmitColony} className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text font-medium text-base-content/80">Colony Designation</span></label>
              <input type="text" className="input input-bordered focus:input-primary bg-base-200/50" required placeholder="e.g. Test Tube 1"
                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="form-control">
              <label className="label"><span className="label-text font-medium text-base-content/80">Species Protocol</span></label>
              <select className="select select-bordered focus:select-primary bg-base-200/50" required
                value={formData.speciesId} onChange={e => setFormData({ ...formData, speciesId: e.target.value })}>
                <option value="" disabled>Select internal species catalog...</option>
                {(speciesLookup || []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.scientificName} ({s.commonName})</option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text font-medium text-base-content/80">Founding Queen Count</span></label>
              <input type="number" min="1" className="input input-bordered focus:input-primary bg-base-200/50 w-full lg:w-32" required
                value={formData.queenCount} onChange={e => setFormData({ ...formData, queenCount: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="modal-action mt-6 gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Abort</button>
              <button type="submit" className={`btn btn-primary ${isLoading ? 'loading' : ''}`}>Confirm Upload</button>
            </div>
          </form>
        </div>
        <div className="modal-backdrop bg-neutral/40" onClick={() => setIsModalOpen(false)}></div>
      </dialog>
    </div>
  );
};
