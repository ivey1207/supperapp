import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import {
    getPromotions, createPromotion, updatePromotion, deletePromotion,
    getOrganizations, getBranches
} from '../lib/api';
import type { Promotion, Organization } from '../lib/api';
import {
    Plus, Edit2, Trash2, Calendar,
    Search, Filter, GitBranch, CheckCircle, XCircle
} from 'lucide-react';
import { playClick } from '../lib/sound';

export default function Promotions() {
    const { isSuperAdmin, user } = useAuth();
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [filterBranches, setFilterBranches] = useState<any[]>([]);
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
        active: true
    });

    useEffect(() => {
        loadData();
    }, [filterOrg, filterBranch]);

    async function loadData() {
        try {
            const [promData, orgData] = await Promise.all([
                getPromotions(filterOrg || undefined, filterBranch || undefined),
                isSuperAdmin ? getOrganizations() : Promise.resolve([])
            ]);
            setPromotions(promData);
            setOrganizations(orgData);

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
    }

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
            active: true
        });
        if (initialOrgId) {
            const b = await getBranches(initialOrgId);
            setBranches(b);
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
            active: promo.active
        });

        if (promo.orgId) {
            const branchData = await getBranches(promo.orgId);
            setBranches(branchData);
        }

        setModal(true);
    };

    const handleOrgChange = async (orgId: string) => {
        setFormData({ ...formData, orgId, branchId: '' });
        if (orgId) {
            const branchData = await getBranches(orgId);
            setBranches(branchData);
        } else {
            setBranches([]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        playClick();
        try {
            if (editing) {
                await updatePromotion(editing.id, formData);
            } else {
                await createPromotion(formData);
            }
            setModal(false);
            loadData();
        } catch (err) {
            alert('Ошибка при сохранении акции');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Вы уверены, что хотите удалить эту акцию?')) return;
        playClick();
        try {
            await deletePromotion(id);
            loadData();
        } catch (err) {
            alert('Ошибка при удалении');
        }
    };

    const filtered = promotions.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Акции и спецпредложения</h1>
                    <p className="text-slate-400">Управляйте рекламными кампаниями и филиалами</p>
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
                        className="w-full rounded-xl border border-slate-800/60 bg-slate-900/60 py-2.5 pl-10 pr-4 text-white placeholder-slate-500 outline-none focus:border-blue-500/50 focus:bg-slate-900/80 transition-all font-medium"
                    />
                </div>

                {isSuperAdmin && (
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                        <select
                            value={filterOrg}
                            onChange={(e) => { setFilterOrg(e.target.value); setFilterBranch(''); }}
                            className="w-full appearance-none rounded-xl border border-slate-800/60 bg-slate-900/60 py-2.5 pl-10 pr-4 text-white outline-none focus:border-blue-500/50 focus:bg-slate-900/80 transition-all cursor-pointer font-medium"
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
                        className="w-full appearance-none rounded-xl border border-slate-800/60 bg-slate-900/60 py-2.5 pl-10 pr-4 text-white outline-none focus:border-blue-500/50 focus:bg-slate-900/80 transition-all cursor-pointer font-medium"
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
                    <div key={promo.id} className="group relative overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4 transition-all hover:border-slate-700 hover:bg-slate-900/60">
                        {promo.imageUrl && (
                            <div className="mb-4 aspect-video overflow-hidden rounded-xl bg-slate-800">
                                <img src={promo.imageUrl} alt={promo.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-white">{promo.title}</h3>
                                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                        {promo.active ? (
                                            <span className="flex items-center gap-1 text-emerald-400 font-semibold"><CheckCircle className="h-3.5 w-3.5" /> Активна</span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-slate-500 font-semibold"><XCircle className="h-3.5 w-3.5" /> Черновик</span>
                                        )}
                                    </div>
                                </div>
                                <div className="rounded-lg bg-blue-500/20 px-2.5 py-1.5 text-sm font-black text-blue-400">
                                    {promo.discountValue}
                                </div>
                            </div>

                            <p className="line-clamp-2 text-sm text-slate-400 leading-relaxed">{promo.description}</p>

                            <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider">
                                <div className="flex items-center gap-1 rounded-full bg-slate-800/80 px-2.5 py-1 text-slate-400">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(promo.startDate).toLocaleDateString()} - {new Date(promo.endDate).toLocaleDateString()}
                                </div>
                                {promo.branchId && (
                                    <div className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-blue-400">
                                        <GitBranch className="h-3 w-3" />
                                        {filterBranches.find(b => b.id === promo.branchId)?.name || 'Филиал'}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 opacity-0 transition-all duration-300 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0">
                                <button
                                    onClick={() => handleOpenEdit(promo)}
                                    className="rounded-lg bg-slate-800 p-2 text-white hover:bg-slate-700 transition-colors shadow-lg"
                                    title="Редактировать"
                                >
                                    <Edit2 className="h-4 w-4" />
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setModal(false)}>
                    <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-700/50 bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="border-b border-slate-800/60 px-8 py-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white tracking-tight">{editing ? 'Редактировать акцию' : 'Новая акция'}</h2>
                            <button onClick={() => setModal(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-800 hover:text-white transition-all">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-6 md:col-span-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Название акции</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full rounded-2xl border border-slate-700 bg-slate-800/30 px-5 py-3.5 text-white outline-none focus:border-blue-500/50 focus:bg-slate-800/50 transition-all font-medium"
                                            value={formData.title}
                                            placeholder="Напр. Скидка на комплексную мойку"
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Описание</label>
                                        <textarea
                                            required
                                            rows={3}
                                            className="w-full rounded-2xl border border-slate-700 bg-slate-800/30 px-5 py-3.5 text-white outline-none focus:border-blue-500/50 focus:bg-slate-800/50 transition-all font-medium"
                                            value={formData.description}
                                            placeholder="Расскажите подробности предложения..."
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Размер выгоды</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-800/30 px-5 py-3.5 text-white outline-none focus:border-blue-500/50 focus:bg-slate-800/50 transition-all font-medium"
                                        value={formData.discountValue}
                                        placeholder="-20%, Подарок и т.д."
                                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">URL картинки</label>
                                    <input
                                        type="url"
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-800/30 px-5 py-3.5 text-white outline-none focus:border-blue-500/50 focus:bg-slate-800/50 transition-all font-medium"
                                        value={formData.imageUrl}
                                        placeholder="https://..."
                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Дата старта</label>
                                    <input
                                        required
                                        type="date"
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-800/30 px-5 py-3.5 text-white outline-none focus:border-blue-500/50 focus:bg-slate-800/50 transition-all font-medium"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Дата финиша</label>
                                    <input
                                        required
                                        type="date"
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-800/30 px-5 py-3.5 text-white outline-none focus:border-blue-500/50 focus:bg-slate-800/50 transition-all font-medium"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>

                                {isSuperAdmin && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Владелец (Партнёр)</label>
                                        <select
                                            required
                                            className="w-full rounded-2xl border border-slate-700 bg-slate-800/30 px-5 py-3.5 text-white outline-none focus:border-blue-500/50 focus:bg-slate-800/50 transition-all font-medium cursor-pointer"
                                            value={formData.orgId}
                                            onChange={(e) => handleOrgChange(e.target.value)}
                                        >
                                            <option value="">Выбрать...</option>
                                            {organizations.map(org => (
                                                <option key={org.id} value={org.id}>{org.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Действует в филиале</label>
                                    <select
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-800/30 px-5 py-3.5 text-white outline-none focus:border-blue-500/50 focus:bg-slate-800/50 transition-all font-medium cursor-pointer"
                                        value={formData.branchId}
                                        onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                                    >
                                        <option value="">Во всех филиалах</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
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
                                <button
                                    type="button"
                                    onClick={() => setModal(false)}
                                    className="rounded-2xl px-6 py-3 text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-10 py-3 text-sm font-black text-white hover:shadow-xl hover:shadow-blue-500/20 active:scale-[0.98] transition-all"
                                >
                                    {editing ? 'Сохранить изменения' : 'Запустить акцию'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
