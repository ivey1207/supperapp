import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import Users from './pages/Users';
import Devices from './pages/Devices';
import Rfid from './pages/Rfid';
import Reports from './pages/Reports';
import Services from './pages/Services';
import Settings from './pages/Settings';
import HardwareKiosks from './pages/HardwareKiosks';
import Branches from './pages/Branches';
import Promotions from './pages/Promotions';
import WashSessions from './pages/WashSessions';
import PaymentReports from './pages/PaymentReports';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#0f172a] text-white">Загрузка...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="companies" element={<Companies />} />
        <Route path="branches" element={<Branches />} />
        <Route path="devices" element={<Devices />} />
        <Route path="rfid" element={<Rfid />} />
        <Route path="reports" element={<Reports />} />
        <Route path="services" element={<Services />} />
        <Route path="hardware-kiosks" element={<HardwareKiosks />} />
        <Route path="settings" element={<Settings />} />
        <Route path="promotions" element={<Promotions />} />
        <Route path="wash-sessions" element={<WashSessions />} />
        <Route path="payment-reports" element={<PaymentReports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
