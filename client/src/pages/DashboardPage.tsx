import { useEffect, useState, type FormEvent } from 'react';
import Chart from 'react-apexcharts';
import { useAuthStore } from '../stores/authStore';
import { useColonyStore } from '../stores/colonyStore';

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const { colonies, speciesLookup, fetchColonies, fetchSpecies, createColony, isLoading } = useColonyStore();

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
    <div className="space-y-8 animate-fade-in-up">
      <header className="flex justify-between items-center bg-base-100/50 backdrop-blur-md p-6 rounded-3xl shadow-lg border border-base-100/20">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Command Hub</h1>
          <p className="text-base-content/70 mt-1">Operator: {user?.email}</p>
        </div>
        <div className="stat place-items-end w-auto">
          <div className="stat-title">Active Biomes</div>
          <div className="stat-value text-secondary">{colonies.length || 0}</div>
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
        <div className="card bg-base-100/50 backdrop-blur-md shadow-xl border border-base-100/20">
          <div className="card-body">
            <h2 className="card-title text-xl">Monitored Entities</h2>
            <div className="divider my-2"></div>
            
            {colonies.length === 0 ? (
              <div className="text-center text-base-content/50 py-10">No active telemetry found. Add a colony.</div>
            ) : (
              <ul className="space-y-4">
                {colonies.map(c => (
                  <li key={c.id} className="flex justify-between items-center p-3 hover:bg-base-200/50 rounded-xl transition-colors cursor-pointer group">
                     <div>
                       <div className="font-semibold group-hover:text-primary transition-colors">{c.name}</div>
                       <div className="text-xs text-base-content/60">{c.species?.scientificName}</div>
                     </div>
                     <div className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-ghost'} badge-sm`}>
                       {c.status}
                     </div>
                  </li>
                ))}
              </ul>
            )}

            <button type="button" className="btn btn-outline btn-primary mt-auto" onClick={() => setIsModalOpen(true)}>Initialize New Colony</button>
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
                {speciesLookup.map((s: any) => (
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
