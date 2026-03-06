import { useState, useEffect } from 'react';
import { Star, RefreshCw, Search, Trash2, MessageSquare } from 'lucide-react';
import axios from 'axios';
import { getReviews, deleteReview, type ReviewAdmin } from '../lib/api';
import { playClick } from '../lib/sound';
import Pagination from '../components/Pagination';

export default function Reviews() {
    const [list, setList] = useState<ReviewAdmin[]>([]);
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
            const data = await getReviews();
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

    const handleDelete = async (id: string) => {
        playClick();
        if (!confirm('Вы действительно хотите удалить этот отзыв?')) return;

        try {
            await deleteReview(id);
            setList(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            console.error(err);
            alert('Ошибка при удалении отзыва');
        }
    };

    const filtered = list.filter(
        (r) =>
            r.userName.toLowerCase().includes(search.toLowerCase()) ||
            r.branchName.toLowerCase().includes(search.toLowerCase()) ||
            (r.comment && r.comment.toLowerCase().includes(search.toLowerCase()))
    );

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="h-7 w-7 text-indigo-500 dark:text-indigo-400" />
                    Отзывы и оценки
                </h1>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                        <input
                            type="text"
                            placeholder="Поиск по пользователю, филиалу, комментарию..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-80 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={load}
                        disabled={loading}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
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
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Пользователь</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Филиал</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Оценка</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Комментарий</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Дата</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                            Отзывы не найдены
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((r) => (
                                        <tr
                                            key={r.id}
                                            className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <span className="font-medium text-slate-900 dark:text-white">{r.userName}</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-200">{r.branchName}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{r.rating}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
                                                {r.comment || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                                                {new Date(r.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(r.id)}
                                                    className="rounded p-1.5 text-red-500 hover:bg-red-500/10 transition-colors"
                                                    title="Удалить отзыв"
                                                >
                                                    <Trash2 className="h-5 w-5" />
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
