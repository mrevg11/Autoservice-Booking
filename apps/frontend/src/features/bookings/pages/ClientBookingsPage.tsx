import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyBookings, useCancelBooking } from '../hooks/useBookings';
import Badge from '../../../shared/components/ui/Badge';
import Spinner from '../../../shared/components/ui/Spinner';
import EmptyState from '../../../shared/components/ui/EmptyState';
import Pagination from '../../../shared/components/ui/Pagination';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import Button from '../../../shared/components/ui/Button';
import { toast } from '../../../shared/store/toast.store';
import type { BookingStatus, Booking } from '../../../shared/api/endpoints';

const TABS: { key: BookingStatus | 'active'; label: string }[] = [
  { key: 'active', label: 'Активні' },
  { key: 'COMPLETED', label: 'Завершені' },
  { key: 'CANCELLED', label: 'Скасовані' },
];

const ACTIVE_STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'];

function canCancel(booking: Booking): boolean {
  if (!['PENDING', 'CONFIRMED'].includes(booking.status)) return false;
  const diff = new Date(booking.scheduledAt).getTime() - Date.now();
  return diff > 2 * 60 * 60 * 1000;
}

export default function ClientBookingsPage() {
  const [activeTab, setActiveTab] = useState<'active' | BookingStatus>('active');
  const [page, setPage] = useState(1);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const cancelMutation = useCancelBooking();

  const statusFilter = activeTab === 'active' ? undefined : activeTab as BookingStatus;

  const { data, isLoading } = useMyBookings({
    page,
    limit: 10,
    status: statusFilter,
  });

  const bookings = activeTab === 'active'
    ? (data?.data ?? []).filter((b) => ACTIVE_STATUSES.includes(b.status))
    : (data?.data ?? []);

  const totalPages = data ? Math.ceil(data.total / 10) : 1;

  const handleCancel = () => {
    if (!cancelId) return;
    cancelMutation.mutate(cancelId, {
      onSuccess: () => { toast('Запис скасовано', 'success'); setCancelId(null); },
      onError: () => { toast('Помилка скасування', 'error'); setCancelId(null); },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Мої записи</h1>
        <Link to="/client/bookings/new">
          <Button size="sm">+ Новий запис</Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key as 'active' | BookingStatus); setPage(1); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${activeTab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : bookings.length === 0 ? (
        <EmptyState
          title="Записів немає"
          description="Запишіться на послугу прямо зараз"
          icon="📅"
          action={<Link to="/client/bookings/new"><Button size="sm">Записатися</Button></Link>}
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-xl shadow-card border border-slate-100 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge status={booking.status} />
                    <span className="text-xs text-slate-500">#{booking.id}</span>
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    {booking.master?.user.firstName} {booking.master?.user.lastName}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {new Date(booking.scheduledAt).toLocaleDateString('uk-UA', {
                      day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kiev',
                    })}
                  </div>
                  {booking.bookingServices?.length > 0 && (
                    <div className="text-xs text-slate-500 mt-1">
                      {booking.bookingServices.map((bs) => bs.service.name).join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-semibold text-slate-900">{booking.totalPrice} грн</span>
                  <div className="flex gap-2">
                    <Link to={`/client/bookings/${booking.id}`}>
                      <Button variant="ghost" size="sm">Деталі</Button>
                    </Link>
                    {canCancel(booking) && (
                      <Button variant="danger" size="sm" onClick={() => setCancelId(booking.id)}>
                        Скасувати
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <ConfirmDialog
        isOpen={cancelId !== null}
        title="Скасувати запис?"
        message="Ви впевнені, що хочете скасувати цей запис?"
        onConfirm={handleCancel}
        onCancel={() => setCancelId(null)}
        confirmLabel="Так, скасувати"
        isDanger
      />
    </div>
  );
}
