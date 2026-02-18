import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Settings as SettingsIcon, Shield } from 'lucide-react';

export default function Settings() {
  const { isSuperAdmin } = useAuth();

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <SettingsIcon className="h-7 w-7 text-amber-400" />
        Настройки платформы
      </h1>
      <div className="rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-8 text-center shadow-lg shadow-black/40">
        <Shield className="mx-auto h-12 w-12 text-amber-400/80 mb-4" />
        <p className="text-slate-200">Управление экосистемой: тарифы, лимиты, интеграции.</p>
        <p className="mt-2 text-sm text-slate-500">Раздел в разработке.</p>
      </div>
    </div>
  );
}
