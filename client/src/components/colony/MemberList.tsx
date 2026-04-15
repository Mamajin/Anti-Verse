import { UserCircle } from 'lucide-react';
import type { ColonyMember } from '@antiverse/types';

export const MemberList = ({ members }: { members: ColonyMember[] }) => {
  return (
    <div className="space-y-4">
      {members.length === 0 ? (
        <div className="text-center py-6 text-base-content/50">No operational members found.</div>
      ) : (
        members.map((m) => (
          <div key={m.userId} className="flex items-center justify-between p-4 bg-base-200/40 rounded-xl border border-base-content/5">
            <div className="flex items-center gap-4">
              <div className="avatar placeholder">
                <div className="bg-neutral text-neutral-content w-10 rounded-full font-bold">
                  <span>{m.displayName.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <div>
                <div className="font-semibold">{m.displayName}</div>
                <div className="text-xs text-base-content/60">{m.email}</div>
              </div>
            </div>
            <div className="badge badge-outline capitalize">{m.accessRole}</div>
          </div>
        ))
      )}
    </div>
  );
};
