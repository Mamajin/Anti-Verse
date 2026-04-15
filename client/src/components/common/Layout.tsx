import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useUIStore } from '../../stores/uiStore';

export const Layout = () => {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <div className="flex h-screen overflow-hidden bg-[url('/hero.png')] bg-cover bg-center bg-fixed">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-neutral/80 mix-blend-multiply z-0 pointer-events-none" />
      
      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-neutral/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 z-10 relative">
        <Navbar />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth bg-white/5 backdrop-blur-[2px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
