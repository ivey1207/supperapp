import { useState, useEffect } from 'react';
import { Users as UsersIcon, RefreshCw, Search, Plus, Pencil, Trash2, X } from 'lucide-react';
import axios from 'axios';
import { getAccounts, createAccount, updateAccount, deleteAccount, getOrganizations } from '../lib/api';
import { useAuth } from '../lib/auth';
import { playClick } from '../lib/sound';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';

type Account = { id: string; email: string; fullName: string; role: string; orgId: string };

export default function Users() {
  const { isSuperAdmin, user } = useAuth();
  const [list, setList] = useState<Account[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; name: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'MANAGER', orgId: '' });

  const load = async () => {
    playClick();
    setLoading(true);
    setError(null);
    try {
      const [accounts, organizations] = await Promise.all([
        getAccounts(),
        isSuperAdmin ? getOrganizations() : Promise.resolve([]),
      ]);
      setList(accounts);
      setOrgs(organizations);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;
        const message = e.response?.data?.message || e.message;
        if (status === 403) {
          setError('Доступ запрещён. Проверьте права доступа.');
        } else if (status === 401) {
          setError('Сессия истекла. Перезайдите.');
        } else {
          setError(message || 'Ошибка загрузки данных');
        }
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

  const filtered = list.filter(
    (a) =>
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      (a.fullName && a.fullName.toLowerCase().includes(search.toLowerCase())) ||
      a.role.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      SUPER_ADMIN: 'bg-amber-500/20 text-amber-400',
      PARTNER_ADMIN: 'bg-violet-500/20 text-violet-400',
      MANAGER: 'bg-blue-500/20 text-blue-400',
    };
    return styles[role] || 'bg-slate-500/20 text-slate-300';
  };

  const openAdd = () => {
    playClick();
    setEditing(null);
    const defaultOrgId = isSuperAdmin ? (orgs[0]?.id || '') : (user?.orgId || '');
    setForm({ email: '', password: '', fullName: '', role: 'MANAGER', orgId: defaultOrgId });
    setModal(true);
  };

  const openEdit = (acc: Account) => {
    playClick();
    setEditing(acc);
    setForm({ email: acc.email, password: '', fullName: acc.fullName || '', role: acc.role, orgId: acc.orgId || '' });
    setModal(true);
  };

  const closeModal = () => {
    playClick();
    setModal(false);
  };

  const save = async () => {
    playClick();
    if (!form.email.trim() || (!editing && !form.password.trim())) return;
    try {
      if (editing) {
        await updateAccount(editing.id, form.fullName, form.role, form.password || undefined);
      } else {
        await createAccount(form.email, form.password, form.fullName, form.role, form.orgId);
      }
      closeModal();
      load();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.message || 'Ошибка сохранения');
      }
    }
  };

  const handleDelete = async (id: string) => {
    playClick();
    if (!confirm('Удалить этого пользователя? (он будет архивирован)')) return;
    try {
      await deleteAccount(id);
      load();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.message || 'Ошибка удаления');
      }
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <UsersIcon className="h-7 w-7 text-cyan-400" />
          {isSuperAdmin ? 'Администраторы' : 'Пользователи'}
        </h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по email, имени, роли..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-lg border border-slate-600 bg-slate-800/80 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
          >
            <Plus className="h-4 w-4" />
            Создать
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
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

      <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 shadow-lg shadow-slate-900/40 overflow-hidden">
        {loading && list.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-400">Загрузка...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800/70 bg-gradient-to-r from-slate-900 to-slate-800">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Email</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Имя</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Роль</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Org ID</th>
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
                  paginated.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-slate-800/60 bg-slate-900/40 hover:bg-slate-800/70 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-white">{a.email}</span>
                          <span className="text-[11px] text-slate-500">
                            {a.fullName || 'Без имени'} · ID {a.id.slice(0, 8)}…
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-200">{a.fullName || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge(a.role)}`}>
                          {a.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400 font-mono">{a.orgId ? `${a.orgId.slice(0, 8)}…` : '—'}</td>
                      <td className="px-4 py-3 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-600 hover:text-white"
                          title="Редактировать"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(a.id)}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
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

      <Modal
        isOpen={modal}
        onClose={closeModal}
        title={editing ? 'Редактировать пользователя' : 'Новый пользователь'}
        description="Управление доступом в админку для партнёров и менеджеров."
        footer={
          <>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 border border-slate-700/80 transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-500 shadow-md shadow-cyan-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Сохранить
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="email@example.com"
              disabled={!!editing}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none disabled:opacity-50"
            />
          </div>
          {!editing && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Пароль</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Пароль"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          )}
          {editing && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Новый пароль (оставьте пустым, чтобы не менять)</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Оставьте пустым"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Имя</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="Полное имя"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          {isSuperAdmin && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Компания</label>
                <select
                  value={form.orgId}
                  onChange={(e) => setForm((f) => ({ ...f, orgId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
                >
                  <option value="">Без компании</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Роль</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
                >
                  <option value="MANAGER">MANAGER</option>
                  <option value="PARTNER_ADMIN">PARTNER_ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
