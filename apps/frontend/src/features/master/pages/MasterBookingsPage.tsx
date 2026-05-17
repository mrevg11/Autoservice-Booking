import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyBookings, useUpdateBookingStatus } from '../../bookings/hooks/useBookings';
import Badge from '../../../shared/components/ui/Badge';
import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';
import EmptyState from '../../../shared/components/ui/EmptyState';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import Pagination from '../../../shared/components/ui/Pagination';
import { toast } from '../../../shared/store/toast.store';
import type { BookingStatus, Booking } from '../../../shared/api/endpoints';

const STATUS_OPTIONS: { value: '' | BookingStatus; label: string }[] = [
  { value: '', label: 'Усі' },
  { value: 'PENDING', label: 'Очікує' },
  { value: 'CONFIRMED', label: 'Підтверджено' },
  { value: 'IN_PROGRESS', label: 'Виконується' },
  { value: 'COMPLETED', label: 'Завершено' },
  { value: 'CANCELLED', label: 'Скасовано' },
];

function nextAction(status: BookingStatus): { label: string; next: BookingStatus } | null {
  if (status === 'PENDING') return { label: 'Підтвердити', next: 'CONFIRMED' };
  if (status === 'CONFIRMED') return { label: 'Розпочати', next: 'IN_PROGRESS' };
  if (status === 'IN_PROGRESS') return { label: 'Завершити', next: 'COMPLETED' };
  return null;
}

export default function MasterBookingsPage() {
  const [statusFilter, setStatusFilter] = useState<'' | BookingStatus>('');
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<{ booking: Booking; next: BookingStatus } | null>(null);

  const updateStatus = useUpdateBookingStatus();

  const { data, isLoading } = useMyBookings({
    status: statusFilter || undefined,
    page,
    limit: 10,
  });

  const handleStatusChange = () => {
    if (!confirmAction) return;
    updateStatus.mutate(
      { id: confirmAction.booking.id, status: confirmAction.next },
      {
        onSuccess: () => { toast('Статус оновлено', 'success'); setConfirmAction(null); },
        onError: () => { toast('Помилка', 'error'); setConfirmAction(null); },
      },
    );
  };

  const totalPages = data ? Math.ceil(data.total / 10) : 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Мої записи</h1>

      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {STATUS_OPTIONS.slice(0, 4).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setStatusFilter(value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${statusFilter === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : data?.data.length === 0 ? (
        <EmptyState title="Записів немає" icon="📅" />
      ) : (
        <div className="space-y-3">
          {data?.data.map((booking) => {
            const action = nextAction(booking.status);
            return (
              <div key={booking.id} className="bg-white rounded-xl shadow-card border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge status={booking.status} />
                      <span className="text-xs text-slate-400">#{booking.id}</span>
                    </div>
                    <p className="font-medium text-sm text-slate-900">
                      {booking.client?.firstName} {booking.client?.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(booking.scheduledAt).toLocaleDateString('uk-UA', {
                        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kiev',
                      })}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {booking.vehicle?.make} {booking.vehicle?.model} · {booking.estimatedDurationMinutes} хв
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="font-semibold text-sm">{booking.totalPrice} грн</p>
                    <div className="flex gap-2">
                      <Link to={`/master/bookings/${booking.id}`}>
                        <Button variant="ghost" size="sm">Деталі</Button>
                      </Link>
                      {action && (
                        <Button
                          size="sm"
                          onClick={() => setConfirmAction({ booking, next: action.next })}
                        >
                          {action.label}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <ConfirmDialog
        isOpen={confirmAction !== null}
        title={`Підтвердити дію?`}
        message={`Змінити статус запису #${confirmAction?.booking.id} на "${confirmAction?.next}"?`}
        onConfirm={handleStatusChange}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
