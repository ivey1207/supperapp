import { useState } from 'react';
import { FileText, Download, Calendar, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { playClick } from '../lib/sound';

const mockRows = [
  { date: '2025-02-12', type: 'Мойка', count: 24, sum: 1200000 },
  { date: '2025-02-11', type: 'Мойка', count: 31, sum: 1550000 },
  { date: '2025-02-10', type: 'Мойка', count: 18, sum: 900000 },
  { date: '2025-02-09', type: 'Мойка', count: 42, sum: 2100000 },
  { date: '2025-02-08', type: 'Мойка', count: 28, sum: 1400000 },
];

export default function Reports() {
  const [dateFrom, setDateFrom] = useState('2025-02-01');
  const [dateTo, setDateTo] = useState('2025-02-12');
  const [rows] = useState(mockRows);

  const totalSum = rows.reduce((a, r) => a + r.sum, 0);
  const totalCount = rows.reduce((a, r) => a + r.count, 0);

  const handleExport = () => {
    playClick();
    const csv = [
      ['Дата', 'Тип', 'Кол-во', 'Сумма (сум)'].join(','),
      ...rows.map((r) => [r.date, r.type, r.count, r.sum].join(',')),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
          Отчёты
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/80 py-2 px-3 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
            />
            <span className="text-slate-400">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/80 py-2 px-3 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" />
            Экспорт CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/70 bg-white dark:bg-slate-900/40 p-5 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Выручка за период</span>
            <DollarSign className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {(totalSum / 1_000_000).toFixed(1)} млн сум
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/70 bg-white dark:bg-slate-900/40 p-5 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Кол-во операций</span>
            <Activity className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{totalCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/70 bg-white dark:bg-slate-900/40 p-5 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Средний чек</span>
            <TrendingUp className="h-5 w-5 text-violet-500 dark:text-violet-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {totalCount ? Math.round(totalSum / totalCount).toLocaleString() : 0} сум
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm dark:shadow-none">
        <h3 className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/70">
          Детализация по дням
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800/70 bg-slate-50 dark:bg-slate-900">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Дата</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Тип</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Кол-во</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.date + r.type}
                  className="border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-900 dark:text-white">{r.date}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.type}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.count}</td>
                  <td className="px-4 py-3 font-medium text-emerald-600 dark:text-emerald-400">{r.sum.toLocaleString()} сум</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
