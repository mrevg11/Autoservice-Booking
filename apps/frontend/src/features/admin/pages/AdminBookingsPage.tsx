import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi, type BookingStatus, type Booking } from '../../../shared/api/endpoints';
import Badge from '../../../shared/components/ui/Badge';
import Spinner from '../../../shared/components/ui/Spinner';
import Button from '../../../shared/components/ui/Button';
import DatePicker from '../../../shared/components/ui/DatePicker';
import { toast } from '../../../shared/store/toast.store';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Очікує', CONFIRMED: 'Підтверджено', IN_PROGRESS: 'Виконується',
  COMPLETED: 'Завершено', CANCELLED: 'Скасовано',
};

function BookingDetailModal({ bookingId, onClose }: { bookingId: number; onClose: () => void }) {
  const { data: booking, isLoading } = useQuery({
    queryKey: ['admin-booking-detail', bookingId],
    queryFn: () => bookingsApi.getOne(bookingId).then((r) => r.data),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Деталі запису #{bookingId}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        {isLoading ? <div className="flex justify-center py-8"><Spinner /></div> : booking ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-slate-500 text-xs">Клієнт</p><p className="font-medium">{booking.client?.firstName} {booking.client?.lastName}</p></div>
              <div><p className="text-slate-500 text-xs">Email</p><p className="font-medium">{booking.client?.email}</p></div>
              <div><p className="text-slate-500 text-xs">Майстер</p><p className="font-medium">{booking.master?.user.firstName} {booking.master?.user.lastName}</p></div>
              <div><p className="text-slate-500 text-xs">Статус</p><p className="font-medium">{STATUS_LABELS[booking.status] ?? booking.status}</p></div>
              <div><p className="text-slate-500 text-xs">Дата та час</p><p className="font-medium">{new Date(booking.scheduledAt).toLocaleString('uk-UA', { timeZone: 'Europe/Kiev', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p></div>
              <div><p className="text-slate-500 text-xs">Орієнт. тривалість</p><p className="font-medium">~{booking.estimatedDurationMinutes} хв</p></div>
              {booking.vehicle && (
                <div className="col-span-2"><p className="text-slate-500 text-xs">Автомобіль</p><p className="font-medium">{booking.vehicle.make} {booking.vehicle.model} ({booking.vehicle.year}) — {booking.vehicle.plateNumber}</p></div>
              )}
            </div>
            {booking.bookingServices?.length > 0 && (
              <div>
                <p className="text-slate-500 text-xs mb-1">Послуги</p>
                <div className="space-y-1">
                  {booking.bookingServices.map((bs) => (
                    <div key={bs.id} className="flex justify-between bg-slate-50 rounded px-3 py-1.5">
                      <span>{bs.service.name}</span>
                      <span className="font-medium">{Number(bs.actualPrice ?? 0).toFixed(2)} грн</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold pt-1 border-t border-slate-100 px-3">
                    <span>Разом</span><span>{booking.totalPrice} грн</span>
                  </div>
                </div>
              </div>
            )}
            {booking.notes && (
              <div><p className="text-slate-500 text-xs">Нотатки</p><p className="bg-slate-50 rounded px-3 py-2">{booking.notes}</p></div>
            )}
          </div>
        ) : <p className="text-center text-slate-400 py-4">Не знайдено</p>}
        <div className="mt-4 flex justify-end">
          <Button size="sm" variant="ghost" onClick={onClose}>Закрити</Button>
        </div>
      </div>
    </div>
  );
}

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
  const [detailBookingId, setDetailBookingId] = useState<number | null>(null);

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

  const forceDelete = useMutation({
    mutationFn: (id: number) => bookingsApi.forceDelete(id),
    onSuccess: () => { toast('Запис видалено', 'success'); qc.invalidateQueries({ queryKey: ['admin-bookings'] }); },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (e: any) => toast(e?.response?.data?.message ?? 'Помилка видалення', 'error'),
  });

  const handleForceDelete = (id: number) => {
    if (!confirm(`Повністю видалити запис #${id} з бази? Цю дію не можна відмінити.`)) return;
    forceDelete.mutate(id);
  };

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
        <DatePicker
          placeholder="Від дд.мм.рррр"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          max={to || undefined}
        />
        <DatePicker
          placeholder="До дд.мм.рррр"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
          min={from || undefined}
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
                    {new Date(b.scheduledAt).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Kiev' })}
                    {' '}
                    {new Date(b.scheduledAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kiev' })}
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
                      <button
                        onClick={() => setDetailBookingId(b.id)}
                        className="px-2 py-1 text-xs rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors whitespace-nowrap"
                      >
                        🔍 Деталі
                      </button>
                      <button
                        onClick={() => handleForceDelete(b.id)}
                        className="px-2 py-1 text-xs rounded-lg bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-700 transition-colors whitespace-nowrap"
                      >
                        🗑 Видалити
                      </button>
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

      {detailBookingId && (
        <BookingDetailModal bookingId={detailBookingId} onClose={() => setDetailBookingId(null)} />
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
