import { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, X } from 'lucide-react';
import { playClick } from '../lib/sound';
import Pagination from '../components/Pagination';

type Card = { id: string; number: string; holder: string; status: string; linkedAt: string };

const initialCards: Card[] = [
  { id: '1', number: '**** 4521', holder: 'Иванов И.', status: 'ACTIVE', linkedAt: '2025-01-15' },
  { id: '2', number: '**** 7832', holder: 'Петров П.', status: 'ACTIVE', linkedAt: '2025-01-20' },
  { id: '3', number: '**** 1098', holder: 'Сидоров С.', status: 'BLOCKED', linkedAt: '2024-12-01' },
];

export default function Rfid() {
  const [list, setList] = useState<Card[]>(initialCards);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ number: '', holder: '', status: 'ACTIVE' });

  const filtered = list.filter(
    (c) =>
      c.number.includes(search) ||
      c.holder.toLowerCase().includes(search.toLowerCase()) ||
      c.status.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const openAdd = () => {
    playClick();
    setForm({ number: '', holder: '', status: 'ACTIVE' });
    setModal(true);
  };

  const closeModal = () => {
    playClick();
    setModal(false);
  };

  const saveCard = () => {
    playClick();
    if (!form.number.trim() || !form.holder.trim()) return;
    const masked = form.number.replace(/\d(?=\d{4})/g, '*').slice(-9);
    setList((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        number: masked,
        holder: form.holder,
        status: form.status,
        linkedAt: new Date().toISOString().slice(0, 10),
      },
    ]);
    closeModal();
  };

  const toggleStatus = (id: string) => {
    playClick();
    setList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: c.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE' } : c))
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CreditCard className="h-7 w-7 text-amber-400" />
          RFID Карты
        </h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 rounded-lg border border-slate-600 bg-slate-800/80 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
          >
            <Plus className="h-4 w-4" />
            Добавить карту
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 shadow-lg shadow-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800/70 bg-gradient-to-r from-slate-900 to-slate-800">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Номер</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Владелец</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Статус</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Привязана</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Нет данных
                  </td>
                </tr>
              ) : (
                paginated.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-800/60 bg-slate-900/40 hover:bg-slate-800/70 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-white">{c.number}</td>
                    <td className="px-4 py-3 text-slate-200">{c.holder}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${c.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{c.linkedAt}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleStatus(c.id)}
                        className="rounded px-2 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/20"
                      >
                        {c.status === 'ACTIVE' ? 'Заблокировать' : 'Разблокировать'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
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

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md my-8 rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6 shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Новая RFID карта</h3>
                <p className="mt-1 text-xs text-slate-400">Привяжите карту к клиенту для быстрой идентификации.</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Номер карты</label>
                <input
                  type="text"
                  value={form.number}
                  onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                  placeholder="1234 5678 9012 3456"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Владелец</label>
                <input
                  type="text"
                  value={form.holder}
                  onChange={(e) => setForm((f) => ({ ...f, holder: e.target.value }))}
                  placeholder="ФИО"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Статус</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="ACTIVE">Активна</option>
                  <option value="BLOCKED">Заблокирована</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 border border-slate-700/80"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={saveCard}
                className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-500 shadow-md shadow-amber-900/40"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
