import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';

interface WashSession {
    id: string;
    kioskId: string;
    userId: string;
    orgId: string;
    branchId: string;
    status: string;
    paidAmount: number;
    startedAt: string;
    finishedAt?: string;
    finishReason?: string;
}

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: '#22c55e',
    PAUSED: '#f59e0b',
    FINISHED: '#64748b',
    FAILED: '#ef4444',
    PENDING: '#3b82f6',
};

const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Активна',
    PAUSED: 'Пауза',
    FINISHED: 'Завершена',
    FAILED: 'Ошибка',
    PENDING: 'Ожидание',
};

function formatDuration(startedAt: string): string {
    const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    if (seconds < 60) return `${seconds} сек`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function WashSessions() {
    const [sessions, setSessions] = useState<WashSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('ACTIVE');
    const [, setTick] = useState(0);

    const loadSessions = useCallback(async () => {
        try {
            const params = statusFilter ? { status: statusFilter } : {};
            const { data } = await api.get('/api/v1/admin/wash-sessions', { params });
            setSessions(data);
            setError('');
        } catch (err) {
            console.error(err);
            setError('Ошибка загрузки сеансов');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        loadSessions();
        const interval = setInterval(() => {
            loadSessions();
            setTick(t => t + 1);
        }, 5000);
        return () => clearInterval(interval);
    }, [loadSessions]);

    // Обновляем таймеры каждую секунду
    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleStop = async (sessionId: string) => {
        if (!confirm('Остановить сеанс?')) return;
        try {
            await api.post(`/api/v1/admin/wash-sessions/${sessionId}/stop`);
            loadSessions();
        } catch {
            alert('Ошибка при остановке сеанса');
        }
    };

    const activeSessions = sessions.filter(s => s.status === 'ACTIVE' || s.status === 'PAUSED');

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        🚿 Сеансы мойки
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm font-medium">
                        Мониторинг активных сеансов в реальном времени (обновление каждые 5 сек)
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                        {activeSessions.length} активных
                    </span>
                </div>
            </div>

            {/* Status filter */}
            <div className="flex flex-wrap gap-2 mb-6">
                {['ACTIVE', 'PAUSED', 'FINISHED', 'FAILED', ''].map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${statusFilter === s
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                    >
                        {s ? STATUS_LABELS[s] : 'Все'}
                    </button>
                ))}
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm font-medium mb-6">
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400 font-medium">
                    Загрузка...
                </div>
            )}

            {/* Empty */}
            {!loading && sessions.length === 0 && (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <div className="text-4xl mb-4 opacity-50">🚿</div>
                    <div className="text-slate-900 dark:text-white text-lg font-bold">Нет сеансов</div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-xs mx-auto">
                        Сеансы появятся, когда пользователи отсканируют QR-код и оплатят мойку
                    </p>
                </div>
            )}

            {/* Sessions grid */}
            {!loading && sessions.length > 0 && (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {sessions.map(session => {
                        const color = STATUS_COLORS[session.status] || '#64748b';
                        const isActive = session.status === 'ACTIVE' || session.status === 'PAUSED';
                        return (
                            <div
                                key={session.id}
                                className={`relative group overflow-hidden rounded-2xl border bg-white dark:bg-slate-900/40 p-5 transition-all shadow-sm dark:shadow-none ${isActive
                                        ? 'border-blue-500/30 ring-1 ring-blue-500/10'
                                        : 'border-slate-200 dark:border-slate-800/60'
                                    }`}
                            >
                                {/* Status top bar */}
                                <div
                                    className="absolute top-0 left-0 right-0 h-1"
                                    style={{ background: color }}
                                />

                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <span className="opacity-70">📦</span>
                                            {session.kioskId}
                                        </div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                            ID: {session.id.slice(-8)}
                                        </div>
                                    </div>
                                    <span
                                        className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                                        style={{
                                            background: `${color}15`,
                                            color: color,
                                            border: `1px solid ${color}30`
                                        }}
                                    >
                                        {STATUS_LABELS[session.status] || session.status}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="space-y-2.5 mb-6">
                                    <InfoRow icon="💰" label="Оплата" value={`${(session.paidAmount || 0).toLocaleString()} сум`} color="text-emerald-600 dark:text-emerald-400" />
                                    {session.startedAt && (
                                        <InfoRow
                                            icon="⏱"
                                            label="Длительность"
                                            value={isActive ? formatDuration(session.startedAt) : new Date(session.startedAt).toLocaleTimeString('ru')}
                                            color="text-amber-600 dark:text-amber-400"
                                        />
                                    )}
                                    {session.userId && (
                                        <InfoRow icon="👤" label="Пользователь" value={session.userId.slice(-12)} color="text-slate-600 dark:text-slate-400" />
                                    )}
                                    {session.startedAt && (
                                        <InfoRow
                                            icon="🕐"
                                            label="Начало"
                                            value={new Date(session.startedAt).toLocaleString('ru')}
                                            color="text-slate-500 dark:text-slate-500"
                                        />
                                    )}
                                    {session.finishReason && (
                                        <InfoRow icon="📋" label="Причина" value={session.finishReason} color="text-red-500" />
                                    )}
                                </div>

                                {/* Actions */}
                                {isActive && (
                                    <button
                                        onClick={() => handleStop(session.id)}
                                        className="w-full py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 text-sm font-bold transition-all hover:bg-red-500/10 active:scale-[0.98]"
                                    >
                                        ⏹ Остановить сеанс
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function InfoRow({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-500 text-xs font-semibold flex items-center gap-1.5">
                <span className="text-sm opacity-100">{icon}</span>
                {label}
            </span>
            <span className={`text-xs font-bold ${color}`}>{value}</span>
        </div>
    );
}
