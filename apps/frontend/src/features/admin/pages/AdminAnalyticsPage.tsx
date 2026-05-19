import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  analyticsApi,
  type MasterLoad,
  type TopService,
  type FunnelEntry,
} from '../../../shared/api/endpoints';
import Spinner from '../../../shared/components/ui/Spinner';
import Button from '../../../shared/components/ui/Button';

const COLORS = [
  '#f97316', '#1a2744', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b',
  '#ef4444', '#06b6d4', '#84cc16', '#8b5cf6', '#f43f5e', '#10b981', '#fb923c', '#6366f1',
  '#d97706', '#0ea5e9', '#16a34a', '#dc2626',
];

function exportCsv(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map((r) => Object.values(r).join(',')).join('\n');
  const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function getBarColor(pct: number) {
  if (pct > 80) return '#ef4444';
  if (pct > 50) return '#f59e0b';
  return '#22c55e';
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Очікує', CONFIRMED: 'Підтверджено', IN_PROGRESS: 'Виконується',
  COMPLETED: 'Завершено', CANCELLED: 'Скасовано',
};

export default function AdminAnalyticsPage() {
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: revenue = [], isLoading: lr } = useQuery({
    queryKey: ['analytics-revenue', groupBy, from, to],
    queryFn: () => analyticsApi.getRevenue({ groupBy, from: from || undefined, to: to || undefined }).then((r) => r.data),
  });

  const { data: masterLoad = [], isLoading: lm } = useQuery({
    queryKey: ['analytics-master-load'],
    queryFn: () => analyticsApi.getMasterLoad().then((r) => r.data),
  });

  const { data: topServices = [], isLoading: ls } = useQuery({
    queryKey: ['analytics-top-services-full'],
    queryFn: () => analyticsApi.getTopServices(10).then((r) => r.data),
  });

  const { data: funnel = [], isLoading: lf } = useQuery({
    queryKey: ['analytics-funnel'],
    queryFn: () => analyticsApi.getBookingFunnel().then((r) => r.data),
  });

  const { data: retention, isLoading: lret } = useQuery({
    queryKey: ['analytics-retention'],
    queryFn: () => analyticsApi.getClientsRetention().then((r) => r.data),
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Аналітика</h1>

      {/* Revenue */}
      <section className="bg-white rounded-xl shadow-card border border-slate-100 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-slate-900">Доходи</h2>
          <div className="flex flex-wrap gap-2 items-center">
            {(['day', 'week', 'month'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${groupBy === g ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {g === 'day' ? 'День' : g === 'week' ? 'Тиждень' : 'Місяць'}
              </button>
            ))}
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1" />
            <Button size="sm" variant="ghost" onClick={() => exportCsv(revenue as unknown as Record<string, unknown>[], 'revenue.csv')}>CSV</Button>
          </div>
        </div>
        {lr ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : revenue.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">Немає даних за вибраний період</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Number(v).toLocaleString()} ₴`} />
              <Tooltip
                formatter={(v: unknown, name: unknown) =>
                  name === 'revenue' ? [`${Number(v).toLocaleString()} ₴`, 'Дохід'] : [v as number, 'Записів']
                }
              />
              <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="revenue" />
              <Line type="monotone" dataKey="count" stroke="#1a2744" strokeWidth={1.5} dot={{ r: 2 }} name="count" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Master Load */}
      <section className="bg-white rounded-xl shadow-card border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Завантаженість майстрів</h2>
          <Button size="sm" variant="ghost" onClick={() => exportCsv(masterLoad as unknown as Record<string, unknown>[], 'master-load.csv')}>CSV</Button>
        </div>
        {lm ? <div className="flex justify-center py-8"><Spinner /></div> : masterLoad.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">Немає даних</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, masterLoad.length * 44)}>
            <BarChart data={masterLoad} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="masterName" width={130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => [`${v}%`, 'Завантаженість']} />
              <Bar dataKey="loadPercent" radius={[0, 4, 4, 0]}>
                {masterLoad.map((entry: MasterLoad, i: number) => (
                  <Cell key={i} fill={getBarColor(entry.loadPercent)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Top Services */}
      <section className="bg-white rounded-xl shadow-card border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Топ послуги</h2>
          <Button size="sm" variant="ghost" onClick={() => exportCsv(topServices as unknown as Record<string, unknown>[], 'top-services.csv')}>CSV</Button>
        </div>
        {ls ? <div className="flex justify-center py-8"><Spinner /></div> : topServices.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">Немає даних</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topServices}
                  dataKey="bookingCount"
                  nameKey="serviceName"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label={false}
                >
                  {topServices.map((_: TopService, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value, name) => [`${Number(value ?? 0)} записів`, String(name ?? '')]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500">
                    <th className="text-left py-2">Послуга</th>
                    <th className="text-right py-2">Записів</th>
                    <th className="text-right py-2">Дохід</th>
                  </tr>
                </thead>
                <tbody>
                  {topServices.map((s: TopService, i: number) => (
                    <tr key={s.serviceId} className="border-b border-slate-50">
                      <td className="py-2 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        {s.serviceName}
                      </td>
                      <td className="text-right py-2 font-medium">{s.bookingCount}</td>
                      <td className="text-right py-2 font-medium">{s.revenue.toLocaleString('uk-UA')} ₴</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Booking Funnel */}
      <section className="bg-white rounded-xl shadow-card border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Воронка статусів</h2>
          <Button size="sm" variant="ghost" onClick={() => exportCsv(funnel as unknown as Record<string, unknown>[], 'funnel.csv')}>CSV</Button>
        </div>
        {lf ? <div className="flex justify-center py-8"><Spinner /></div> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnel.map((f: FunnelEntry) => ({ ...f, label: STATUS_LABELS[f.status] ?? f.status }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: unknown, name: unknown) =>
                  [name === 'percent' ? `${v}%` : v as number, name === 'percent' ? 'Конверсія' : 'Кількість']
                }
              />
              <Bar dataKey="count" fill="#1a2744" radius={[4, 4, 0, 0]} name="count" />
              <Bar dataKey="percent" fill="#f97316" radius={[4, 4, 0, 0]} name="percent" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Client Retention */}
      <section className="bg-white rounded-xl shadow-card border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Утримання клієнтів</h2>
        {lret ? <div className="flex justify-center py-8"><Spinner /></div> : retention ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Нові (< 30 днів)', value: retention.newClients, color: 'text-green-600' },
              { label: 'Постійні (2+ записи)', value: retention.returningClients, color: 'text-accent' },
              { label: 'Відтік (> 90 днів)', value: retention.churnedClients, color: 'text-red-500' },
              { label: 'Серед. записів/клієнт', value: Number(retention.avgBookingsPerClient ?? 0).toFixed(1), color: 'text-brand' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-4 bg-slate-50 rounded-xl">
                <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
