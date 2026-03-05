import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LayoutDashboard, Users, Building2, Smartphone, CreditCard, FileText, Settings, LogOut, Globe, Shield, Store, Sliders, Cpu, GitBranch, Tag, Droplets, Receipt, Sun, Moon } from 'lucide-react';
import { playClick } from '../lib/sound';
import { useTheme } from '../lib/theme';

const superAdminNav = [
  { to: '/', label: 'Панель управления', icon: LayoutDashboard },
  { to: '/companies', label: 'Партнёры (организации)', icon: Building2 },
  { to: '/branches', label: 'Филиалы (локации)', icon: GitBranch },
  { to: '/app-users', label: 'Клиенты (мобилка)', icon: Smartphone },
  { to: '/devices', label: 'Все девайсы', icon: Smartphone },
  { to: '/hardware-kiosks', label: 'Hardware Киоски', icon: Cpu },
  { to: '/users', label: 'Админы и менеджеры', icon: Users },
  { to: '/rfid', label: 'RFID Карты', icon: CreditCard },
  { to: '/reports', label: 'Отчёты по сети', icon: FileText },
  { to: '/promotions', label: 'Акции и скидки', icon: Tag },
  { to: '/services', label: 'Услуги (шаблоны)', icon: Settings },
  { to: '/wash-sessions', label: 'Сеансы мойки 🚿', icon: Droplets },
  { to: '/payment-reports', label: 'Отчёты по оплатам', icon: Receipt },
  { to: '/settings', label: 'Настройки платформы', icon: Sliders },
];

const partnerNav = [
  { to: '/', label: 'Панель управления', icon: LayoutDashboard },
  { to: '/companies', label: 'Моя компания', icon: Store },
  { to: '/branches', label: 'Мои филиалы', icon: GitBranch },
  { to: '/hardware-kiosks', label: 'Hardware Киоски', icon: Cpu },
  { to: '/users', label: 'Пользователи', icon: Users },
  { to: '/rfid', label: 'RFID Карты', icon: CreditCard },
  { to: '/reports', label: 'Отчёты', icon: FileText },
  { to: '/promotions', label: 'Мои акции', icon: Tag },
  { to: '/services', label: 'Услуги', icon: Settings },
];

export default function Layout() {
  const { user, logout, isSuperAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = isSuperAdmin ? superAdminNav : partnerNav;

  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

  const handleNav = (to: string) => {
    playClick();
    navigate(to);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <aside className="flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl dark:shadow-none z-10">
        <div className="flex h-16 items-center gap-2 px-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isSuperAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
            {isSuperAdmin ? <Shield className="h-5 w-5" /> : <span className="text-lg font-bold">C</span>}
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">Super App</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{isSuperAdmin ? 'Супер админ' : 'Партнёр'}</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => handleNav(item.to)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 animate-slide-in ${active
                  ? isSuperAdmin
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/70 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <button
            type="button"
            onClick={() => { playClick(); logout(); navigate('/login'); }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white font-semibold">
              {user?.fullName?.charAt(0) ?? user?.email?.charAt(0) ?? 'N'}
            </span>
            <span className="flex-1 text-left">Выход</span>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 shrink-0 items-center justify-end gap-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 shadow-sm dark:shadow-none transition-colors duration-300">
          <button
            type="button"
            onClick={() => { playClick(); toggleTheme(); }}
            className="rounded-full p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/70 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            aria-label="Переключить тему"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <button
            type="button"
            className="rounded-full p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/70 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            aria-label="Язык"
          >
            <Globe className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 rounded-full border border-slate-200 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-900/80 px-3 py-1.5 transition-colors">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500/60 to-cyan-400/60 text-xs font-semibold text-white">
              {user?.fullName?.charAt(0) ?? user?.email?.charAt(0) ?? 'N'}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-[160px]">
                {user?.email ?? ''}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {isSuperAdmin ? 'Super Admin · Экосистема' : 'Партнёр · Автомойка'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { playClick(); logout(); navigate('/login'); }}
            className="rounded-full p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            aria-label="Выход"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>
        <main className="flex-1 overflow-auto p-6 transition-colors duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
