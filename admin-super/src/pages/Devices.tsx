import { useState, useEffect } from 'react';
import { Smartphone, RefreshCw, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import axios from 'axios';
import { getBranches, getOrganizations, getDevices, createDevice, updateDevice, deleteDevice } from '../lib/api';
import { useAuth } from '../lib/auth';
import { playClick } from '../lib/sound';
import Pagination from '../components/Pagination';

type Branch = { id: string; orgId: string; name: string; address: string; phone: string; status: string };
type Org = { id: string; name: string; status: string };
type Device = { id: string; orgId: string; branchId: string; name: string; cashBalance: number; status: string; macId?: string };

export default function Devices() {
  const { isSuperAdmin, user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [form, setForm] = useState({ orgId: '', branchId: '', name: '', cashBalance: 0, status: 'OPEN', macId: '' });

  const load = async () => {
    playClick();
    setLoading(true);
    setError(null);
    try {
      const [deviceList, branchList, organizations] = await Promise.all([
        getDevices(orgId || undefined),
        getBranches(orgId || undefined),
        getOrganizations(),
      ]);
      setDevices(deviceList);
      setBranches(branchList);
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
  }, [orgId]);

  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? id.slice(0, 8);
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id.slice(0, 8);

  const filtered = devices.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      branchName(d.branchId).toLowerCase().includes(search.toLowerCase()) ||
      orgName(d.orgId).toLowerCase().includes(search.toLowerCase()) ||
      d.status.toLowerCase().includes(search.toLowerCase())
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
    const defaultBranchId =
      branches.find((b) => !defaultOrgId || b.orgId === defaultOrgId)?.id || '';
    setForm({ orgId: defaultOrgId, branchId: defaultBranchId, name: '', cashBalance: 0, status: 'OPEN', macId: '' });
    setModal(true);
  };

  const openEdit = (device: Device) => {
    playClick();
    setEditing(device);
    setForm({
      orgId: device.orgId,
      branchId: device.branchId,
      name: device.name,
      cashBalance: device.cashBalance ?? 0,
      status: device.status || 'OPEN',
      macId: device.macId || '',
    });
    setModal(true);
  };

  const closeModal = () => {
    playClick();
    setModal(false);
  };

  const save = async () => {
    playClick();
    if (!form.name.trim() || !form.orgId || !form.branchId) return;
    try {
      if (editing) {
        await updateDevice(editing.id, {
          name: form.name,
          branchId: form.branchId,
          cashBalance: form.cashBalance,
          status: form.status,
          macId: form.macId,
        });
      } else {
        await createDevice({
          orgId: form.orgId,
          branchId: form.branchId,
          name: form.name,
          cashBalance: form.cashBalance,
          status: form.status,
          macId: form.macId,
        });
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
    if (!confirm('Удалить этот девайс? (он будет архивирован)')) return;
    try {
      await deleteDevice(id);
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
          <Smartphone className="h-7 w-7 text-violet-400" />
          {isSuperAdmin ? 'Все девайсы' : 'Девайсы'}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {isSuperAdmin && (
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-800/80 py-2 pl-3 pr-8 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Все компании</option>
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
              className="w-48 rounded-lg border border-slate-600 bg-slate-800/80 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            <Plus className="h-4 w-4" />
            Создать
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-red-300">
          <div className="font-medium">{error}</div>
          {(error.includes('403') || error.includes('запрещён')) && (
            <div className="mt-2 text-sm text-red-200/80">
              Возможно, используется старый токен. Пожалуйста, <strong>выйдите и войдите заново</strong>, чтобы получить новый токен с правильными правами доступа.
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 shadow-lg shadow-slate-900/40 overflow-hidden">
        {loading && devices.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-400">Загрузка...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800/70 bg-gradient-to-r from-slate-900 to-slate-800">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Название / MAC</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Локация</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Компания</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Баланс, сум</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Статус</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Нет данных
                    </td>
                  </tr>
                ) : (
                  paginated.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-slate-800/60 bg-slate-900/40 hover:bg-slate-800/70 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-white">{d.name}</span>
                          {d.macId && <span className="text-[10px] text-violet-400 font-mono">MAC: {d.macId}</span>}
                          <span className="text-[11px] text-slate-500">ID: {d.id.slice(0, 8)}…</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{branchName(d.branchId)}</td>
                      <td className="px-4 py-3 text-slate-400">{orgName(d.orgId)}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {d.cashBalance?.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${d.status === 'OPEN' || d.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : d.status === 'INACTIVE'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-slate-500/20 text-slate-300'
                            }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(d)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-600 hover:text-white"
                          title="Редактировать"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id)}
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
                <h3 className="text-lg font-semibold text-white">
                  {editing ? 'Редактировать девайс' : 'Новый девайс'}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Девайс — это платёжный/информационный терминал.
                </p>
              </div>
              <button type="button" onClick={closeModal} className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {isSuperAdmin && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Компания</label>
                  <select
                    value={form.orgId}
                    onChange={(e) => {
                      const nextOrgId = e.target.value;
                      setForm((f) => ({
                        ...f,
        < Modal
        isOpen = { modal || !!editing}
        onClose={closeModal}
                    title={editing ? 'Редактировать устройство' : 'Новое устройство'}
                    description="Устройство — это контроллер, установленный на филиале (в боксе автомойки или на колонке АЗС)."
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
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Филиал (Локация) *</label>
                        <select
                          value={form.branchId}
                          onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">Выберите филиал</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.address})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Название устройства *</label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Например: Бокс 1"
                          className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Serial Number (MAC) *</label>
                        <input
                          type="text"
                          value={form.serialNumber}
                          onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                          placeholder="AA:BB:CC:DD:EE:FF"
                          className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">IP адрес</label>
                          <input
                            type="text"
                            value={form.ipAddress}
                            onChange={(e) => setForm((f) => ({ ...f, ipAddress: e.target.value }))}
                            placeholder="192.168.1.100"
                            className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Версия прошивки</label>
                          <input
                            type="text"
                            value={form.firmwareVersion}
                            onChange={(e) => setForm((f) => ({ ...f, firmwareVersion: e.target.value }))}
                            placeholder="v1.0.0"
                            className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Статус</label>
                        <select
                          value={form.status}
                          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                        >
                          <option value="ONLINE">ONLINE (В сети)</option>
                          <option value="OFFLINE">OFFLINE (Не в сети)</option>
                          <option value="MAINTENANCE">MAINTENANCE (Обслуживание)</option>
                          <option value="ERROR">ERROR (Ошибка)</option>
                        </select>
                      </div>
                    </div>
                  </Modal>
      )}
                </div>
              );
}
              ```
