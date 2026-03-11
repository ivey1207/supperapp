import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import {
    getPromotions, createPromotion, updatePromotion, deletePromotion,
    getOrganizations, getBranches, getServices, uploadFile, getFileUrl,
    getPromoTemplates, broadcastPromotion
} from '../lib/api';
import type { Promotion, Organization, Branch, Service, PromoTemplate } from '../lib/api';
import { Search, Plus, Trash2, Filter, GitBranch, CheckCircle, XCircle, Calendar, Edit2, Image as ImageIcon, Layout as LayoutIcon, BarChart3, Gift, Zap, Clock, Star, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { playClick } from '../lib/sound';

const PROMO_PRESETS = [
    {
        id: 'cashback',
        title: 'Кэшбэк 10%',
        description: 'Получайте 10% от суммы чека на бонусный баланс при каждой мойке.',
        discountValue: 'Кэшбэк 10%',
        icon: <Gift className="text-amber-400" />,
        color: 'bg-amber-400/10'
    },
    {
        id: 'happy-hours',
        title: 'Счастливые часы',
        description: 'Скидка 20% на все услуги в будние дни с 10:00 до 14:00.',
        discountValue: '-20%',
        icon: <Clock className="text-blue-400" />,
        color: 'bg-blue-400/10'
    },
    {
        id: 'first-time',
        title: 'Первая мойка',
        description: 'Скидка 50% на первую комплексную мойку для новых клиентов.',
        discountValue: '-50%',
        icon: <Star className="text-emerald-400" />,
        color: 'bg-emerald-400/10'
    },
    {
        id: 'night',
        title: 'Ночной тариф',
        description: 'Специальная цена на самообслуживание в ночное время (с 00:00 до 06:00).',
        discountValue: 'Суперцена',
        icon: <Zap className="text-purple-400" />,
        color: 'bg-purple-400/10'
    }
];

export default function Promotions() {
    const { isSuperAdmin, user } = useAuth();
    const navigate = useNavigate();
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [filterBranches, setFilterBranches] = useState<Branch[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [templates, setTemplates] = useState<PromoTemplate[]>([]);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState<Promotion | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOrg, setFilterOrg] = useState('');
    const [filterBranch, setFilterBranch] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        imageUrl: '',
        discountValue: '',
        startDate: '',
        endDate: '',
        orgId: '',
        branchId: '',
        serviceId: '',
        templateId: '',
        config: {} as any,
        active: true,
        totalBudget: 0
    });

    const loadData = useCallback(async () => {
        try {
            const [promData, orgData, templateData] = await Promise.all([
                getPromotions(filterOrg || undefined, filterBranch || undefined),
                isSuperAdmin ? getOrganizations() : Promise.resolve([]),
                getPromoTemplates()
            ]);
            setPromotions(promData);
            setOrganizations(orgData);
            setTemplates(templateData);

            const effectiveOrgId = isSuperAdmin ? filterOrg : user?.orgId;
            if (effectiveOrgId) {
                const branchData = await getBranches(effectiveOrgId);
                setFilterBranches(branchData);
            } else {
                setFilterBranches([]);
            }
        } catch (err) {
            console.error('Failed to load promotions:', err);
        }
    }, [filterOrg, filterBranch, isSuperAdmin, user]);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        loadData();
    }, [loadData]);

    const handleOpenCreate = async () => {
        playClick();
        setEditing(null);
        const initialOrgId = isSuperAdmin ? filterOrg : user?.orgId || '';
        setFormData({
            title: '',
            description: '',
            imageUrl: '',
            discountValue: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            orgId: initialOrgId,
            branchId: filterBranch || '',
            serviceId: '',
            templateId: '',
            config: { conditions: [], rewards: [], limits: [] },
            active: true,
            totalBudget: 0
        });
        if (initialOrgId) {
            const [b, s] = await Promise.all([
                getBranches(initialOrgId),
                getServices(initialOrgId, filterBranch || undefined)
            ]);
            setBranches(b);
            setServices(s);
        }
        setModal(true);
    };

    const handleOpenEdit = async (promo: Promotion) => {
        playClick();
        setEditing(promo);
        setFormData({
            title: promo.title,
            description: promo.description,
            imageUrl: promo.imageUrl || '',
            discountValue: promo.discountValue,
            startDate: promo.startDate.split('T')[0],
            endDate: promo.endDate.split('T')[0],
            orgId: promo.orgId,
            branchId: promo.branchId || '',
            serviceId: promo.serviceId || '',
            templateId: promo.templateId || '',
            config: promo.config || { conditions: [], rewards: [], limits: [] },
            active: promo.active,
            totalBudget: promo.totalBudget || 0
        });

        if (promo.orgId) {
            const [branchData, serviceData] = await Promise.all([
                getBranches(promo.orgId),
                getServices(promo.orgId, promo.branchId || undefined)
            ]);
            setBranches(branchData);
            setServices(serviceData);
        }

        setModal(true);
    };

    const handleOrgChange = async (orgId: string) => {
        setFormData({ ...formData, orgId, branchId: '', serviceId: '' });
        if (orgId) {
            const [branchData, serviceData] = await Promise.all([
                getBranches(orgId),
                getServices(orgId)
            ]);
            setBranches(branchData);
            setServices(serviceData);
        } else {
            setBranches([]);
            setServices([]);
        }
    };

    const handleBranchChange = async (branchId: string) => {
        setFormData({ ...formData, branchId, serviceId: '' });
        const serviceData = await getServices(formData.orgId, branchId || undefined);
        setServices(serviceData);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        playClick();
        try {
            const payload = {
                ...formData,
                startDate: formData.startDate.length === 10 ? `${formData.startDate} 00:00:00` : formData.startDate,
                endDate: formData.endDate.length === 10 ? `${formData.endDate} 23:59:59` : formData.endDate,
            };

            if (editing) {
                await updatePromotion(editing.id, payload);
            } else {
                await createPromotion(payload);
            }
            setModal(false);
            loadData();
        } catch (err) {
            console.error(err);
            alert('Ошибка при сохранении акции');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Вы уверены, что хотите удалить эту акцию?')) return;
        playClick();
        try {
            await deletePromotion(id);
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            loadData();
        } catch (err) {
            console.error(err);
            alert('Ошибка при удалении');
        }
    };

    const handleBroadcast = async (id: string, title: string) => {
        if (!confirm(`Отправить уведомление об акции "${title}" всем пользователям?`)) return;
        playClick();
        try {
            await broadcastPromotion(id);
            alert('Рассылка успешно запущена!');
        } catch (err) {
            console.error(err);
            alert('Ошибка при запуске рассылки');
        }
    };

    const filtered = promotions.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Акции и спецпредложения</h1>
                    <p className="text-slate-500 dark:text-slate-400">Управляйте рекламными кампаниями и филиалами</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95"
                >
                    <Plus className="h-5 w-5" />
                    Добавить акцию
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-blue-400" />
                    <input
                        type="text"
                        placeholder="Поиск..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800/60 bg-white dark:bg-slate-900/60 py-2.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500/50 focus:bg-white dark:focus:bg-slate-900/80 transition-all font-medium"
                    />
                </div>

                {isSuperAdmin && (
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                        <select
                            value={filterOrg}
                            onChange={(e) => { setFilterOrg(e.target.value); setFilterBranch(''); }}
                            className="w-full appearance-none rounded-xl border border-slate-300 dark:border-slate-800/60 bg-white dark:bg-slate-900/60 py-2.5 pl-10 pr-4 text-slate-900 dark:text-white outline-none focus:border-blue-500/50 focus:bg-white dark:focus:bg-slate-900/80 transition-all cursor-pointer font-medium"
                        >
                            <option value="">Все партнёры</option>
                            {organizations.map(org => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="relative">
                    <GitBranch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <select
                        value={filterBranch}
                        onChange={(e) => setFilterBranch(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-300 dark:border-slate-800/60 bg-white dark:bg-slate-900/60 py-2.5 pl-10 pr-4 text-slate-900 dark:text-white outline-none focus:border-blue-500/50 focus:bg-white dark:focus:bg-slate-900/80 transition-all cursor-pointer font-medium"
                    >
                        <option value="">Все филиалы</option>
                        {filterBranches.map(branch => (
                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((promo) => (
                    <div key={promo.id} className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/60 shadow-sm dark:shadow-none">
                        {promo.imageUrl && (
                            <div className="mb-4 aspect-video overflow-hidden rounded-xl bg-slate-800">
                                <img src={getFileUrl(promo.imageUrl)} alt={promo.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{promo.title}</h3>
                                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-500">
                                        {promo.active ? (
                                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold"><CheckCircle className="h-3.5 w-3.5" /> Активна</span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-500 font-semibold"><XCircle className="h-3.5 w-3.5" /> Черновик</span>
                                        )}
                                        {promo.templateId && (
                                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold uppercase text-[9px]"><LayoutIcon className="h-3 w-3" /> Шаблон</span>
                                        )}
                                    </div>
                                </div>
                                <div className="rounded-lg bg-blue-500/20 px-2.5 py-1.5 text-sm font-black text-blue-400">
                                    {promo.discountValue}
                                </div>
                            </div>

                            <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{promo.description}</p>

                            <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider">
                                <div className="flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 text-slate-600 dark:text-slate-400">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(promo.startDate).toLocaleDateString()} - {new Date(promo.endDate).toLocaleDateString()}
                                </div>
                                {promo.branchId && (
                                    <div className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-blue-600 dark:text-blue-400">
                                        <GitBranch className="h-3 w-3" />
                                        {filterBranches.find(b => b.id === promo.branchId)?.name || 'Филиал'}
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-800/50">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Бюджет</span>
                                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                                        {(promo.currentSpend || 0).toLocaleString()} / {(promo.totalBudget || 0).toLocaleString()} UZS
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-700 ${((promo.currentSpend || 0) / (promo.totalBudget || 1) * 100) > 90 ? 'bg-rose-500' : 'bg-blue-500'
                                            }`}
                                        style={{ width: `${Math.min(100, (promo.currentSpend || 0) / (promo.totalBudget || 1) * 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 opacity-0 transition-all duration-300 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0">
                                <button
                                    onClick={() => { playClick(); navigate(`${promo.id}/analytics`); }}
                                    className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:text-white transition-colors"
                                    title="Аналитика"
                                >
                                    <BarChart3 size={16} />
                                </button>
                                <button
                                    onClick={() => handleOpenEdit(promo)}
                                    className="rounded-lg bg-white dark:bg-slate-800 p-2 text-slate-500 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm dark:shadow-none"
                                    title="Редактировать"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleBroadcast(promo.id, promo.title)}
                                    className="rounded-lg bg-amber-500/10 p-2 text-amber-500 hover:bg-amber-500/20 transition-colors"
                                    title="Рассылка"
                                >
                                    <Megaphone className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(promo.id)}
                                    className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20 transition-colors"
                                    title="Удалить"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setModal(false)}>
                    <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="border-b border-slate-100 dark:border-slate-800/60 px-8 py-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{editing ? 'Редактировать акцию' : 'Новая акция'}</h2>
                            <button onClick={() => setModal(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-white transition-all">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            {!editing && (
                                <div className="mb-8">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4 block ml-1">Быстрый старт (Пресеты)</label>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        {PROMO_PRESETS.map(preset => (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                onClick={() => {
                                                    playClick();
                                                    setFormData({
                                                        ...formData,
                                                        title: preset.title,
                                                        description: preset.description,
                                                        discountValue: preset.discountValue
                                                    });
                                                }}
                                                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-700/50 ${preset.color} hover:border-blue-500/50 transition-all active:scale-95 group`}
                                            >
                                                <div className="p-2 bg-slate-900/50 rounded-xl group-hover:scale-110 transition-transform">
                                                    {preset.icon}
                                                </div>
                                                <span className="text-[10px] font-black text-white uppercase tracking-tight text-center">{preset.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-6 md:col-span-2">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Название акции</label>
                                            <input required type="text" className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 px-5 py-3.5 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500/50 transition-all font-medium" value={formData.title} placeholder="Напр. Скидка на мойку" onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Механика (из библиотеки)</label>
                                            <select className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 px-5 py-3.5 text-slate-900 dark:text-white outline-none focus:border-blue-500/50 transition-all font-medium cursor-pointer" value={formData.templateId} onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}>
                                                <option value="">Без шаблона</option>
                                                {templates.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Описание</label>
                                        <textarea required rows={3} className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 px-5 py-3.5 text-slate-900 dark:text-white outline-none focus:border-blue-500/50 transition-all font-medium" value={formData.description} placeholder="Детали предложения..." onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Скидка / Выгода</label>
                                    <input required type="text" className="w-full rounded-2xl border border-slate-700 bg-slate-800/30 px-5 py-3.5 text-white outline-none focus:border-blue-500/50 transition-all font-medium" value={formData.discountValue} placeholder="-20%, Подарок" onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Изображение</label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative aspect-video w-32 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                                            {formData.imageUrl ? <img src={getFileUrl(formData.imageUrl)} className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6 text-slate-600" />}
                                            <label className="absolute inset-0 cursor-pointer opacity-0"><input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    try { const { url } = await uploadFile(file); setFormData(f => ({ ...f, imageUrl: url })); } catch (err) { alert('Ошибка загрузки'); }
                                                }
                                            }} /></label>
                                        </div>
                                        <input type="url" className="flex-1 rounded-2xl border border-slate-700 bg-slate-800/30 px-4 py-2 text-white text-xs" value={formData.imageUrl} placeholder="URL..." onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Дата начала</label>
                                    <input required type="date" className="w-full rounded-2xl border border-slate-700 bg-slate-800/30 px-5 py-3.5 text-white outline-none focus:border-blue-500/50 transition-all font-medium" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Дата окончания</label>
                                    <input required type="date" className="w-full rounded-2xl border border-slate-700 bg-slate-800/30 px-5 py-3.5 text-white outline-none focus:border-blue-500/50 transition-all font-medium" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
                                </div>


                                {isSuperAdmin && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Владелец</label>
                                        <select required className="w-full rounded-2xl border border-slate-700 bg-slate-800/30 px-5 py-3.5 text-white outline-none focus:border-blue-500/50 transition-all font-medium cursor-pointer" value={formData.orgId} onChange={(e) => handleOrgChange(e.target.value)}>
                                            <option value="">Выбрать...</option>
                                            {organizations.map(org => (<option key={org.id} value={org.id}>{org.name}</option>))}
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Филиал</label>
                                    <select className="w-full rounded-2xl border border-slate-700 bg-slate-800/30 px-5 py-3.5 text-white outline-none focus:border-blue-500/50 transition-all font-medium cursor-pointer" value={formData.branchId} onChange={(e) => handleBranchChange(e.target.value)}>
                                        <option value="">Все филиалы</option>
                                        {branches.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Применить только к услуге</label>
                                    <select className="w-full rounded-2xl border border-slate-700 bg-slate-800/30 px-5 py-3.5 text-white outline-none focus:border-blue-500/50 transition-all font-medium cursor-pointer" value={formData.serviceId} onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}>
                                        <option value="">Все услуги</option>
                                        {services.map(s => (<option key={s.id} value={s.id}>{s.name || s.category}</option>))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Общий бюджет (UZS)</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-800/30 px-5 py-3.5 text-white outline-none focus:border-blue-500/50 transition-all font-medium"
                                        placeholder="Например: 1000000"
                                        value={formData.totalBudget}
                                        onChange={(e) => setFormData({ ...formData, totalBudget: Number(e.target.value) })}
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-2 md:col-span-2">
                                    <div className="relative inline-flex items-center cursor-pointer group" onClick={() => setFormData({ ...formData, active: !formData.active })}>
                                        <div className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${formData.active ? 'bg-blue-600' : 'bg-slate-700'}`}></div>
                                        <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${formData.active ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                    <label className="text-sm font-semibold text-slate-300 cursor-pointer" onClick={() => setFormData({ ...formData, active: !formData.active })}>Опубликовать и показывать клиентам</label>
                                </div>
                            </div>

                            <div className="mt-10 flex justify-end gap-4 border-t border-slate-800/60 pt-8">
                                <button type="button" onClick={() => setModal(false)} className="rounded-2xl px-6 py-3 text-sm font-bold text-slate-400 hover:bg-slate-800 transition-all">Отмена</button>
                                <button type="submit" className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-10 py-3 text-sm font-black text-white hover:shadow-xl transition-all">{editing ? 'Сохранить изменения' : 'Запустить акцию'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
