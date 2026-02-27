import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Plus, Pencil, Trash2, GitBranch, Building2 } from 'lucide-react';
import { getServices, createService, updateService, deleteService, getOrganizations, getBranches, type Service, type Organization } from '../lib/api';
import { useAuth } from '../lib/auth';
import { playClick } from '../lib/sound';
import Pagination from '../components/Pagination';

export default function Services() {
  const { isSuperAdmin, user } = useAuth();
  const [list, setList] = useState<Service[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [filterBranches, setFilterBranches] = useState<{ id: string; name: string }[]>([]);
  const [orgId, setOrgId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({
    orgId: '',
    branchId: '',
    name: '',
    description: '',
    category: '',
    pricePerMinute: 0,
    durationMinutes: 0,
    bookable: false,
    bookingIntervalMinutes: 30,
    workingHours: '',
    command: '',
    relayBits: '',
    motorFrequency: 0,
    pump1Power: 0,
    pump2Power: 0,
    pump3Power: 0,
    pump4Power: 0,
    motorFlag: '',
    active: true,
  });

  const SERVICE_TEMPLATES = [
    { id: 'water', name: 'Вода', price: 2500, command: 'Hi WATER_ON', relayBits: '10000000', motorFreq: 40, flag: 'F', category: 'Основные' },
    { id: 'turbo_water', name: 'Турбо-вода', price: 2600, command: 'TURBO_WATER_ON', relayBits: '10000000', motorFreq: 47, flag: 'F', category: 'Основные' },
    { id: 'chemistry', name: 'Активная химия', price: 5000, command: 'CHEMISTRY_ON', relayBits: '00100000', motorFreq: 28, pump3: 13, flag: 'F', category: 'Химия' },
    { id: 'shampoo', name: 'Нано-шампунь', price: 5300, command: 'SHAMPOO_ON', relayBits: '00010000', motorFreq: 28, pump2: 15, flag: 'F', category: 'Химия' },
    { id: 'wax', name: 'Воск', price: 5000, command: 'WAX_ON', relayBits: '01000000', category: 'Защита' },
    { id: 'osmosis', name: 'Осмос', price: 2750, command: 'OSMOSIS_ON', relayBits: '10000000', category: 'Ополаскивание' },
    { id: 'warm_water', name: 'Мойка порогов', price: 2300, command: 'WARM_WATER_ON', relayBits: '10000000', category: 'Дополнительно' },
    { id: 'foam', name: 'Пена', price: 5000, command: 'FOAM_ON', relayBits: '00100000', category: 'Химия' },
  ];

  const applyTemplate = (t: any) => {
    setForm(prev => ({
      ...prev,
      name: t.name,
      pricePerMinute: t.price,
      command: t.command,
      relayBits: t.relayBits,
      motorFrequency: t.motorFreq || 0,
      motorFlag: t.flag || '',
      category: t.category || '',
      pump1Power: 0,
      pump2Power: t.pump2 || 0,
      pump3Power: t.pump3 || 0,
      pump4Power: 0,
    }));
  };

  const load = async () => {
    // playClick();
    // setLoading(true);
    // setError(null);
    try {
      const [services, organizations] = await Promise.all([
        getServices(orgId || undefined, branchId || undefined),
        isSuperAdmin ? getOrganizations() : Promise.resolve([]),
      ]);
      setList(services);
      setOrgs(organizations);

      if (!isSuperAdmin && user?.orgId) {
        setOrgId(user.orgId);
        const b = await getBranches(user.orgId);
        setFilterBranches(b);
      } else if (orgId) {
        const b = await getBranches(orgId);
        setFilterBranches(b);
      } else {
        setFilterBranches([]);
      }
    } catch (e) {
      console.error(e);
      // setError(e.response?.data?.message || e.message || 'Ошибка загрузки');
    } finally {
      // setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orgId, branchId, isSuperAdmin, user?.orgId]);

  const handleOrgChange = async (newOrgId: string) => {
    setOrgId(newOrgId);
    setBranchId('');
  };

  const openAdd = async () => {
    playClick();
    setEditing(null);
    const defaultOrgId = isSuperAdmin ? (orgId || '') : (user?.orgId || '');
    setForm({
      orgId: defaultOrgId,
      branchId: branchId || '',
      name: '',
      description: '',
      category: '',
      pricePerMinute: 0,
      durationMinutes: 0,
      bookable: false,
      bookingIntervalMinutes: 30,
      workingHours: '',
      command: '',
      relayBits: '',
      motorFrequency: 0,
      pump1Power: 0,
      pump2Power: 0,
      pump3Power: 0,
      pump4Power: 0,
      motorFlag: '',
      active: true,
    });
    if (defaultOrgId) {
      const b = await getBranches(defaultOrgId);
      setBranches(b);
    }
    setModal(true);
  };

  const openEdit = async (s: Service) => {
    playClick();
    setEditing(s);
    setForm({
      orgId: s.orgId,
      branchId: s.branchId || '',
      name: s.name,
      description: s.description || '',
      category: s.category || '',
      pricePerMinute: s.pricePerMinute,
      durationMinutes: s.durationMinutes || 0,
      bookable: s.bookable || false,
      bookingIntervalMinutes: s.bookingIntervalMinutes || 30,
      workingHours: s.workingHours || '',
      command: s.command || '',
      relayBits: s.relayBits || '',
      motorFrequency: s.motorFrequency || 0,
      pump1Power: s.pump1Power || 0,
      pump2Power: s.pump2Power || 0,
      pump3Power: s.pump3Power || 0,
      pump4Power: s.pump4Power || 0,
      motorFlag: s.motorFlag || '',
      active: s.active,
    });
    const b = await getBranches(s.orgId);
    setBranches(b);
    setModal(true);
  };

  const handleFormOrgChange = async (newOrgId: string) => {
    setForm({ ...form, orgId: newOrgId, branchId: '' });
    if (newOrgId) {
      const b = await getBranches(newOrgId);
      setBranches(b);
    } else {
      setBranches([]);
    }
  };

  const save = async () => {
    playClick();
    if (!form.orgId) { alert('Выберите организацию'); return; }
    if (!form.branchId) { alert('Для мойки филиал обязателен'); return; }
    if (!form.name.trim()) return;
    try {
      if (editing) {
        await updateService(editing.id, form);
      } else {
        await createService(form);
      }
      setModal(false);
      load();
    } catch (e) {
      console.error(e);
      // setError(e.response?.data?.message || 'Ошибка сохранения');
    }
  };

  const totalPages = Math.ceil(list.length / pageSize);
  const paginated = list.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="h-7 w-7 text-blue-400" />
          {isSuperAdmin ? 'Услуги (шаблоны)' : 'Услуги'}
        </h1>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <select
                value={orgId}
                onChange={(e) => handleOrgChange(e.target.value)}
                className="rounded-lg border border-slate-600 bg-slate-800/80 py-2 pl-3 pr-8 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Все организации</option>
                {orgs.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-slate-400" />
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-800/80 py-2 pl-3 pr-8 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Все филиалы</option>
              {filterBranches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
            <Plus className="h-4 w-4" /> Добавить сервис
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/80">
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-400">Название</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-400">Филиал</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-400">Цена/мин</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-400 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Нет данных</td></tr>
              ) : (
                paginated.map((s) => (
                  <tr key={s.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{s.name}</div>
                      <div className="text-xs text-slate-400">{s.category}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {filterBranches.find(b => b.id === s.branchId)?.name || 'Общий'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-400 font-mono">{s.pricePerMinute.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => openEdit(s)} className="p-1 text-slate-400 hover:text-white"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => { if (confirm('Удалить?')) deleteService(s.id).then(load) }} className="p-1 text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {paginated.length > 0 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalItems={list.length} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
        )}
      </div>

      {modal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setModal(false)}>
          <div className="w-full max-w-2xl flex flex-col rounded-2xl border border-slate-700/80 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-700/60 bg-slate-900/95 px-6 py-4 rounded-t-2xl shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-400" />
                {editing ? 'Редактировать сервис' : 'Новый сервис (Portal)'}
              </h3>
              <button onClick={() => setModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700/60 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
              {/* ─── Шаблоны (Templates) ─── */}
              {!editing && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <span className="h-px flex-1 bg-slate-700/60" />
                    Быстрые шаблоны
                    <span className="h-px flex-1 bg-slate-700/60" />
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => applyTemplate(t)}
                        className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-slate-700 hover:text-blue-300 transition-colors"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Основная информация ─── */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span className="h-px flex-1 bg-slate-700/60" />
                  Основная информация
                  <span className="h-px flex-1 bg-slate-700/60" />
                </h4>

                {isSuperAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Организация</label>
                    <select value={form.orgId} onChange={e => handleFormOrgChange(e.target.value)} className="w-full rounded-lg bg-slate-800/80 border border-slate-700 text-white px-3 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-colors">
                      <option value="">Выберите...</option>
                      {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Филиал *</label>
                  <select value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })} className="w-full rounded-lg bg-slate-800/80 border border-slate-700 text-white px-3 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-colors">
                    <option value="">Все филиалы</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Название *</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Мойка кузова" className="w-full rounded-lg bg-slate-800/80 border border-slate-700 text-white px-3 py-2.5 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Категория</label>
                    <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Основные" className="w-full rounded-lg bg-slate-800/80 border border-slate-700 text-white px-3 py-2.5 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Описание</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Краткое описание услуги..." className="w-full rounded-lg bg-slate-800/80 border border-slate-700 text-white px-3 py-2.5 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-colors resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Цена за минуту (сум)</label>
                    <input type="number" value={form.pricePerMinute} onChange={e => setForm({ ...form, pricePerMinute: Number(e.target.value) })} className="w-full rounded-lg bg-slate-800/80 border border-slate-700 text-white px-3 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Длительность (мин)</label>
                    <input type="number" value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })} className="w-full rounded-lg bg-slate-800/80 border border-slate-700 text-white px-3 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-colors" />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-800/50 border border-slate-700/50 px-4 py-3">
                  <div>
                    <span className="text-sm font-medium text-white">Активна</span>
                    <p className="text-xs text-slate-400">Услуга доступна для клиентов</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, active: !form.active })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.active ? 'bg-blue-600' : 'bg-slate-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {/* ─── Бронирование ─── */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span className="h-px flex-1 bg-slate-700/60" />
                  Бронирование
                  <span className="h-px flex-1 bg-slate-700/60" />
                </h4>

                <div className="flex items-center justify-between rounded-lg bg-slate-800/50 border border-slate-700/50 px-4 py-3">
                  <div>
                    <span className="text-sm font-medium text-white">Можно бронировать</span>
                    <p className="text-xs text-slate-400">Клиенты могут бронировать время</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, bookable: !form.bookable })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.bookable ? 'bg-blue-600' : 'bg-slate-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.bookable ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {form.bookable && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Интервал бронирования (мин)</label>
                      <input type="number" value={form.bookingIntervalMinutes} onChange={e => setForm({ ...form, bookingIntervalMinutes: Number(e.target.value) })} className="w-full rounded-lg bg-slate-800/80 border border-slate-700 text-white px-3 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Рабочие часы</label>
                      <input value={form.workingHours} onChange={e => setForm({ ...form, workingHours: e.target.value })} placeholder="09:00-20:00" className="w-full rounded-lg bg-slate-800/80 border border-slate-700 text-white px-3 py-2.5 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-colors" />
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Настройки оборудования (IoT) ─── */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span className="h-px flex-1 bg-slate-700/60" />
                  Базовые Настройки Оборудования (IoT)
                  <span className="h-px flex-1 bg-slate-700/60" />
                </h4>
                <p className="text-xs text-slate-400 -mt-2 mb-2 px-1">
                  Это базовые значения. Они будут применяться ко всем киоскам по умолчанию.
                  Вы можете переопределить эти параметры для конкретного бокса в разделе "Hardware Киоски".
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Команда</label>
                    <input value={form.command} onChange={e => setForm({ ...form, command: e.target.value })} placeholder="START_WASH" className="w-full rounded-lg bg-slate-800/80 border border-slate-700 text-white px-3 py-2.5 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-colors font-mono text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Relay Bits</label>
                    <input value={form.relayBits} onChange={e => setForm({ ...form, relayBits: e.target.value })} placeholder="0xFF" className="w-full rounded-lg bg-slate-800/80 border border-slate-700 text-white px-3 py-2.5 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-colors font-mono text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Частота мотора (Hz)</label>
                    <input type="number" value={form.motorFrequency} onChange={e => setForm({ ...form, motorFrequency: Number(e.target.value) })} className="w-full rounded-lg bg-slate-800/80 border border-slate-700 text-white px-3 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Флаг мотора</label>
                    <input value={form.motorFlag} onChange={e => setForm({ ...form, motorFlag: e.target.value })} placeholder="ON/OFF" className="w-full rounded-lg bg-slate-800/80 border border-slate-700 text-white px-3 py-2.5 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-colors font-mono text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n}>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Насос {n} мощность</label>
                      <input
                        type="number"
                        value={(form as Record<string, any>)[`pump${n}Power`]}
                        onChange={e => setForm({ ...form, [`pump${n}Power`]: Number(e.target.value) })}
                        className="w-full rounded-lg bg-slate-800/80 border border-slate-700 text-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ─── Кнопки ─── */}
            <div className="flex justify-end gap-3 p-4 border-t border-slate-700/60 shrink-0">
              <button onClick={() => setModal(false)} className="px-5 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium">Отмена</button>
              <button onClick={save} className="bg-blue-600 px-6 py-2.5 rounded-lg text-white hover:bg-blue-500 transition-colors text-sm font-medium shadow-lg shadow-blue-600/20">Сохранить</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
