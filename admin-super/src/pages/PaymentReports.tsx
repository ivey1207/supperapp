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
        <div style={{ padding: '24px' }}>
            {/* Заголовок */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                    💰 Отчёты по оплатам
                </h1>
                <p style={{ color: '#94a3b8', marginTop: '4px', fontSize: '14px' }}>
                    Все виды оплат: купюроприёмник, RFID-карта, онлайн через приложение
                </p>
            </div>

            {/* Summary карточки */}
            {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    {(['CASH', 'RFID', 'ONLINE'] as const).map(type => {
                        const cfg = TYPE_CONFIG[type];
                        const s = summary[type];
                        return (
                            <div
                                key={type}
                                onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
                                style={{
                                    padding: '20px',
                                    borderRadius: '16px',
                                    background: typeFilter === type ? cfg.bg : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${typeFilter === type ? cfg.border : 'rgba(255,255,255,0.08)'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div style={{ fontSize: '28px' }}>{cfg.icon}</div>
                                    {typeFilter === type && (
                                        <span style={{ fontSize: '11px', background: cfg.color + '30', color: cfg.color, padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                                            фильтр
                                        </span>
                                    )}
                                </div>
                                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '4px' }}>{cfg.label}</div>
                                <div style={{ color: cfg.color, fontSize: '22px', fontWeight: 700 }}>{fmt(s.total)}</div>
                                <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>{s.count} транзакций</div>
                            </div>
                        );
                    })}
                    {/* Итого */}
                    <div style={{
                        padding: '20px', borderRadius: '16px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.15)',
                    }}>
                        <div style={{ fontSize: '28px', marginBottom: '12px' }}>📊</div>
                        <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '4px' }}>Всего</div>
                        <div style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700 }}>{fmt(summary.ALL.total)}</div>
                        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>{summary.ALL.count} транзакций</div>
                    </div>
                </div>
            )}

            {/* Фильтры */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {[{ v: '', l: 'Все типы' }, { v: 'CASH', l: '💵 Cash' }, { v: 'RFID', l: '💳 RFID' }, { v: 'ONLINE', l: '📱 Онлайн' }].map(f => (
                        <button
                            key={f.v}
                            onClick={() => setTypeFilter(f.v)}
                            style={{
                                padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                                fontSize: '13px', fontWeight: 600,
                                background: typeFilter === f.v ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                                color: typeFilter === f.v ? '#fff' : '#94a3b8',
                                transition: 'all 0.2s',
                            }}
                        >
                            {f.l}
                        </button>
                    ))}
                </div>
                <input
                    type="date"
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                    style={{
                        padding: '6px 12px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#f1f5f9', fontSize: '13px', cursor: 'pointer',
                    }}
                />
                {(typeFilter || dateFilter) && (
                    <button
                        onClick={() => { setTypeFilter(''); setDateFilter(''); }}
                        style={{ padding: '6px 12px', borderRadius: '10px', border: 'none', background: 'rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
                    >
                        ✕ Сбросить
                    </button>
                )}
            </div>

            {/* Таблица транзакций */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Загрузка...</div>
            ) : transactions.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '60px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
                    <div style={{ color: '#94a3b8', fontSize: '16px' }}>Нет транзакций</div>
                    <div style={{ color: '#475569', fontSize: '13px', marginTop: '8px' }}>
                        Транзакции появятся после первых оплат через кассу, RFID-карту или приложение
                    </div>
                </div>
            ) : (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                {['Тип оплаты', 'Киоск (MAC)', 'Сумма', 'Статус', 'Детали', 'Дата и время'].map(h => (
                                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((tx, i) => {
                                const cfg = TYPE_CONFIG[tx.paymentType] || { label: tx.paymentType, icon: '?', color: '#94a3b8' };
                                return (
                                    <tr
                                        key={tx.id}
                                        style={{
                                            borderBottom: i < transactions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                        }}
                                    >
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                padding: '4px 12px', borderRadius: '20px',
                                                background: cfg.bg || 'rgba(255,255,255,0.08)',
                                                color: cfg.color, fontSize: '12px', fontWeight: 700,
                                                border: `1px solid ${cfg.border || 'transparent'}`,
                                            }}>
                                                {cfg.icon} {cfg.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '13px', fontFamily: 'monospace' }}>
                                            {tx.kioskId || '—'}
                                        </td>
                                        <td style={{ padding: '14px 16px', color: '#22c55e', fontSize: '15px', fontWeight: 700 }}>
                                            {fmt(tx.amount)}
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                                                color: STATUS_COLOR[tx.status] || '#94a3b8',
                                                background: (STATUS_COLOR[tx.status] || '#94a3b8') + '20',
                                            }}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '12px' }}>
                                            {tx.rfidCardId ? `RFID: ${tx.rfidCardId}` :
                                                tx.userId ? `User: ${tx.userId.slice(-8)}` :
                                                    tx.description || '—'}
                                        </td>
                                        <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                            {tx.createdAt ? new Date(tx.createdAt).toLocaleString('ru') : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
