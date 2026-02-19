import { useState, useEffect } from 'react';
import { MapPin, Plus, Search, Pencil, Trash2, RefreshCw } from 'lucide-react';
import Modal from '../components/Modal';
import axios from 'axios';
import { getBranches, getOrganizations, createBranch, updateBranch, deleteBranch, type Organization } from '../lib/api';
import { useAuth } from '../lib/auth';
import { playClick } from '../lib/sound';
import Pagination from '../components/Pagination';

type Branch = {
  id: string;
  orgId: string;
  name: string;
  address: string;
  phone: string;
  status: string;
  partnerType?: string;
  boxCount?: number;
};

export default function Branches() {
  const { isSuperAdmin, user } = useAuth();
  const [list, setList] = useState<Branch[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState({
    orgId: '',
    name: '',
    address: '',
    phone: '',
    status: 'OPEN',
    partnerType: '',
    boxCount: 0,
  });

  const load = async () => {
    playClick();
    setLoading(true);
    setError(null);
    try {
      const [branches, organizations] = await Promise.all([
        getBranches(orgId || undefined),
        isSuperAdmin ? getOrganizations() : Promise.resolve([]),
      ]);
      setList(branches);
      setOrgs(organizations);
      if (!isSuperAdmin && user?.orgId) {
        setOrgId(user.orgId);
        setForm((f) => ({ ...f, orgId: user.orgId || '' }));
      }
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
  }, [orgId]);

  const filtered = list.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.address.toLowerCase().includes(search.toLowerCase()) ||
      b.phone.toLowerCase().includes(search.toLowerCase()) ||
      b.status.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const openAdd = () => {
    playClick();
    setEditing(null);
    const defaultOrgId = isSuperAdmin ? (orgs[0]?.id || '') : (user?.orgId || '');
    setForm({
      orgId: defaultOrgId,
      name: '',
      address: '',
      phone: '',
      status: 'OPEN',
      partnerType: '',
      boxCount: 0,
    });
    setModal(true);
  };

  const openEdit = (branch: Branch) => {
    playClick();
    setEditing(branch);
    setForm({
      orgId: branch.orgId,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      status: branch.status,
      partnerType: branch.partnerType || '',
      boxCount: 0,
    });
    setModal(true);
  };

  const closeModal = () => {
    playClick();
    setModal(false);
    setEditing(null);
  };

  const save = async () => {
    playClick();
    if (!form.name.trim() || !form.orgId) return;
    try {
      if (editing) {
        // Warning: updateBranch might not support partnerType yet in frontend api.ts, need to check
        await updateBranch(editing.id, form.name, form.address, form.phone, form.status, form.partnerType);
      } else {
        await createBranch(form.orgId, form.name, form.address, form.phone, form.status, form.partnerType, form.boxCount);
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
    if (!confirm('Удалить этот филиал? (он будет архивирован)')) return;
    try {
      await deleteBranch(id);
      load();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.message || 'Ошибка удаления');
      }
    }
  };

  const orgName = (id?: string) => {
    if (!id) return '—';
    return orgs.find((o) => o.id === id)?.name ?? id.slice(0, 8);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MapPin className="h-7 w-7 text-blue-400" />
          {isSuperAdmin ? 'Филиалы (локации)' : 'Мои филиалы'}
        </h1>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-800/80 py-2 pl-3 pr-8 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Все организации</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 rounded-lg border border-slate-600 bg-slate-800/80 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Создать филиал
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-red-300">
          <div className="font-medium">{error}</div>
        </div>
      )}

      <Modal
        isOpen={modal || !!editing}
        onClose={closeModal}
        title={editing ? 'Редактировать филиал' : 'Новый филиал'}
        description="Филиал (локация) — это отдельное место организации, где могут быть киоски и услуги."
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
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Сохранить
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {isSuperAdmin && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Организация *</label>
              <select
                value={form.orgId}
                onChange={(e) => setForm((f) => ({ ...f, orgId: e.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Выберите организацию</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Название филиала *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Название филиала"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Адрес</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Адрес филиала"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Телефон</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+998901234567"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Статус</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="OPEN">Открыт</option>
              <option value="CLOSED">Закрыт</option>
              <option value="MAINTENANCE">На обслуживании</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Тип филиала</label>
            <select
              value={form.partnerType}
              onChange={(e) => setForm((f) => ({ ...f, partnerType: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Не выбрано</option>
              <option value="CAR_WASH">Автомойка</option>
              <option value="GAS_STATION">АЗС</option>
              <option value="SERVICE">Сервис</option>
            </select>
          </div>
          {form.partnerType === 'CAR_WASH' && !editing && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Количество боксов</label>
              <input
                type="number"
                min="0"
                max="50"
                value={form.boxCount || ''}
                onChange={(e) => setForm((f) => ({ ...f, boxCount: Number.parseInt(e.target.value) || 0 }))}
                placeholder="Например: 4"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">
                Автоматически создаст указанное количество устройств
              </p>
            </div>
          )}
        </div>
      </Modal>

      <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 shadow-lg shadow-slate-900/40 overflow-hidden">
        {loading && list.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-400">Загрузка...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800/70 bg-gradient-to-r from-slate-900 to-slate-800">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Название</th>
                  {isSuperAdmin && (
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Организация</th>
                  )}
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Адрес</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Телефон</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Статус</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 text-right">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 6 : 5} className="px-4 py-8 text-center text-slate-400">
                      Нет данных
                    </td>
                  </tr>
                ) : (
                  paginated.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-slate-800/60 bg-slate-900/40 hover:bg-slate-800/70 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-white">{b.name}</span>
                          <span className="text-[11px] text-slate-500">ID: {(b.id || '').slice(0, 8)}…</span>
                        </div>
                      </td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3 text-sm text-slate-300">
                          <span className="inline-flex rounded-full bg-slate-800/80 px-2 py-0.5 text-xs text-slate-200">
                            {orgName(b.orgId)}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-slate-300">{b.address || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{b.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${b.status === 'OPEN'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : b.status === 'CLOSED'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                        >
                          {b.status === 'OPEN' ? 'Открыт' : b.status === 'CLOSED' ? 'Закрыт' : 'Обслуживание'}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(b)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-600 hover:text-white"
                          title="Редактировать"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(b.id)}
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
    </div >
  );
}
