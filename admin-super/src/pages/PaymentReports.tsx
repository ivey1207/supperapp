import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';

interface PaymentTransaction {
    id: string;
    paymentType: 'CASH' | 'RFID' | 'ONLINE';
    kioskId: string;
    orgId: string;
    branchId: string;
    userId?: string;
    rfidCardId?: string;
    washSessionId?: string;
    amount: number;
    currency: string;
    status: string;
    description?: string;
    createdAt: string;
}

interface Summary {
    CASH: { count: number; total: number };
    RFID: { count: number; total: number };
    ONLINE: { count: number; total: number };
    ALL: { count: number; total: number };
}

const TYPE_CONFIG = {
    CASH: { label: 'Купюроприёмник', icon: '💵', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' },
    RFID: { label: 'RFID Карта', icon: '💳', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
    ONLINE: { label: 'Онлайн (приложение)', icon: '📱', color: '#a855f7', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.3)' },
};

const STATUS_COLOR: Record<string, string> = {
    SUCCESS: '#22c55e',
    PENDING: '#f59e0b',
    FAILED: '#ef4444',
    REFUNDED: '#94a3b8',
};

function fmt(n: number): string {
    return (n || 0).toLocaleString('ru') + ' сум';
}

export default function PaymentReports() {
    const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (typeFilter) params.type = typeFilter;
            if (dateFilter) params.date = dateFilter;

            const [txRes, sumRes] = await Promise.all([
                api.get('/api/v1/admin/payments', { params }),
                api.get('/api/v1/admin/payments/summary', { params: dateFilter ? { date: dateFilter } : {} }),
            ]);
            setTransactions(txRes.data);
            setSummary(sumRes.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [typeFilter, dateFilter]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="p-6 space-y-6">
            {/* Заголовок */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    💰 Отчёты по оплатам
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm font-medium">
                    Все виды оплат: купюроприёмник, RFID-карта, онлайн через приложение
                </p>
            </div>

            {/* Summary карточки */}
            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {(['CASH', 'RFID', 'ONLINE'] as const).map(type => {
                        const cfg = TYPE_CONFIG[type];
                        const s = summary[type];
                        return (
                            <div
                                key={type}
                                onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
                                className={`p-5 rounded-2xl cursor-pointer transition-all border ${typeFilter === type
                                        ? `bg-blue-500/10 border-blue-500/30`
                                        : `bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm dark:shadow-none`
                                    }`}
                                style={typeFilter === type ? { borderColor: `${cfg.color}50`, background: `${cfg.color}10` } : {}}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="text-3xl">{cfg.icon}</div>
                                    {typeFilter === type && (
                                        <span
                                            className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider"
                                            style={{ background: `${cfg.color}20`, color: cfg.color }}
                                        >
                                            фильтр
                                        </span>
                                    )}
                                </div>
                                <div className="text-slate-500 dark:text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{cfg.label}</div>
                                <div className="text-2xl font-black" style={{ color: cfg.color }}>{fmt(s.total)}</div>
                                <div className="text-slate-400 dark:text-slate-500 text-xs mt-1 font-semibold">{s.count} транзакций</div>
                            </div>
                        );
                    })}
                    {/* Итого */}
                    <div className="p-5 rounded-2xl bg-slate-900/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
                        <div className="text-3xl mb-4">📊</div>
                        <div className="text-slate-500 dark:text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Всего</div>
                        <div className="text-slate-900 dark:text-slate-100 text-2xl font-black">{fmt(summary.ALL.total)}</div>
                        <div className="text-slate-400 dark:text-slate-500 text-xs mt-1 font-semibold">{summary.ALL.count} транзакций</div>
                    </div>
                </div>
            )}

            {/* Фильтры */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    {[{ v: '', l: 'Все типы' }, { v: 'CASH', l: '💵 Cash' }, { v: 'RFID', l: '💳 RFID' }, { v: 'ONLINE', l: '📱 Онлайн' }].map(f => (
                        <button
                            key={f.v}
                            onClick={() => setTypeFilter(f.v)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${typeFilter === f.v
                                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            {f.l}
                        </button>
                    ))}
                </div>
                <input
                    type="date"
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-none border border-transparent focus:border-blue-500/50 cursor-pointer"
                />
                {(typeFilter || dateFilter) && (
                    <button
                        onClick={() => { setTypeFilter(''); setDateFilter(''); }}
                        className="px-4 py-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all active:scale-[0.98]"
                    >
                        ✕ Сбросить
                    </button>
                )}
            </div>

            {/* Таблица транзакций */}
            {loading ? (
                <div className="py-20 text-center text-slate-500 dark:text-slate-400 font-medium">Загрузка...</div>
            ) : transactions.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <div className="text-4xl mb-4 opacity-50">💰</div>
                    <div className="text-slate-900 dark:text-white text-lg font-bold">Нет транзакций</div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-xs mx-auto">
                        Транзакции появятся после первых оплат через кассу, RFID-карту или приложение
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/60 overflow-hidden shadow-sm dark:shadow-none">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                                    {['Тип оплаты', 'Киоск', 'Сумма', 'Статус', 'Детали', 'Дата и время'].map(h => (
                                        <th key={h} className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => {
                                    const cfg = TYPE_CONFIG[tx.paymentType] || { label: tx.paymentType, icon: '?', color: '#94a3b8' };
                                    return (
                                        <tr
                                            key={tx.id}
                                            className="border-b border-slate-100 dark:border-slate-800/40 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                                        >
                                            <td className="px-5 py-4">
                                                <span
                                                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold"
                                                    style={{
                                                        background: `${cfg.color}15`,
                                                        color: cfg.color,
                                                        border: `1px solid ${cfg.color}30`
                                                    }}
                                                >
                                                    {cfg.icon} {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
                                                {tx.kioskId || '—'}
                                            </td>
                                            <td className="px-5 py-4 text-sm text-emerald-600 dark:text-emerald-400 font-black">
                                                {fmt(tx.amount)}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                                                    style={{
                                                        color: STATUS_COLOR[tx.status] || '#64748b',
                                                        background: `${STATUS_COLOR[tx.status] || '#64748b'}20`,
                                                        border: `1px solid ${STATUS_COLOR[tx.status] || '#64748b'}30`
                                                    }}
                                                >
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                                {tx.rfidCardId ? `RFID: ${tx.rfidCardId}` :
                                                    tx.userId ? `User: ${tx.userId.slice(-8)}` :
                                                        tx.description || '—'}
                                            </td>
                                            <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-500 font-semibold whitespace-nowrap">
                                                {tx.createdAt ? new Date(tx.createdAt).toLocaleString('ru') : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
