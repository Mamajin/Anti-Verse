import { ShieldAlert } from 'lucide-react';

export const AdminUsers = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-error to-warning">Sysadmin Control</h1>
        <p className="text-base-content/70">Centralized operator control and clearance assignment.</p>
      </header>

      <div className="card bg-error/10 border border-error/20 p-8 text-center flex flex-col items-center justify-center">
        <ShieldAlert size={48} className="text-error mb-4" />
        <h2 className="text-xl font-bold text-error">Clearance Verified.</h2>
        <p className="text-base-content/70 max-w-lg mt-2">
          Operator management module is active. Real-time integration of active auth pools has not yet been mounted in this revision of the interface.
        </p>
      </div>
    </div>
  );
};
