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
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <SettingsIcon className="h-7 w-7 text-amber-500 font-bold" />
        Настройки платформы
      </h1>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/70 bg-white dark:bg-slate-900/40 p-8 text-center shadow-sm dark:shadow-none">
        <Shield className="mx-auto h-12 w-12 text-amber-500/80 mb-4" />
        <p className="text-slate-700 dark:text-slate-200 font-medium">Управление экосистемой: тарифы, лимиты, интеграции.</p>
        <p className="mt-2 text-sm text-slate-500 font-semibold">Раздел в разработке.</p>
      </div>
    </div>
  );
}
