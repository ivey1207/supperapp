import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Zap, Users, Building2, DollarSign } from 'lucide-react';
import { playSuccess } from '../lib/sound';
import { getOrganizations, getBranches, getAccounts } from '../lib/api';
import { useAuth } from '../lib/auth';

const kpiCardConfig = [
  { key: 'kiosks', label: 'Киоски', icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'users', label: 'Пользователи', icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { key: 'companies', label: 'Компании', icon: Building2, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { key: 'revenue', label: 'Выручка сегодня', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
];

const weeklyRevenue = [
  { name: 'Monday', value: 600 },
  { name: 'Tuesday', value: 1200 },
  { name: 'Wednesday', value: 900 },
  { name: 'Thursday', value: 1800 },
  { name: 'Friday', value: 1500 },
  { name: 'Saturday', value: 2400 },
  { name: 'Sunday', value: 2100 },
];

const paymentMethods = [
  { name: 'Card', value: 45, color: '#3b82f6' },
  { name: 'Cash', value: 30, color: '#06b6d4' },
  { name: 'Wallet', value: 15, color: '#8b5cf6' },
  { name: 'Other', value: 10, color: '#0ea5e9' },
];

export default function Dashboard() {
  const { isSuperAdmin } = useAuth();
  const [kpi, setKpi] = useState({ kiosks: 0, users: 0, companies: 0, revenue: '0 сум' });

  useEffect(() => {
    playSuccess();
  }, []);

  useEffect(() => {
    Promise.all([getBranches(), getAccounts(), getOrganizations()])
      .then(([branches, accounts, orgs]) => {
        setKpi({
          kiosks: branches.length,
          users: accounts.length,
          companies: orgs.length,
          revenue: '—',
        });
      })
      .catch(() => {});
  }, []);

  const kpiValues: Record<string, string | number> = {
    kiosks: kpi.kiosks,
    users: kpi.users,
    companies: kpi.companies,
    revenue: kpi.revenue,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">Панель управления</h1>
        <p className="text-sm text-slate-400">
          {isSuperAdmin ? 'Обзор всей сети партнёров и киосков' : 'Обзор показателей вашей автомойки'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCardConfig.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-5 shadow-lg shadow-black/40 transition-all duration-300 hover:border-slate-600 hover:shadow-xl hover:scale-[1.02]"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{card.label}</span>
                <span className={`rounded-xl p-2.5 shadow-inner shadow-slate-900/50 ${card.bg} ${card.color}`}>
                  <Icon className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold text-white">{kpiValues[card.key]}</div>
              <div className="mt-1 text-[11px] text-slate-500">
                {card.key === 'kiosks' && 'Активных постов в сети'}
                {card.key === 'users' && 'Администраторов и менеджеров'}
                {card.key === 'companies' && 'Подключённых партнёрских организаций'}
                {card.key === 'revenue' && 'Оборот по всем транзакциям за день'}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-5 shadow-lg shadow-black/40 transition-all duration-300 hover:border-slate-600">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Динамика выручки за неделю</h3>
            <span className="text-[11px] text-slate-500">Все посты мойки</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyRevenue} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} />
              <YAxis stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-5 shadow-lg shadow-black/40 transition-all duration-300 hover:border-slate-600">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Способы оплаты</h3>
            <span className="text-[11px] text-slate-500">Доля по типам платежей</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentMethods}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {paymentMethods.map((_, index) => (
                  <Cell key={index} fill={paymentMethods[index].color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
