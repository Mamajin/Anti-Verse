import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ColonyList } from './pages/ColonyList';
import { ColonyDetail } from './pages/ColonyDetail';
import { LogEntries } from './pages/LogEntries';
import { Layout } from './components/common/Layout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { RoleGuard } from './components/common/RoleGuard';

export default function App() {
  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ className: 'bg-base-200 text-base-content border border-base-content/10' }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected app views */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            {/* Phase 2/3: Colonies & Logs */}
            <Route path="/colonies" element={<ColonyList />} />
            <Route path="/colonies/:id" element={<ColonyDetail />} />
            <Route path="/colonies/:id/logs" element={<LogEntries />} />
            
            {/* Phase 5: Settings / Admin */}
            {/* <Route path="/settings" element={<Settings />} /> */}
            {/* <Route element={<RoleGuard requiredRole="admin" />}>
                  <Route path="/admin/users" element={<AdminUsers />} /> 
                </Route> */}
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
