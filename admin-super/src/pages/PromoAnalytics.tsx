import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPromoAnalytics, getPromoDailyStats } from '../lib/api';
import { ArrowLeft, Target, TrendingUp, Users, DollarSign, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';

export default function PromoAnalytics() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<any>(null);
    const [dailyStats, setDailyStats] = useState<any[]>([]);

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    const fetchData = async () => {
        try {
            const [summary, stats] = await Promise.all([
                getPromoAnalytics(id!),
                getPromoDailyStats(id!)
            ]);
            setAnalytics(summary);
            setDailyStats(stats);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-slate-950">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
    );

    if (!analytics) return (
        <div className="p-10 text-center text-white bg-slate-950 h-screen">
            <h1 className="text-2xl font-bold">Analytics not found</h1>
            <button onClick={() => navigate('/promotions')} className="mt-4 text-blue-500 hover:underline flex items-center justify-center gap-2">
                <ArrowLeft size={16} /> Back to Promotions
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 p-6 lg:p-10">
            {/* Header */}
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <button
                        onClick={() => navigate('/promotions')}
                        className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-white transition-all uppercase tracking-widest"
                    >
                        <ArrowLeft size={16} /> Назад к акциям
                    </button>
                    <h1 className="text-4xl font-black text-white tracking-tight">
                        Аналитика: <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{analytics.title}</span>
                    </h1>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard
                    icon={<DollarSign className="text-emerald-400" />}
                    label="Потрачено"
                    value={`${(analytics.currentSpend || 0).toLocaleString()} UZS`}
                    sub={`${analytics.burnRate?.toFixed(1)}% от бюджета`}
                />
                <StatCard
                    icon={<Users className="text-blue-400" />}
                    label="Использований"
                    value={analytics.usageCount?.toLocaleString()}
                    sub="Уникальных применений"
                />
                <StatCard
                    icon={<Target className="text-rose-400" />}
                    label="Эффективность"
                    value="Высокая"
                    sub="ROI выше среднего"
                />
                <StatCard
                    icon={<TrendingUp className="text-amber-400" />}
                    label="Burn Rate"
                    value={`${analytics.burnRate?.toFixed(1)}%`}
                    sub="Темп расхода бюджета"
                />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="rounded-[2.5rem] border border-slate-800/60 bg-slate-900/40 p-8 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                                <BarChart3 className="text-blue-500" />
                                Динамика использований
                            </h3>
                        </div>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyStats}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#64748b"
                                        fontSize={10}
                                        tickFormatter={(str) => str.split('-').slice(1).reverse().join('.')}
                                    />
                                    <YAxis stroke="#64748b" fontSize={10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem' }}
                                        labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-[2.5rem] border border-slate-800/60 bg-slate-900/40 p-8 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                                <DollarSign className="text-emerald-500" />
                                Расход бюджета (UZS)
                            </h3>
                        </div>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyStats}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#64748b"
                                        fontSize={10}
                                        tickFormatter={(str) => str.split('-').slice(1).reverse().join('.')}
                                    />
                                    <YAxis stroke="#64748b" fontSize={10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem' }}
                                        formatter={(value: any) => [`${value.toLocaleString()} UZS`, 'Расход']}
                                    />
                                    <Bar dataKey="spend" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="rounded-[2.5rem] border border-slate-800/60 bg-slate-900/40 p-8 backdrop-blur-xl">
                        <h3 className="text-xl font-black text-white mb-6">Параметры акции</h3>
                        <div className="space-y-4">
                            <InfoRow label="Бюджет" value={`${(analytics.totalBudget || 0).toLocaleString()} UZS`} />
                            <InfoRow label="Текущий расход" value={`${(analytics.currentSpend || 0).toLocaleString()} UZS`} />
                            <InfoRow label="Всего транзакций" value={analytics.usageCount || 0} />
                            <InfoRow label="Статус" value="Активна" active />
                        </div>
                    </div>

                    <div className="rounded-[2.5rem] border border-slate-800/60 bg-slate-900/40 p-8 backdrop-blur-xl">
                        <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                            <PieChartIcon size={20} className="text-purple-500" />
                            Состояние бюджета
                        </h3>
                        <div className="relative h-4 w-full bg-slate-800 rounded-full overflow-hidden mb-4">
                            <div
                                className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000"
                                style={{ width: `${Math.min(analytics.burnRate || 0, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-slate-500">Потрачено {analytics.burnRate?.toFixed(1)}%</span>
                            <span className="text-blue-400">Остаток {(100 - (analytics.burnRate || 0)).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, sub }: any) {
    return (
        <div className="rounded-[2.5rem] border border-slate-800/60 bg-slate-900/40 p-8 backdrop-blur-xl hover:border-blue-500/30 transition-all group">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-slate-800/50 rounded-2xl group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</span>
            </div>
            <div className="text-3xl font-black text-white mb-1 tracking-tight">{value}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest opacity-60">{sub}</div>
        </div>
    );
}

function InfoRow({ label, value, active }: any) {
    return (
        <div className="flex justify-between items-center py-3 border-b border-slate-800/40 last:border-0">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</span>
            <span className={`text-sm font-black ${active ? 'text-emerald-500' : 'text-white'}`}>{value}</span>
        </div>
    );
}
