import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Simple placeholder components for Foundation commit
const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex flex-col bg-base-200">
    <header className="bg-neutral text-neutral-content p-4 shadow-md">
      <div className="container mx-auto font-bold text-xl text-primary">Anti-Verse Platform</div>
    </header>
    <main className="flex-grow container mx-auto p-4">{children}</main>
  </div>
);

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const LoginPage = () => <div className="text-center p-10"><h2 className="text-2xl mb-4">Login Page</h2><p className="text-gray-500">To be implemented in Commit 8</p></div>;
const DashboardPage = () => <div className="text-center p-10"><h2 className="text-2xl mb-4">Dashboard</h2><p className="text-gray-500">To be implemented in Commit 8</p></div>;

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Layout><LoginPage /></Layout>} />
        
        {/* Private Routes */}
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
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
