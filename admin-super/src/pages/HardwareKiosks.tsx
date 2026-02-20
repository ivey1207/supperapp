import { useState, useEffect } from 'react';
import { RefreshCw, Search, Pencil, Trash2, Link2, Unlink, Cpu } from 'lucide-react';
import Modal from '../components/Modal';
import axios from 'axios';
import {
  getHardwareKiosks,
  assignHardwareKiosk,
  unassignHardwareKiosk,
  updateHardwareKiosk,
  deleteHardwareKiosk,
  getOrganizations,
  getBranches,
  type HardwareKiosk,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { playClick } from '../lib/sound';
import Pagination from '../components/Pagination';

export default function HardwareKiosks() {
  const { isSuperAdmin } = useAuth();
  const [list, setList] = useState<HardwareKiosk[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string; orgId: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [orgFilter, setOrgFilter] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modal, setModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [editing, setEditing] = useState<HardwareKiosk | null>(null);
  const [assigning, setAssigning] = useState<HardwareKiosk | null>(null);
  const [form, setForm] = useState({ name: '', status: '', orgId: '', branchId: '' });
  const [assignForm, setAssignForm] = useState({ orgId: '', branchId: '' });

  const load = async () => {
    playClick();
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (orgFilter) params.orgId = orgFilter;
      if (branchFilter) params.branchId = branchFilter;
      const [kiosks, organizations] = await Promise.all([
        getHardwareKiosks(params),
        getOrganizations(),
      ]);
      setList(kiosks);
      setOrgs(organizations);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;
        const message = e.response?.data?.message || e.message;
        if (status === 403) {
          setError('Доступ запрещён. Только Super Admin может управлять hardware киосками.');
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
    if (isSuperAdmin) {
      load();
    } else {
      setError('Доступ запрещён. Только Super Admin может управлять hardware киосками.');
    }
  }, [statusFilter, orgFilter, branchFilter]);

  useEffect(() => {
    if (orgFilter) {
      loadBranches(orgFilter);
    } else {
      setBranches([]);
      setBranchFilter('');
    }
  }, [orgFilter]);

  const loadBranches = async (orgId: string) => {
    try {
      const data = await getBranches(orgId);
      setBranches(data);
    } catch (e) {
      console.error('Failed to load branches', e);
    }
  };

  const filtered = list.filter(
    (k) =>
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.macId.toLowerCase().includes(search.toLowerCase()) ||
      (orgName(k.orgId) || '').toLowerCase().includes(search.toLowerCase()) ||
      (branchName(k.branchId) || '').toLowerCase().includes(search.toLowerCase()) ||
      k.status.toLowerCase().includes(search.toLowerCase())
  ).filter((k) => {
    if (assignmentFilter === 'assigned') return !!k.orgId;
    if (assignmentFilter === 'unassigned') return !k.orgId;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const openEdit = (kiosk: HardwareKiosk) => {
    playClick();
    setEditing(kiosk);
    setForm({
      name: kiosk.name,
      status: kiosk.status,
      orgId: kiosk.orgId || '',
      branchId: kiosk.branchId || '',
    });
    if (kiosk.orgId) {
      loadBranches(kiosk.orgId);
    }
    setModal(true);
  };

  const openAssign = (kiosk: HardwareKiosk) => {
    playClick();
    setAssigning(kiosk);
    setAssignForm({ orgId: kiosk.orgId || '', branchId: kiosk.branchId || '' });
    if (kiosk.orgId) {
      loadBranches(kiosk.orgId);
    }
    setAssignModal(true);
  };

  const closeModal = () => {
    playClick();
    setModal(false);
    setEditing(null);
  };

  const closeAssignModal = () => {
    playClick();
    setAssignModal(false);
    setAssigning(null);
    setAssignForm({ orgId: '', branchId: '' });
    setBranches([]);
  };

  const save = async () => {
    if (!editing) return;
    playClick();
    try {
      await updateHardwareKiosk(editing.id, {
        name: form.name,
        status: form.status,
        orgId: form.orgId || null,
        branchId: form.branchId || null,
      });
      closeModal();
      load();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.message || 'Ошибка сохранения');
      }
    }
  };

  const handleAssign = async () => {
    if (!assigning) return;
    playClick();
    try {
      if (assignForm.orgId) {
        await assignHardwareKiosk(assigning.id, {
          orgId: assignForm.orgId,
          branchId: assignForm.branchId || undefined,
        });
      } else {
        await unassignHardwareKiosk(assigning.id);
      }
      closeAssignModal();
      load();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.message || 'Ошибка привязки');
      }
    }
  };

  const handleUnassign = async (id: string) => {
    playClick();
    if (!confirm('Отвязать этот hardware киоск от организации?')) return;
    try {
      await unassignHardwareKiosk(id);
      load();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.message || 'Ошибка отвязки');
      }
    }
  };

  const handleDelete = async (id: string) => {
    playClick();
    if (!confirm('Удалить этот hardware киоск? (он будет архивирован)')) return;
    try {
      await deleteHardwareKiosk(id);
      load();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.message || 'Ошибка удаления');
      }
    }
  };

  const orgName = (id: string | null) => orgs.find((o) => o.id === id)?.name ?? '';
  const branchName = (id: string | null) => branches.find((b) => b.id === id)?.name ?? '';

  const statusLabel = (status: string) => {
    switch (status) {
      case 'REGISTERED':
        return 'Зарегистрирован';
      case 'ACTIVE':
        return 'Активен';
      case 'INACTIVE':
        return 'Неактивен';
      default:
        return status;
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-red-300">
          Доступ запрещён. Только Super Admin может управлять hardware киосками.
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Cpu className="h-7 w-7 text-blue-400" />
          Hardware Киоски
        </h1>
        <div className="flex items-center gap-3">
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
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">Все компании</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            disabled={!orgFilter}
            className="rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none disabled:opacity-50"
          >
            <option value="">Все филиалы</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">Все статусы</option>
            <option value="REGISTERED">Зарегистрирован</option>
            <option value="ACTIVE">Активен</option>
            <option value="INACTIVE">Неактивен</option>
          </select>
          <select
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Все устройства</option>
            <option value="assigned">Привязанные</option>
            <option value="unassigned">Не привязанные</option>
          </select>
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

      <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 shadow-lg shadow-slate-900/40 overflow-hidden">
        {loading && list.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-400">Загрузка...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800/70 bg-gradient-to-r from-slate-900 to-slate-800">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Название</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">MAC ID</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Организация</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Филиал</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Баланс</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Статус</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Последний heartbeat</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 text-right">
                    Действия
                  </th>
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
                  paginated.map((k) => (
                    <tr
                      key={k.id}
                      className="border-b border-slate-800/60 bg-slate-900/40 hover:bg-slate-800/70 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-white">{k.name}</span>
                          <span className="text-[11px] text-slate-500">ID: {k.id.slice(0, 8)}…</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono">{k.macId}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{orgName(k.orgId)}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{branchName(k.branchId)}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {((k as any).cashBalance || 0).toLocaleString('ru-RU')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${k.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : k.status === 'REGISTERED'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-slate-500/20 text-slate-300'
                            }`}
                        >
                          {statusLabel(k.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {k.lastHeartbeat
                          ? new Date(k.lastHeartbeat).toLocaleString('ru-RU')
                          : 'Никогда'}
                      </td>
                      <td className="px-4 py-3 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openAssign(k)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-600 hover:text-white"
                          title={k.orgId ? 'Изменить привязку' : 'Привязать'}
                        >
                          {k.orgId ? <Link2 className="h-4 w-4" /> : <Unlink className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(k)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-600 hover:text-white"
                          title="Редактировать"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {k.orgId && (
                          <button
                            type="button"
                            onClick={() => handleUnassign(k.id)}
                            className="rounded p-1.5 text-slate-400 hover:bg-orange-500/20 hover:text-orange-400"
                            title="Отвязать"
                          >
                            <Unlink className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(k.id)}
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
        isOpen={modal && !!editing}
        onClose={closeModal}
        title="Редактировать hardware киоск"
        description={`MAC ID: ${editing?.macId}`}
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
            <label className="block text-sm font-medium text-slate-300 mb-1">Название</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Название киоска"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Статус</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="REGISTERED">Зарегистрирован</option>
              <option value="ACTIVE">Активен</option>
              <option value="INACTIVE">Неактивен</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Организация</label>
            <select
              value={form.orgId}
              onChange={(e) => {
                const newOrgId = e.target.value;
                setForm({ ...form, orgId: newOrgId, branchId: '' });
                if (newOrgId) {
                  loadBranches(newOrgId);
                } else {
                  setBranches([]);
                }
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Не привязан</option>
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          {form.orgId && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Филиал (необязательно)</label>
              <select
                value={form.branchId}
                onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Не указан</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={assignModal && !!assigning}
        onClose={closeAssignModal}
        title={assigning?.orgId ? 'Изменить привязку' : 'Привязать hardware киоск'}
        description={`${assigning?.name} (MAC: ${assigning?.macId})`}
        footer={
          <>
            <button
              type="button"
              onClick={closeAssignModal}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 border border-slate-700/80 transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleAssign}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {assigning?.orgId ? 'Изменить' : 'Привязать'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Организация</label>
            <select
              value={assignForm.orgId}
              onChange={(e) => {
                setAssignForm({ orgId: e.target.value, branchId: '' });
                if (e.target.value) {
                  loadBranches(e.target.value);
                } else {
                  setBranches([]);
                }
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Не привязан</option>
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          {assignForm.orgId && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Филиал (необязательно)</label>
              <select
                value={assignForm.branchId}
                onChange={(e) => setAssignForm((f) => ({ ...f, branchId: e.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Не указан</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
