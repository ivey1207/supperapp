import { useState, useEffect } from 'react';
import { getPromoTemplates, createPromoTemplate, updatePromoTemplate, deletePromoTemplate } from '../lib/api';
import type { PromoTemplate } from '../lib/api';
import { Plus, Trash2, Edit2, Layout as LayoutIcon, X } from 'lucide-react';
import { playClick } from '../lib/sound';

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
            code: '',
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
            alert('Ошибка при сохранении шаблона');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Удалить этот шаблон?')) return;
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
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Шаблоны акций</h1>
                    <p className="text-slate-500 dark:text-slate-400">Создавайте чертежи для будущих кампаний</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white transition-all hover:bg-blue-500 active:scale-95"
                >
                    <Plus className="h-5 w-5" />
                    Создать шаблон
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((t) => (
                    <div key={t.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                    <LayoutIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{t.name}</h3>
                                    <span className="text-[10px] font-mono text-slate-500 uppercase">{t.code}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">{t.promoType}</span>
                            {t.requiresApproval && <span className="px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-[10px] font-bold text-amber-600 uppercase">Нужно одобрение</span>}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={() => handleOpenEdit(t)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    </div>
                ))}
            </div>

            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-xl font-bold">{editing ? 'Редактировать шаблон' : 'Новый шаблон'}</h2>
                            <button onClick={() => setModal(false)}><X className="h-6 w-6 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-slate-500">Название</label>
                                    <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 px-4 py-2" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-slate-500">Код (ID)</label>
                                    <input required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 px-4 py-2" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-slate-500">JSON Схема Формы</label>
                                <textarea rows={5} value={JSON.stringify(formData.formSchema, null, 2)} onChange={e => {
                                    try { setFormData({ ...formData, formSchema: JSON.parse(e.target.value) }) } catch (e) { }
                                }} className="w-full font-mono text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 px-4 py-2" />
                            </div>

                            <div className="flex items-center gap-3">
                                <input type="checkbox" checked={formData.requiresApproval} onChange={e => setFormData({ ...formData, requiresApproval: e.target.checked })} />
                                <label className="text-sm font-medium">Требует одобрения Супер-админа</label>
                            </div>

                            <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setModal(false)} className="px-6 py-2 text-slate-400 font-bold">Отмена</button>
                                <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20">Сохранить</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
