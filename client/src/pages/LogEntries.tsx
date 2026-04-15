import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLogStore } from '../stores/logStore';
import { EnvironmentalChart } from '../components/log/EnvironmentalChart';
import { ArrowLeft, Clock, Plus, Trash2 } from 'lucide-react';
import { LogEntryType } from '@antiverse/types';

export const LogEntries = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entries, fetchEntries, createEntry, deleteEntry, isLoading } = useLogStore();

  const [formData, setFormData] = useState({
    entryType: LogEntryType.Observation,
    notes: '',
    temperature: '',
    humidity: '',
  });

  useEffect(() => {
    if (id) fetchEntries(id);
  }, [id, fetchEntries]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await createEntry(id, {
        entryType: formData.entryType,
        notes: formData.notes,
        temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
        humidity: formData.humidity ? parseFloat(formData.humidity) : undefined,
      });
      setFormData({ entryType: LogEntryType.Observation, notes: '', temperature: '', humidity: '' });
    } catch (console) { }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <button onClick={() => navigate(`/colonies/${id}`)} className="btn btn-ghost btn-sm mb-2 text-base-content/70 hover:text-primary pl-0">
        <ArrowLeft size={16} className="mr-1" /> Back to System Overview
      </button>

      <div className="flex justify-between items-end">
         <h1 className="text-3xl font-bold">Telemetry Stream</h1>
      </div>

      <EnvironmentalChart />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <form onSubmit={handleSubmit} className="card bg-base-200/50 p-6 border border-base-300 shadow-sm sticky top-20">
            <h3 className="font-bold text-lg mb-4">Log Sequence</h3>
            
            <div className="form-control mb-4">
              <label className="label"><span className="label-text">Classification</span></label>
              <select className="select select-bordered" value={formData.entryType} onChange={e => setFormData({...formData, entryType: e.target.value as LogEntryType})}>
                <option value={LogEntryType.Observation}>Observation</option>
                <option value={LogEntryType.Feeding}>Feeding</option>
                <option value={LogEntryType.Maintenance}>Maintenance</option>
                <option value={LogEntryType.Mortality}>Mortality</option>
              </select>
            </div>

            <div className="form-control mb-4">
              <label className="label"><span className="label-text">Notes</span></label>
              <textarea className="textarea textarea-bordered h-24" required value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
            </div>

            <div className="flex gap-2 mb-4">
              <div className="form-control w-1/2">
                <label className="label"><span className="label-text">Temp (°C)</span></label>
                <input type="number" step="0.1" className="input input-bordered" value={formData.temperature} onChange={e => setFormData({...formData, temperature: e.target.value})} />
              </div>
              <div className="form-control w-1/2">
                <label className="label"><span className="label-text">Humidity (%)</span></label>
                <input type="number" step="0.1" className="input input-bordered" value={formData.humidity} onChange={e => setFormData({...formData, humidity: e.target.value})} />
              </div>
            </div>

            <button type="submit" className={`btn btn-primary w-full ${isLoading ? 'loading' : ''}`}><Plus size={18} /> Append Record</button>
          </form>
        </div>

        <div className="md:col-span-2 space-y-4">
          {entries.length === 0 ? (
            <div className="p-8 text-center bg-base-200/30 rounded-2xl border border-base-200 text-base-content/50">
              No transmission logs detected for this cycle.
            </div>
          ) : (
            entries.map(entry => (
              <div key={entry.id} className="card bg-base-100/70 border border-base-200 shadow-sm hover:border-primary/30 transition-colors">
                <div className="card-body p-5 flex flex-row gap-4 relative group">
                   <div className="bg-primary/10 rounded-full w-10 h-10 flex items-center justify-center shrink-0">
                     <Clock size={18} className="text-primary" />
                   </div>
                   <div className="flex-1">
                     <div className="flex justify-between items-start">
                        <span className="badge badge-outline capitalize mb-2">{entry.entryType}</span>
                        <span className="text-xs text-base-content/40 font-mono">{new Date(entry.recordedAt).toLocaleString()}</span>
                     </div>
                     <p className="text-base-content/90 whitespace-pre-wrap">{entry.notes}</p>
                     
                     {(entry.temperature || entry.humidity) && (
                       <div className="mt-3 flex gap-3 text-xs font-semibold text-base-content/60 bg-base-200/50 p-2 rounded-lg inline-flex border border-base-content/5">
                         {entry.temperature && <span>🌡️ {entry.temperature}°C</span>}
                         {entry.humidity && <span>💧 {entry.humidity}%</span>}
                       </div>
                     )}
                   </div>
                   <button onClick={() => deleteEntry(id!, entry.id).catch(()=>{})} className="absolute top-4 right-4 text-error opacity-0 group-hover:opacity-100 transition-opacity btn btn-xs btn-ghost btn-square">
                     <Trash2 size={16} />
                   </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
