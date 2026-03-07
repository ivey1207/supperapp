import { useState, useEffect } from 'react';
import { Users as UsersIcon, RefreshCw, Search, ShieldAlert, ShieldCheck, Wrench, User } from 'lucide-react';
import axios from 'axios';
import { getAppUsers, toggleBlockAppUser, toggleSpecialistAppUser, type AppUser } from '../lib/api';
import { playClick } from '../lib/sound';
import Pagination from '../components/Pagination';

export default function AppUsers() {
    const [list, setList] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const load = async () => {
        playClick();
        setLoading(true);
        setError(null);
        try {
            const data = await getAppUsers();
            setList(data);
        } catch (e: unknown) {
            if (axios.isAxiosError(e)) {
                setError(e.response?.data?.message || e.message);
            } else {
                setError(e instanceof Error ? e.message : 'Ошибка загрузки');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleToggleBlock = async (id: string, currentStatus: boolean) => {
        playClick();
        const action = currentStatus ? 'разблокировать' : 'заблокировать';
        if (!confirm(`Вы действительно хотите ${action} этого пользователя?`)) return;

        try {
            await toggleBlockAppUser(id);
            setList(prev => prev.map(u => u.id === id ? { ...u, blocked: !currentStatus } : u));
        } catch (err) {
            console.error(err);
            alert('Ошибка при смене статуса');
        }
    };

    const handleToggleSpecialist = async (id: string, currentStatus: boolean) => {
        playClick();
        const action = currentStatus ? 'снять роль специалиста с' : 'сделать специалистом (мойщиком)';
        if (!confirm(`Вы действительно хотите ${action} этого пользователя?`)) return;

        try {
            await toggleSpecialistAppUser(id);
            setList(prev => prev.map(u => u.id === id ? { ...u, isSpecialist: !currentStatus } : u));
        } catch (err) {
            console.error(err);
            alert('Ошибка при смене роли специалиста');
        }
    };

    const filtered = list.filter(
        (u) =>
            u.phone.toLowerCase().includes(search.toLowerCase()) ||
            (u.fullName && u.fullName.toLowerCase().includes(search.toLowerCase())) ||
            (u.carNumber && u.carNumber.toLowerCase().includes(search.toLowerCase()))
    );

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <UsersIcon className="h-7 w-7 text-amber-500 dark:text-amber-400" />
                    Пользователи мобильного приложения
                </h1>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                        <input
                            type="text"
                            placeholder="Поиск по телефону, имени, авто..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-64 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={load}
                        disabled={loading}
                        className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Обновить
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-red-300">
                    {error}
                </div>
            )}

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm dark:shadow-none overflow-hidden">
                {loading && list.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">Загрузка...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Телефон</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Имя</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Автомобиль</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Роль</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 text-right">Статус/Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                                            Пользователи не найдены
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((u) => (
                                        <tr
                                            key={u.id}
                                            className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <span className="font-medium text-slate-900 dark:text-white">{u.phone}</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-200">{u.fullName || '—'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                                                {u.carModel && u.carNumber ? `${u.carModel} (${u.carNumber})` : u.carModel || u.carNumber || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {u.isSpecialist ? (
                                                    <span className="inline-flex rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-500">
                                                        Специалист
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex rounded-full bg-slate-500/20 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                                                        Клиент
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleSpecialist(u.id, u.isSpecialist)}
                                                    className={`rounded p-1.5 transition-colors ${u.isSpecialist
                                                        ? 'text-amber-500 hover:bg-amber-500/10'
                                                        : 'text-slate-400 hover:bg-slate-500/10'}`}
                                                    title={u.isSpecialist ? 'Снять роль специалиста' : 'Сделать специалистом'}
                                                >
                                                    {u.isSpecialist ? <Wrench className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                                </button>

                                                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleBlock(u.id, u.blocked)}
                                                    className={`rounded p-1.5 transition-colors ${u.blocked
                                                        ? 'text-emerald-500 hover:bg-emerald-500/10'
                                                        : 'text-red-500 hover:bg-red-500/10'}`}
                                                    title={u.blocked ? 'Разблокировать' : 'Заблокировать'}
                                                >
                                                    {u.blocked ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                {!loading && filtered.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        totalItems={filtered.length}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={(size) => {
                            setPageSize(size);
                            setCurrentPage(1);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
