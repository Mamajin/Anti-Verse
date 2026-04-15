import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useColonyStore } from '../stores/colonyStore';
import { ColonyStatusBadge } from '../components/colony/ColonyStatusBadge';
import { MemberList } from '../components/colony/MemberList';
import { Activity, Users, Settings, Database, ArrowLeft, Image as ImageLucide, FlaskConical, Crown, Boxes, Fingerprint, ShieldAlert } from 'lucide-react';

export const ColonyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentColony, members, fetchColonyById, fetchMembers, isLoading } = useColonyStore();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      fetchColonyById(id);
      fetchMembers(id);
    }
  }, [id, fetchColonyById, fetchMembers]);

  if (isLoading || !currentColony) return <div className="flex justify-center p-12"><span className="loading loading-spinner text-primary"></span></div>;

  return (
    <div className="space-y-8 animate-fade-in-up pb-20">
      <button onClick={() => navigate('/colonies')} className="group inline-flex items-center gap-2 text-base-content/40 hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest">
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Return to Bio-System Index
      </button>

      <header className="relative overflow-hidden bg-base-100/40 backdrop-blur-2xl p-10 rounded-[3rem] shadow-sm border border-base-content/5 group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-xl">
                  <img 
                    src="/assets/placeholders/specimen-placeholder.png" 
                    alt="Specimen Profile" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/placeholders/specimen-placeholder.png';
                    }}
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 p-1.5 bg-primary rounded-lg shadow-lg border border-white/20">
                  <FlaskConical size={16} className="text-primary-content" />
                </div>
              </div>
              <div className="space-y-0.5 bg-glass-light px-4 py-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-black text-base-content tracking-tighter uppercase">{currentColony.name}</h1>
                  <ColonyStatusBadge status={currentColony.status} />
                </div>
                <div className="flex items-center gap-2 text-base-content/40 text-[10px] font-bold uppercase tracking-widest">
                  <Fingerprint size={12} /> ID: {currentColony.id.split('-')[0]}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-lg font-black text-secondary/80">
               <span className="italic">{currentColony.species?.scientificName}</span>
               <span className="text-base-content/20 font-light">|</span>
               <span className="text-sm font-bold text-base-content/50">{currentColony.species?.commonName}</span>
            </div>
          </div>
          
          <div className="flex gap-6 p-6 bg-base-200/50 rounded-[2rem] border border-base-content/5 shadow-inner">
            <div className="flex items-center gap-4 px-4">
              <div className="p-2 bg-secondary/10 rounded-xl text-secondary">
                <Crown size={20} />
              </div>
              <div>
                <div className="text-[10px] font-black text-base-content/30 uppercase tracking-widest">Queens</div>
                <div className="text-2xl font-black text-base-content leading-none">{currentColony.queenCount}</div>
              </div>
            </div>
            <div className="w-px h-10 bg-base-content/10 self-center" />
            <div className="flex items-center gap-4 px-4">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Boxes size={20} />
              </div>
              <div>
                <div className="text-[10px] font-black text-base-content/30 uppercase tracking-widest">Workers</div>
                <div className="text-2xl font-black text-base-content leading-none">{(currentColony.estimatedWorkerCount || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex overflow-x-auto pb-4 mt-10 scrollbar-hide">
          <div className="flex bg-base-200/60 p-1.5 rounded-2xl border border-base-content/5 min-w-max">
            <button className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all ${activeTab === 'overview' ? 'bg-primary text-primary-content shadow-lg shadow-primary/20' : 'text-base-content/50 hover:text-primary'}`} 
              onClick={() => setActiveTab('overview')}><Activity size={14} /> Overview</button>
            <button className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all ${activeTab === 'members' ? 'bg-primary text-primary-content shadow-lg shadow-primary/20' : 'text-base-content/50 hover:text-primary'}`} 
              onClick={() => setActiveTab('members')}><Users size={14} /> Operators</button>
            <button className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all ${activeTab === 'logs' ? 'bg-primary text-primary-content shadow-lg shadow-primary/20' : 'text-base-content/50 hover:text-primary'}`} 
              onClick={() => navigate(`/colonies/${id}/logs`)}><Database size={14} /> Telemetry</button>
            <button className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all ${activeTab === 'media' ? 'bg-primary text-primary-content shadow-lg shadow-primary/20' : 'text-base-content/50 hover:text-primary'}`} 
              onClick={() => navigate(`/colonies/${id}/media`)}><ImageLucide size={14} /> Vault</button>
            <button className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all ${activeTab === 'settings' ? 'bg-primary text-primary-content shadow-lg shadow-primary/20' : 'text-base-content/50 hover:text-primary'}`} 
              onClick={() => setActiveTab('settings')}><Settings size={14} /> Protocol</button>
          </div>
        </div>
      </header>

      <main className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card bg-base-100/50 shadow-sm border border-base-200">
               <div className="card-body justify-center items-center text-base-content/50">
                 [Population Lifecycle Charts Placeholder - Reusing from Dashboard]
               </div>
            </div>
            <div className="card bg-base-100/50 shadow-sm border border-base-200">
               <div className="card-body">
                 <h3 className="card-title text-lg border-b border-base-content/10 pb-2">Species Protocol</h3>
                 <div className="space-y-3 mt-2">
                   <div><div className="text-xs text-base-content/50 uppercase font-bold">Common Name</div><div className="font-medium text-base-content/90">{currentColony.species?.commonName}</div></div>
                   <div><div className="text-xs text-base-content/50 uppercase font-bold">Class / Subfamily</div><div className="font-medium text-base-content/90">{currentColony.species?.id}</div></div>
                 </div>
                 <button className="btn btn-block btn-outline btn-primary mt-auto">Consult Vault</button>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="card bg-base-100/50 shadow-sm border border-base-200/50">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h2 className="card-title">Assigned Operators</h2>
                <button className="btn btn-sm btn-primary">Invite Operator</button>
              </div>
              <MemberList members={members} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
