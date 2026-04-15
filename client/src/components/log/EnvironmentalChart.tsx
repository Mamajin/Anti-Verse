import Chart from 'react-apexcharts';
import { useLogStore } from '../../stores/logStore';

export function EnvironmentalChart() {
  const { entries } = useLogStore();

  // Filter logs with environmental data
  const envLogs = entries
    .filter(e => e.temperature !== null || e.humidity !== null)
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

  if (envLogs.length === 0) {
    return (
      <div className="card bg-base-200/50 p-6 text-center text-base-content/50 border border-base-200 shadow-sm">
        No environmental telemetry available for correlation mapping.
      </div>
    );
  }

  const options: ApexCharts.ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
    colors: ['#6B705C', '#CB997E'], // Earth tones
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    dataLabels: { enabled: false },
    theme: { mode: 'light' },
    xaxis: { 
      categories: envLogs.map(e => new Date(e.recordedAt).toLocaleDateString()),
      labels: { show: false } 
    },
    tooltip: { theme: 'light' },
  };

  const series = [
    { name: 'Temperature (°C)', data: envLogs.map(e => e.temperature || 0) },
    { name: 'Humidity (%)', data: envLogs.map(e => e.humidity || 0) },
  ];

  return (
    <div className="card bg-base-100/50 p-4 border border-base-200 shadow-sm">
      <h3 className="text-lg font-bold mb-2 text-primary">Microclimate Analysis</h3>
      <Chart options={options} series={series} type="area" height={250} />
    </div>
  );
}
