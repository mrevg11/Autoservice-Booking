import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { analyticsApi, type TopService } from '../../../shared/api/endpoints';
import Spinner from '../../../shared/components/ui/Spinner';

const COLORS = ['#f97316', '#1a2744', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b'];

export default function AdminDashboard() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => analyticsApi.getSummary().then((r) => r.data),
  });

  const { data: revenue = [], isLoading: loadingRevenue } = useQuery({
    queryKey: ['analytics-revenue', 'month'],
    queryFn: () => analyticsApi.getRevenue({ groupBy: 'month' }).then((r) => r.data),
  });

  const { data: topServices = [], isLoading: loadingServices } = useQuery({
    queryKey: ['analytics-top-services'],
    queryFn: () => analyticsApi.getTopServices(8).then((r) => r.data),
  });

  const summaryCards = summary ? [
    { label: 'Всього клієнтів', value: summary.totalClients, sub: `${summary.totalMasters} майстрів` },
    { label: 'Записів сьогодні', value: summary.bookingsToday, sub: `${summary.pendingBookings} очікують` },
    { label: 'Дохід цього місяця', value: `${summary.revenueThisMonth.toLocaleString('uk-UA')} ₴`, sub: `Всього: ${summary.totalRevenue.toLocaleString('uk-UA')} ₴` },
    { label: 'Середній рейтинг', value: summary.avgRating.toFixed(1), sub: '⭐ по всіх майстрах' },
  ] : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Адмін-панель</h1>
        <Link to="/admin/analytics" className="text-sm text-accent hover:underline">Детальна аналітика →</Link>
      </div>

      {loadingSummary ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map(({ label, value, sub }) => (
            <div key={label} className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
              <p className="text-2xl font-extrabold text-brand">{value}</p>
              <p className="text-sm font-medium text-slate-700 mt-1">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-card border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Дохід по місяцях</h2>
          {loadingRevenue ? <div className="flex justify-center py-8"><Spinner /></div> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: unknown) => [`${Number(v).toLocaleString()} ₴`, 'Дохід']} />
                <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-card border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Топ послуги</h2>
          {loadingServices ? <div className="flex justify-center py-8"><Spinner /></div> : topServices.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">Немає даних</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={topServices} dataKey="bookingCount" nameKey="serviceName" cx="50%" cy="50%" outerRadius={80}>
                  {topServices.map((_: TopService, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend formatter={(val) => <span style={{ fontSize: 11 }}>{val}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/admin/users', label: '👥 Користувачі' },
          { to: '/admin/services', label: '🔧 Послуги' },
          { to: '/admin/masters', label: '👨‍🔧 Майстри' },
          { to: '/admin/bookings', label: '📋 Записи' },
        ].map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className="bg-white rounded-xl border border-slate-100 shadow-card p-4 text-center text-sm font-medium text-slate-700 hover:border-accent/30 hover:text-accent transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
