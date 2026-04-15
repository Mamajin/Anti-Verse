import { NavLink } from 'react-router-dom';
import { Home, Bug, Settings, Users, LogOut, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

export const Sidebar = () => {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const links = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/colonies', icon: Bug, label: 'Telemetries' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];
  
  if (user?.role === 'admin') {
    links.push({ to: '/admin/users', icon: Users, label: 'Operators' });
  }

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-base-200/80 backdrop-blur-xl border-r border-base-content/10 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="h-full flex flex-col">
        <div className="h-16 flex items-center justify-between px-6 border-b border-base-content/10">
          <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Anti-Verse</span>
          <button className="lg:hidden btn btn-sm btn-ghost btn-circle" onClick={toggleSidebar}>
            <ChevronLeft size={20} />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="menu menu-md w-full px-4 gap-2">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} className={({ isActive }) => `${isActive ? 'active bg-primary/20 text-primary' : 'text-base-content/70 hover:bg-base-300'}`}>
                  <link.icon size={20} />
                  <span className="font-medium">{link.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-base-content/10 flex items-center justify-between">
          <div className="flex flex-col truncate">
            <span className="text-sm font-bold text-base-content truncate">{user?.email}</span>
            <span className="text-xs text-base-content/50 uppercase">{user?.role}</span>
          </div>
          <button onClick={logout} className="btn btn-ghost btn-sm btn-square text-error hover:bg-error/20" title="Disconnect">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};
