import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const logout = useAuthStore(s => s.logout);
  return (
    <div className="min-h-screen bg-[url('/hero.png')] bg-cover bg-center bg-fixed">
      {/* Dark overlay for readability */}
      <div className="min-h-screen bg-neutral/80 backdrop-blur-sm flex flex-col transition-all duration-300">
        <header className="sticky top-0 z-50 bg-base-100/40 backdrop-blur-lg border-b border-base-content/10 shadow-sm">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <div className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-accent">
              Anti-Verse
            </div>
            <button onClick={logout} className="btn btn-ghost btn-sm text-base-content/70 hover:text-error">
              Disconnect
            </button>
          </div>
        </header>
        <main className="flex-grow container mx-auto p-4 lg:p-8 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
