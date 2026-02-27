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
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                        🚿 Сеансы мойки
                    </h1>
                    <p style={{ color: '#94a3b8', marginTop: '4px', fontSize: '14px' }}>
                        Мониторинг активных сеансов в реальном времени (обновление каждые 5 сек)
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: '#22c55e',
                        boxShadow: '0 0 8px #22c55e',
                        animation: 'pulse 2s infinite'
                    }} />
                    <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>
                        {activeSessions.length} активных
                    </span>
                </div>
            </div>

            {/* Status filter */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {['ACTIVE', 'PAUSED', 'FINISHED', 'FAILED', ''].map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '20px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                            background: statusFilter === s ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                            color: statusFilter === s ? '#fff' : '#94a3b8',
                            transition: 'all 0.2s',
                        }}
                    >
                        {s ? STATUS_LABELS[s] : 'Все'}
                    </button>
                ))}
            </div>

            {/* Error */}
            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', color: '#ef4444', marginBottom: '16px' }}>
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>Загрузка...</div>
            )}

            {/* Empty */}
            {!loading && sessions.length === 0 && (
                <div style={{
                    textAlign: 'center', padding: '60px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚿</div>
                    <div style={{ color: '#94a3b8', fontSize: '16px' }}>Нет сеансов</div>
                    <div style={{ color: '#475569', fontSize: '13px', marginTop: '8px' }}>
                        Сеансы появятся, когда пользователи отсканируют QR-код и оплатят мойку
                    </div>
                </div>
            )}

            {/* Sessions grid */}
            {!loading && sessions.length > 0 && (
                <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
                    {sessions.map(session => {
                        const color = STATUS_COLORS[session.status] || '#94a3b8';
                        const isActive = session.status === 'ACTIVE' || session.status === 'PAUSED';
                        return (
                            <div
                                key={session.id}
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${isActive ? color + '40' : 'rgba(255,255,255,0.08)'}`,
                                    borderRadius: '16px',
                                    padding: '20px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Status indicator */}
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0,
                                    height: '3px',
                                    background: color,
                                    opacity: 0.8,
                                }} />

                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            📦 {session.kioskId}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                            ID: {session.id.slice(-8)}
                                        </div>
                                    </div>
                                    <span style={{
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        background: color + '20',
                                        color: color,
                                        border: `1px solid ${color}40`,
                                    }}>
                                        {STATUS_LABELS[session.status] || session.status}
                                    </span>
                                </div>

                                {/* Info */}
                                <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
                                    <InfoRow icon="💰" label="Оплата" value={`${(session.paidAmount || 0).toLocaleString()} сум`} color="#22c55e" />
                                    {session.startedAt && (
                                        <InfoRow
                                            icon="⏱"
                                            label="Длительность"
                                            value={isActive ? formatDuration(session.startedAt) : new Date(session.startedAt).toLocaleTimeString('ru')}
                                            color="#f59e0b"
                                        />
                                    )}
                                    {session.userId && (
                                        <InfoRow icon="👤" label="Пользователь" value={session.userId.slice(-12)} color="#94a3b8" />
                                    )}
                                    {session.startedAt && (
                                        <InfoRow
                                            icon="🕐"
                                            label="Начало"
                                            value={new Date(session.startedAt).toLocaleString('ru')}
                                            color="#64748b"
                                        />
                                    )}
                                    {session.finishReason && (
                                        <InfoRow icon="📋" label="Причина" value={session.finishReason} color="#ef4444" />
                                    )}
                                </div>

                                {/* Actions */}
                                {isActive && (
                                    <button
                                        onClick={() => handleStop(session.id)}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(239,68,68,0.3)',
                                            background: 'rgba(239,68,68,0.1)',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                                    >
                                        ⏹ Остановить сеанс
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
        </div>
    );
}

function InfoRow({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>{icon} {label}</span>
            <span style={{ color, fontSize: '13px', fontWeight: 600 }}>{value}</span>
        </div>
    );
}
