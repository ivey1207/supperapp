import { useState, useEffect } from 'react';
import { getPromoTemplates, createPromoTemplate, updatePromoTemplate, deletePromoTemplate } from '../lib/api';
import type { PromoTemplate } from '../lib/api';
import { Plus, Trash2, Edit2, Layout as LayoutIcon, X, Zap, Gift, Percent, Clock, Wallet } from 'lucide-react';
import { playClick } from '../lib/sound';

const MECHANIC_TYPES = [
    { id: 'DISCOUNT', name: 'Простая скидка', desc: 'Уменьшение цены услуги на фиксированную сумму или процент.', icon: <Percent className="h-5 w-5" />, color: 'bg-emerald-500/10 text-emerald-500' },
    { id: 'CASHBACK', name: 'Кешбэк в кошелек', desc: 'Возврат части средств на баланс пользователя после оплаты.', icon: <Wallet className="h-5 w-5" />, color: 'bg-blue-500/10 text-blue-500' },
    { id: 'HAPPY_HOURS', name: 'Счастливые часы', desc: 'Скидки, действующие только в определенное время или дни недели.', icon: <Clock className="h-5 w-5" />, color: 'bg-amber-500/10 text-amber-500' },
    { id: 'GIFT', name: 'Подарок / Бонус', desc: 'Бесплатная услуга или товар при выполнении условий.', icon: <Gift className="h-5 w-5" />, color: 'bg-rose-500/10 text-rose-500' },
    { id: 'DYNAMIC', name: 'Умная механика', desc: 'Сложные условия (например, скидка на 3-й визит).', icon: <Zap className="h-5 w-5" />, color: 'bg-indigo-500/10 text-indigo-500' },
];

export default function PromoTemplates() {
    const [templates, setTemplates] = useState<PromoTemplate[]>([]);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState<PromoTemplate | null>(null);
    const [formData, setFormData] = useState<Partial<PromoTemplate>>({
        code: '',
        name: '',
        promoType: 'DISCOUNT',
        formSchema: {},
        validationSchema: {},
        ruleSchema: {},
        requiresApproval: false,
        active: true
    });

    const loadData = async () => {
        try {
            const data = await getPromoTemplates();
            setTemplates(data);
        } catch (err) {
            console.error('Failed to load templates:', err);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenCreate = () => {
        playClick();
        setEditing(null);
        setFormData({
            code: 'TPL_' + Math.random().toString(36).substr(2, 6).toUpperCase(),
            name: '',
            promoType: 'DISCOUNT',
            formSchema: { fields: [] },
            validationSchema: {},
            ruleSchema: {},
            requiresApproval: false,
            active: true
        });
        setModal(true);
    };

    const handleOpenEdit = (template: PromoTemplate) => {
        playClick();
        setEditing(template);
        setFormData(template);
        setModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        playClick();
        try {
            if (editing) {
                await updatePromoTemplate(editing.id, formData);
            } else {
                await createPromoTemplate(formData);
            }
            setModal(false);
            loadData();
        } catch (err) {
            alert('Ошибка при сохранении механики');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Удалить эту механику?')) return;
        playClick();
        try {
            await deletePromoTemplate(id);
            loadData();
        } catch (err) {
            alert('Ошибка при удалении');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Библиотека маркетинговых механик</h1>
                    <p className="text-slate-500 dark:text-slate-400">Настраивайте правила, по которым будут работать ваши акции</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95"
                >
                    <Plus className="h-5 w-5" />
                    Добавить механику
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((t) => {
                    const mType = MECHANIC_TYPES.find(m => m.id === t.promoType) || MECHANIC_TYPES[0];
                    return (
                        <div key={t.id} className="group relative rounded-3xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 p-6 transition-all hover:border-blue-500/30 hover:bg-slate-50 dark:hover:bg-slate-900/60 shadow-sm dark:shadow-none">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${mType.color}`}>
                                        {mType.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{t.name}</h3>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.promoType}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenEdit(t)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"><Edit2 className="h-4 w-4" /></button>
                                    <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            </div>

                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed min-h-[40px]">
                                {mType.desc}
                            </p>

                            <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                                <div className="flex items-center gap-2">
                                    {t.requiresApproval && <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-[9px] font-black text-amber-500 uppercase tracking-tighter">Нужно одобрение</span>}
                                    {!t.active && <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-[9px] font-black text-slate-500 uppercase tracking-tighter">Выключена</span>}
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">{t.code}</span>
                            </div>
                        </div>
                    );
                })}

                {templates.length === 0 && (
                    <div className="md:col-span-2 lg:col-span-3 py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800/60 rounded-[2rem]">
                        <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4">
                            <LayoutIcon className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Библиотека пуста</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">Нажмите «Добавить механику», чтобы создать первое правило для будущих акций</p>
                    </div>
                )}
            </div>

            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setModal(false)}>
                    <div className="w-full max-w-xl overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{editing ? 'Редактировать механику' : 'Новая механика'}</h2>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Шаг в создании рекламной системы</p>
                            </div>
                            <button onClick={() => setModal(false)} className="rounded-full p-2 text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-white transition-all shadow-sm">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Название механики</label>
                                    <input
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Напр. Бонусный кешбэк"
                                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-6 py-4 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-bold text-lg shadow-inner"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Выберите тип логики</label>
                                    <div className="grid gap-3">
                                        {MECHANIC_TYPES.map(m => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, promoType: m.id as any })}
                                                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${formData.promoType === m.id
                                                        ? 'border-blue-500 bg-blue-500/10 ring-4 ring-blue-500/5'
                                                        : 'border-slate-200 dark:border-slate-800 bg-transparent hover:border-slate-300 dark:hover:border-slate-700'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-xl ${MECHANIC_TYPES.find(mt => mt.id === m.id)?.color}`}>
                                                    {m.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white">{m.name}</div>
                                                    <div className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">{m.desc}</div>
                                                </div>
                                                {formData.promoType === m.id && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/50">
                                    <div
                                        className={`relative inline-flex items-center cursor-pointer group`}
                                        onClick={() => setFormData({ ...formData, requiresApproval: !formData.requiresApproval })}
                                    >
                                        <div className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${formData.requiresApproval ? 'bg-blue-600' : 'bg-slate-600'}`}></div>
                                        <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${formData.requiresApproval ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-black text-slate-700 dark:text-slate-200 cursor-pointer" onClick={() => setFormData({ ...formData, requiresApproval: !formData.requiresApproval })}>
                                            Контроль Супер-админа
                                        </label>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Акции с этой механикой потребуют модерации</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 flex justify-end gap-4 border-t border-slate-100 dark:border-slate-800/60">
                                <button type="button" onClick={() => setModal(false)} className="px-8 py-3 text-slate-500 font-black hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all uppercase tracking-widest text-[10px]">Отмена</button>
                                <button type="submit" className="px-12 py-4 bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all active:scale-95 uppercase tracking-widest text-xs">
                                    {editing ? 'Сохранить изменения' : 'Создать механику'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
