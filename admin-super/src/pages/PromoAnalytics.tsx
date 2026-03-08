import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPromoAnalytics } from '../lib/api';
import type { Promotion } from '../lib/api';
import { ArrowLeft, Target, TrendingUp, Users, DollarSign, BarChart3 } from 'lucide-react';

export default function PromoAnalytics() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<any>(null);

    useEffect(() => {
        if (id) {
            fetchAnalytics();
        }
    }, [id]);

    const fetchAnalytics = async () => {
        try {
            const data = await getPromoAnalytics(id!);
            setAnalytics(data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
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
                    value="High"
                    sub="По сравнению с нормой"
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
                                Расход бюджета со временем
                            </h3>
                        </div>
                        <div className="h-64 flex items-end justify-between gap-2 px-4">
                            {/* Simple Bar Chart Mockup */}
                            {[40, 60, 45, 90, 75, 55, 85].map((h, i) => (
                                <div key={i} className="flex-1 group relative">
                                    <div
                                        className="w-full bg-gradient-to-t from-blue-600/20 to-blue-500/60 rounded-t-xl transition-all duration-500 group-hover:to-blue-400"
                                        style={{ height: `${h}%` }}
                                    ></div>
                                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-600">Day {i + 1}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="rounded-[2.5rem] border border-slate-800/60 bg-slate-900/40 p-8 backdrop-blur-xl">
                        <h3 className="text-xl font-black text-white mb-6">Параметры акции</h3>
                        <div className="space-y-4">
                            <InfoRow label="Бюджет" value={`${(analytics.totalBudget || 0).toLocaleString()} UZS`} />
                            <InfoRow label="Старт" value="08.03.2026" />
                            <InfoRow label="Конец" value="08.04.2026" />
                            <InfoRow label="Статус" value="Активна" active />
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
