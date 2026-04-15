import { Menu, Bell } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useLocation } from 'react-router-dom';

export const Navbar = () => {
  const { toggleSidebar } = useUIStore();
  const location = useLocation();

  // Basic breadcrumb generation based on path
  const pathnames = location.pathname.split('/').filter(x => x);
  const breadcrumbs = ['Home', ...pathnames.map(p => p.charAt(0).toUpperCase() + p.slice(1))];

  return (
    <header className="sticky top-0 z-40 h-16 bg-base-100/40 backdrop-blur-lg border-b border-base-content/10 shadow-sm flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-4">
        <button className="lg:hidden btn btn-ghost btn-square" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        
        <div className="text-sm breadcrumbs hidden sm:inline-flex text-base-content/70 font-medium tracking-wide">
          <ul>
            {breadcrumbs.map((crumb, idx) => (
              <li key={idx} className={idx === breadcrumbs.length - 1 ? 'text-primary' : ''}>
                {crumb}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="btn btn-ghost btn-circle">
          <div className="indicator">
            <Bell size={20} className="text-base-content/70" />
            <span className="badge badge-xs badge-primary indicator-item"></span>
          </div>
        </button>
      </div>
    </header>
  );
};
