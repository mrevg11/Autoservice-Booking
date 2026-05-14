import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi, type BookingStatus, type Booking } from '../../../shared/api/endpoints';
import Badge from '../../../shared/components/ui/Badge';
import Spinner from '../../../shared/components/ui/Spinner';
import Button from '../../../shared/components/ui/Button';
import { toast } from '../../../shared/store/toast.store';

const STATUS_OPTIONS: { value: BookingStatus | ''; label: string }[] = [
  { value: '', label: 'Всі статуси' },
  { value: 'PENDING', label: 'Очікує' },
  { value: 'CONFIRMED', label: 'Підтверджено' },
  { value: 'IN_PROGRESS', label: 'Виконується' },
  { value: 'COMPLETED', label: 'Завершено' },
  { value: 'CANCELLED', label: 'Скасовано' },
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

export default function AdminBookingsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bookings', status, from, to, page],
    queryFn: () => bookingsApi.getAll({
      status: status || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      limit: 25,
    }).then((r) => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, s }: { id: number; s: BookingStatus }) => bookingsApi.updateStatus(id, s),
    onSuccess: () => { toast('Статус оновлено', 'success'); qc.invalidateQueries({ queryKey: ['admin-bookings'] }); },
    onError: () => toast('Помилка', 'error'),
  });

  const bookings = data?.data ?? [];
  const totalPages = data ? Math.ceil(data.total / 25) : 1;

  const handleExport = () => {
    exportCsv(
      bookings.map((b: Booking) => ({
        id: b.id,
        client: `${b.client.firstName} ${b.client.lastName}`,
        master: `${b.master.user.firstName} ${b.master.user.lastName}`,
        status: b.status,
        scheduledAt: b.scheduledAt,
        totalPrice: b.totalPrice,
      })),
      'bookings.csv',
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Всі записи</h1>
        <Button size="sm" variant="ghost" onClick={handleExport}>Експорт CSV</Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as BookingStatus | ''); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 h-9 text-sm focus:outline-none focus:border-accent"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 h-9 text-sm"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 h-9 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['ID', 'Клієнт', 'Майстер', 'Дата', 'Статус', 'Сума', 'Дії'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b: Booking) => (
                <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-400">#{b.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                    {b.client.firstName} {b.client.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {b.master.user.firstName} {b.master.user.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {new Date(b.scheduledAt).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {' '}
                    {new Date(b.scheduledAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3"><Badge status={b.status} /></td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{b.totalPrice} ₴</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {b.status === 'PENDING' && (
                        <button
                          onClick={() => updateStatus.mutate({ id: b.id, s: 'CONFIRMED' })}
                          className="px-2 py-1 text-xs rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors whitespace-nowrap"
                        >
                          ✅ Підтвердити
                        </button>
                      )}
                      {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                        <button
                          onClick={() => updateStatus.mutate({ id: b.id, s: 'CANCELLED' })}
                          className="px-2 py-1 text-xs rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors whitespace-nowrap"
                        >
                          ❌ Скасувати
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bookings.length === 0 && (
            <p className="text-center text-slate-400 py-8 text-sm">Записів не знайдено</p>
          )}
        </div>
      )}

      {data && data.total > 25 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            ← Назад
          </button>
          <span className="text-sm text-slate-500">Стор. {page} з {totalPages}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            Вперед →
          </button>
        </div>
      )}
    </div>
  );
}
