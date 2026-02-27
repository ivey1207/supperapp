import { useState, useEffect } from 'react';
import { Building2, Plus, Search, Pencil, Trash2, RefreshCw } from 'lucide-react';
import Modal from '../components/Modal';
import axios from 'axios';
import {
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  uploadFile,
  getFileUrl,
  type Organization,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { playClick } from '../lib/sound';
import Pagination from '../components/Pagination';

export default function Companies() {
  const { isSuperAdmin } = useAuth();
  const [list, setList] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);

  const [form, setForm] = useState({
    name: '',
    inn: '',
    status: 'ACTIVE',
    description: '',
    address: '',
    phone: '',
    email: '',
    workingHours: '',
    rating: 0,
    reviewCount: 0,
    logoUrl: '',
  });

  const load = async () => {
    playClick();
    setLoading(true);
    setError(null);
    try {
      const orgs = await getOrganizations();
      setList(orgs);
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

  const filtered = list.filter((o) => {
    const matchesSearch =
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.status.toLowerCase().includes(search.toLowerCase()) ||
      (o.inn || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.partnerType || '').toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

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
    setForm({
      name: '',
      inn: '',
      status: 'ACTIVE',
      description: '',
      address: '',
      phone: '',
      email: '',
      workingHours: '',
      rating: 0,
      reviewCount: 0,
      logoUrl: '',
    });
    setModal(true);
  };

  const openEdit = (org: Organization) => {
    playClick();
    setEditing(org);
    setForm({
      name: org.name || '',
      inn: org.inn || '',
      status: org.status || 'ACTIVE',
      description: org.description || '',
      address: org.address || '',
      phone: org.phone || '',
      email: org.email || '',
      workingHours: org.workingHours || '',
      rating: org.rating || 0,
      reviewCount: org.reviewCount || 0,
      logoUrl: org.logoUrl || '',
    });
    setModal(true);
  };



  const closeModal = () => {
    playClick();
    setModal(false);
    setEditing(null);
    setForm({
      name: '',
      inn: '',
      status: 'ACTIVE',
      description: '',
      address: '',
      phone: '',
      email: '',
      workingHours: '',
      rating: 0,
      reviewCount: 0,
      logoUrl: '',
    });
  };



  const save = async () => {
    playClick();
    if (!form.name.trim()) return;
    try {
      const payload: any = {
        name: form.name,
        inn: form.inn,
        status: form.status,
        description: form.description,
        address: form.address,
        phone: form.phone,
        email: form.email,
        workingHours: form.workingHours,
        rating: form.rating,
        reviewCount: form.reviewCount,
        logoUrl: form.logoUrl,
      };

      if (editing) {
        await updateOrganization(editing.id, payload);
      } else {
        await createOrganization(payload);
      }
      setModal(false);
      setEditing(null);
      load();
    } catch (e: unknown) {
      console.error(e);
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.message || 'Ошибка сохранения');
      } else {
        setError(e instanceof Error ? e.message : 'Неизвестная ошибка');
      }
    }
  };



  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту организацию? (она будет архивирована)')) return;
    playClick();
    try {
      await deleteOrganization(id);
      load();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg = e.response?.data?.message || 'Ошибка удаления';
        setError(msg);
        alert(msg);
      }
    }
  };





  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Building2 className="h-7 w-7 text-blue-400" />
          {isSuperAdmin ? 'Партнёры (организации)' : 'Моя компания'}
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
          {isSuperAdmin && (
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              Создать
            </button>
          )}
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
          {error.includes('403') || error.includes('запрещён') ? (
            <div className="mt-2 text-sm text-red-200/80">
              Попробуйте выйти и войти заново, чтобы обновить права доступа.
            </div>
          ) : null}
        </div>
      )}

      {modal && isSuperAdmin && (
        <Modal
          isOpen={modal}
          onClose={closeModal}
          title={editing ? 'Редактировать организацию' : 'Новая организация'}
          description='Организация-партнёр: автомойка, АЗС или сервис. Филиалы создаются отдельно через модуль "Филиалы (локации)".'
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
                className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500 shadow-md shadow-violet-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Сохранить
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center overflow-hidden">
                  {form.logoUrl ? (
                    <img src={getFileUrl(form.logoUrl)} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-10 h-10 text-slate-500" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-blue-600 p-1.5 rounded-full cursor-pointer hover:bg-blue-500 transition-colors shadow-lg">
                  <Pencil className="w-3.5 h-3.5 text-white" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const { url } = await uploadFile(file);
                          setForm(f => ({ ...f, logoUrl: url }));
                        } catch (error) {
                          console.error('Upload failed', error);
                          alert('Ошибка загрузки логотипа');
                        }
                      }
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Название <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Название организации"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">ИНН</label>
                <input
                  type="text"
                  value={form.inn}
                  onChange={(e) => setForm((f) => ({ ...f, inn: e.target.value }))}
                  placeholder="123456789"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
                />
              </div>
            </div>



            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Описание</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Описание организации"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Адрес</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Главный офис"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Телефон</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+998..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="corp@example.com"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Режим работы</label>
                <input
                  type="text"
                  value={form.workingHours}
                  onChange={(e) => setForm((f) => ({ ...f, workingHours: e.target.value }))}
                  placeholder="09:00 - 18:00"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Статус</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
              >
                <option value="ACTIVE">ACTIVE (Активен)</option>
                <option value="INACTIVE">INACTIVE (Неактивен)</option>
                <option value="PENDING">PENDING (На проверке)</option>
                <option value="BLOCKED">BLOCKED (Заблокирован)</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 shadow-lg shadow-slate-900/40 overflow-hidden">
        {loading && list.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-400">Загрузка...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700/60 bg-gradient-to-r from-slate-800/80 to-slate-700/80">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-300">Название</th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-300">Адрес</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-300">Телефон</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-300">Рейтинг</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-300">Статус</th>
                  {isSuperAdmin && (
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-300 text-right">
                      Действия
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 7 : 6} className="px-4 py-8 text-center text-slate-400">
                      Нет данных
                    </td>
                  </tr>
                ) : (
                  paginated.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/60 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-white">{o.name}</span>
                          <span className="text-[11px] text-slate-400">ID: {o.id.slice(0, 8)}…</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-200">{o.address || '—'}</td>
                      <td className="px-4 py-3 text-slate-200">{o.phone || '—'}</td>
                      <td className="px-4 py-3">
                        {o.rating ? (
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-400">★</span>
                            <span className="text-sm text-slate-200">
                              {o.rating.toFixed(1)} ({o.reviewCount || 0})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${o.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-500/20 text-slate-200'
                            }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3 flex items-center justify-end gap-1.5">

                          <button
                            type="button"
                            onClick={() => openEdit(o)}
                            className="rounded p-1.5 text-slate-300 hover:bg-slate-600 hover:text-white"
                            title="Редактировать"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(o.id)}
                            className="rounded p-1.5 text-slate-300 hover:bg-red-500/20 hover:text-red-400"
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
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
