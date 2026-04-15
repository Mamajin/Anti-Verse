import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { colonyApiClient } from '../utils/api';
import { useAuthStore } from '../stores/authStore';

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const [colonies, setColonies] = useState<any[]>([]);

  useEffect(() => {
    colonyApiClient.get('/').then(res => {
      setColonies(res.data.data);
    }).catch(console.error);
  }, []);

  const chartOptions = {
    chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
    colors: ['#34d399', '#38bdf8'],
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    dataLabels: { enabled: false },
    theme: { mode: 'dark' },
    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
    tooltip: { theme: 'dark' },
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
                       <div className="text-xs text-base-content/60">{c.species}</div>
                     </div>
                     <div className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-ghost'} badge-sm`}>
                       {c.status}
                     </div>
                  </li>
                ))}
              </ul>
            )}

            <button className="btn btn-outline btn-primary mt-auto">Initialise New Colony</button>
          </div>
        </div>
        
      </div>
    </div>
  );
};
