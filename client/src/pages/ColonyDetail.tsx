import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useColonyStore } from '../stores/colonyStore';
import { ColonyStatusBadge } from '../components/colony/ColonyStatusBadge';
import { MemberList } from '../components/colony/MemberList';
import { Activity, Users, Settings, Database, ArrowLeft } from 'lucide-react';

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
    <div className="space-y-6 animate-fade-in">
      <button onClick={() => navigate('/colonies')} className="btn btn-ghost btn-sm mb-2 text-base-content/70 hover:text-primary pl-0">
        <ArrowLeft size={16} className="mr-1" /> Return to Telemetries
      </button>

      <header className="bg-base-100/50 backdrop-blur-xl p-8 rounded-3xl shadow-sm border border-base-200/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">{currentColony.name}</h1>
              <ColonyStatusBadge status={currentColony.status} />
            </div>
            <p className="text-lg text-base-content/80 font-medium">{currentColony.species?.scientificName}</p>
            {currentColony.description && <p className="mt-4 text-base-content/70 max-w-2xl">{currentColony.description}</p>}
          </div>
          
          <div className="flex gap-6 p-4 bg-base-200/50 rounded-2xl border border-base-content/5">
            <div className="text-center">
              <div className="text-sm font-bold text-base-content/50 uppercase tracking-wider mb-1">Queens</div>
              <div className="text-2xl font-black text-primary">{currentColony.queenCount}</div>
            </div>
            <div className="w-px bg-base-content/10"></div>
            <div className="text-center">
              <div className="text-sm font-bold text-base-content/50 uppercase tracking-wider mb-1">Workers</div>
              <div className="text-2xl font-black text-secondary">{currentColony.estimatedWorkerCount || 0}</div>
            </div>
          </div>
        </div>

        <div className="tabs tabs-boxed bg-base-200/40 p-1 mt-8 inline-flex">
          <button className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`} onClick={() => setActiveTab('overview')}><Activity size={16} className="mr-2" /> Overview</button>
          <button className={`tab ${activeTab === 'members' ? 'tab-active' : ''}`} onClick={() => setActiveTab('members')}><Users size={16} className="mr-2" /> Operators</button>
          <button className={`tab ${activeTab === 'logs' ? 'tab-active' : ''}`} onClick={() => navigate(`/colonies/${id}/logs`)}><Database size={16} className="mr-2" /> Logs & Telemetry</button>
          <button className={`tab ${activeTab === 'settings' ? 'tab-active' : ''}`} onClick={() => setActiveTab('settings')}><Settings size={16} className="mr-2" /> Protocol Settings</button>
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
