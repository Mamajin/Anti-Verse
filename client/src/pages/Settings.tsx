import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { UserCircle, Palette } from 'lucide-react';
import toast from 'react-hot-toast';

export const Settings = () => {
  const { user } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Protocol Settings successfully updated.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-black text-primary">Protocol Settings</h1>
        <p className="text-base-content/70">Operator preferences, UI scaling, and platform appearance.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-2">
           <div className="flex items-center gap-2 font-bold text-lg border-b border-base-content/10 pb-2"><UserCircle size={20} /> Identity</div>
           <p className="text-sm text-base-content/60">Configure your public operator parameters.</p>
        </div>
        <div className="md:col-span-2 card bg-base-200/50 shadow-sm border border-base-200">
           <form className="card-body" onSubmit={handleSaveProfile}>
             <div className="form-control">
               <label className="label"><span className="label-text">Operator Email</span></label>
               <input type="text" className="input input-bordered bg-base-100/50" disabled value={user?.email || ''} />
               <label className="label"><span className="label-text-alt text-base-content/50">Core system email cannot be mutated.</span></label>
             </div>
             
             <div className="form-control mt-4">
               <label className="label"><span className="label-text">Clearance Badge</span></label>
               <span className="badge badge-primary badge-outline uppercase tracking-wider p-4 w-fit">{user?.role}</span>
             </div>

             <div className="card-actions justify-end mt-6 pt-6 border-t border-base-content/5">
                <button type="submit" className="btn btn-primary">Save Parameter</button>
             </div>
           </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-2">
           <div className="flex items-center gap-2 font-bold text-lg border-b border-base-content/10 pb-2"><Palette size={20} /> Presentation</div>
           <p className="text-sm text-base-content/60">Mutate UI optical layers.</p>
        </div>
        <div className="md:col-span-2 card bg-base-200/50 shadow-sm border border-base-200">
           <div className="card-body">
             <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4 p-4 border border-base-content/10 rounded-xl hover:bg-base-100/50 transition-colors">
                  <input type="radio" name="theme" className="radio radio-primary" checked={theme === 'antiverseTheme'} onChange={() => setTheme('antiverseTheme')} />
                  <div>
                    <span className="label-text font-bold block">Anti-Verse Baseline (Earth Tone)</span>
                    <span className="text-xs text-base-content/50">Low emission visibility mapping for nocturnal environments.</span>
                  </div>
                </label>
             </div>
             <div className="form-control mt-2">
                <label className="label cursor-pointer justify-start gap-4 p-4 border border-base-content/10 rounded-xl hover:bg-base-100/50 transition-colors">
                  <input type="radio" name="theme" className="radio radio-primary" checked={theme === 'light'} onChange={() => setTheme('light')} />
                  <div>
                    <span className="label-text font-bold block">Terminal Light</span>
                    <span className="text-xs text-base-content/50">High contrast illumination mode.</span>
                  </div>
                </label>
             </div>
           </div>
        </div>
      </div>

    </div>
  );
};
