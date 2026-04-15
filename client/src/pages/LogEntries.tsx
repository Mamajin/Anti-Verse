import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLogStore } from '../stores/logStore';
import { EnvironmentalChart } from '../components/log/EnvironmentalChart';
import { ArrowLeft, Clock, Plus, Trash2, Microscope, FlaskConical, Thermometer, Droplets, Database, Zap } from 'lucide-react';

export const LogEntries = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entries, fetchEntries, createEntry, deleteEntry, isLoading } = useLogStore();

  const [formData, setFormData] = useState({
    entryType: 'observation',
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
        title: [formData.entryType.charAt(0).toUpperCase() + formData.entryType.slice(1), 'Log'].join(' '),
        entryType: formData.entryType as any,
        content: formData.notes,
        environmentalReading: {
           temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
           humidity: formData.humidity ? parseFloat(formData.humidity) : undefined,
        }
      });
      setFormData({ entryType: 'observation', notes: '', temperature: '', humidity: '' });
    } catch (console) { }
  };

  return (
    <div className="space-y-8 animate-fade-in-up max-w-6xl mx-auto pb-20">
      <button onClick={() => navigate(`/colonies/${id}`)} className="group inline-flex items-center gap-2 text-base-content/40 hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest">
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to System Overview
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
         <div>
            <div className="flex items-center gap-3 text-primary mb-1">
              <Database size={20} strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Telemetry Stream</span>
            </div>
            <h1 className="text-4xl font-black text-base-content tracking-tighter">Transmission Logs</h1>
         </div>
         <div className="flex bg-base-100/40 p-1.5 rounded-2xl border border-base-content/5 shadow-sm">
            <div className="px-4 py-2 border-r border-base-content/10">
               <div className="text-[10px] font-black text-base-content/30 uppercase tracking-widest">Logged Events</div>
               <div className="text-xl font-black text-base-content">{entries.length}</div>
            </div>
            <div className="px-4 py-2">
               <div className="text-[10px] font-black text-base-content/30 uppercase tracking-widest">Stream Status</div>
               <div className="flex items-center gap-2 text-success font-black text-sm uppercase"><Zap size={14} className="animate-pulse" /> Live</div>
            </div>
         </div>
      </div>

      <EnvironmentalChart />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <form onSubmit={handleSubmit} className="glass-lab p-8 rounded-[2.5rem] border-primary/10 sticky top-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Plus size={20} />
              </div>
              <h3 className="font-black text-xl tracking-tight">New Sequence</h3>
            </div>
            
            <div className="space-y-6">
              <div className="form-control">
                <label className="label bg-glass-light px-3 py-1 mb-2 inline-flex w-fit"><span className="label-text text-[10px] font-black uppercase tracking-widest text-base-content/60">Classification</span></label>
                <select className="select select-bordered bg-base-100/50 rounded-xl border-base-content/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all font-bold" value={formData.entryType} onChange={e => setFormData({...formData, entryType: e.target.value})}>
                  <option value="observation">Observation</option>
                  <option value="feeding">Feeding</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="environmental">Environmental</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label bg-glass-light px-3 py-1 mb-2 inline-flex w-fit"><span className="label-text text-[10px] font-black uppercase tracking-widest text-base-content/60">Field Notes</span></label>
                <textarea className="textarea textarea-bordered h-32 bg-base-100/50 rounded-xl border-base-content/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all font-medium leading-relaxed" required placeholder="Describe detailed behavioral patterns or maintenance actions..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label bg-glass-light px-3 py-1 mb-2 inline-flex w-fit"><span className="label-text text-[10px] font-black uppercase tracking-widest text-base-content/60">Temp (°C)</span></label>
                  <div className="relative">
                    <Thermometer className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30" size={16} />
                    <input type="number" step="0.1" className="input input-bordered w-full pl-10 bg-base-100/50 border-base-content/10 rounded-xl font-bold" value={formData.temperature} onChange={e => setFormData({...formData, temperature: e.target.value})} />
                  </div>
                </div>
                <div className="form-control">
                  <label className="label bg-glass-light px-3 py-1 mb-2 inline-flex w-fit"><span className="label-text text-[10px] font-black uppercase tracking-widest text-base-content/60">Humidity (%)</span></label>
                  <div className="relative">
                    <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30" size={16} />
                    <input type="number" step="0.1" className="input input-bordered w-full pl-10 bg-base-100/50 border-base-content/10 rounded-xl font-bold" value={formData.humidity} onChange={e => setFormData({...formData, humidity: e.target.value})} />
                  </div>
                </div>
              </div>

              <button type="submit" className={`btn btn-primary w-full rounded-2xl h-14 shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-[10px] gap-2 ${isLoading ? 'loading' : ''}`}>
                <Database size={16} /> Append Record
              </button>
            </div>
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
                        <span className="text-xs text-base-content/40 font-mono">{new Date(entry.occurredAt).toLocaleString()}</span>
                     </div>
                     <p className="text-base-content/90 whitespace-pre-wrap">{entry.content}</p>
                     
                     {(entry.environmentalReading?.temperature != null || entry.environmentalReading?.humidity != null) && (
                       <div className="mt-3 flex gap-3 text-xs font-semibold text-base-content/60 bg-base-200/50 p-2 rounded-lg inline-flex border border-base-content/5">
                         {entry.environmentalReading?.temperature != null && <span>🌡️ {entry.environmentalReading?.temperature}°C</span>}
                         {entry.environmentalReading?.humidity != null && <span>💧 {entry.environmentalReading?.humidity}%</span>}
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
