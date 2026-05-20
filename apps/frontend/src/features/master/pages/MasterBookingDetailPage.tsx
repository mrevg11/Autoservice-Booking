import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useBooking, useBookingHistory, useUpdateBookingStatus } from '../../bookings/hooks/useBookings';
import BookingPhotosSection from '../../bookings/components/BookingPhotosSection';
import Badge from '../../../shared/components/ui/Badge';
import Spinner from '../../../shared/components/ui/Spinner';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import Button from '../../../shared/components/ui/Button';
import { toast } from '../../../shared/store/toast.store';
import { useAuthStore } from '../../../shared/store/auth.store';
import type { BookingStatus } from '../../../shared/api/endpoints';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Очікує',
  CONFIRMED: 'Підтверджено',
  IN_PROGRESS: 'В роботі',
  COMPLETED: 'Завершено',
  CANCELLED: 'Скасовано',
};

function nextAction(status: BookingStatus): { label: string; next: BookingStatus } | null {
  if (status === 'PENDING') return { label: 'Підтвердити запис', next: 'CONFIRMED' };
  if (status === 'CONFIRMED') return { label: 'Розпочати роботу', next: 'IN_PROGRESS' };
  if (status === 'IN_PROGRESS') return { label: 'Завершити', next: 'COMPLETED' };
  return null;
}

export default function MasterBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bookingId = Number(id);
  const { data: booking, isLoading } = useBooking(bookingId);
  const { data: history } = useBookingHistory(bookingId);
  const updateStatus = useUpdateBookingStatus();
  const currentUser = useAuthStore((s) => s.user);
  const [confirmNext, setConfirmNext] = useState<BookingStatus | null>(null);

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (!booking) return <div className="text-center py-16 text-slate-500">Запис не знайдено</div>;

  const action = nextAction(booking.status);

  const handleStatusChange = () => {
    if (!confirmNext) return;
    updateStatus.mutate(
      { id: bookingId, status: confirmNext },
      {
        onSuccess: () => { toast('Статус оновлено', 'success'); setConfirmNext(null); },
        onError: () => { toast('Помилка', 'error'); setConfirmNext(null); },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/master/bookings" className="text-sm text-accent hover:underline">← Мої записи</Link>
        <span className="text-slate-300">|</span>
        <h1 className="text-xl font-bold text-slate-900">Запис #{booking.id}</h1>
        <Badge status={booking.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Main info */}
          <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Деталі</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-slate-500">Клієнт</p>
                <p className="font-medium">{booking.client?.firstName} {booking.client?.lastName}</p>
              </div>
              <div><p className="text-slate-500">Дата та час</p>
                <p className="font-medium">{new Date(booking.scheduledAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kiev' })}</p>
              </div>
              <div><p className="text-slate-500">Автомобіль</p>
                <p className="font-medium">{booking.vehicle?.make} {booking.vehicle?.model} ({booking.vehicle?.year})</p>
              </div>
              <div><p className="text-slate-500">Орієнтовна тривалість</p>
                <p className="font-medium">~{booking.estimatedDurationMinutes} хв</p>
              </div>
              {booking.vehicle?.plateNumber && (
                <div><p className="text-slate-500">Держ. номер</p>
                  <p className="font-medium">{booking.vehicle.plateNumber}</p>
                </div>
              )}
            </div>
            {booking.notes && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">Нотатки клієнта</p>
                <p className="text-sm text-slate-700 mt-1">{booking.notes}</p>
              </div>
            )}
          </div>

          {/* Services */}
          <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Послуги</h2>
            <div className="space-y-2">
              {booking.bookingServices?.map((bs) => (
                <div key={bs.id} className="flex items-center justify-between text-sm">
                  <span>{bs.service.name}</span>
                  <div className="flex gap-4 text-slate-500">
                    <span>{bs.service?.baseDurationMinutes ? `${bs.service.baseDurationMinutes} хв` : '—'}</span>
                    <span className="font-medium text-slate-900">{Number(bs.actualPrice ?? 0).toFixed(2)} грн</span>
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-2 flex justify-between font-semibold text-sm">
                <span>Загалом</span>
                <div className="flex gap-4 items-center">
                  <span className="text-slate-500 font-normal">~{booking.estimatedDurationMinutes} хв</span>
                  <span>{booking.totalPrice} грн</span>
                </div>
              </div>
            </div>
          </div>

          {/* Photos */}
          <BookingPhotosSection bookingId={bookingId} currentUserId={currentUser?.id} />

          {/* Timeline */}
          {history && history.length > 0 && (
            <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Хронологія</h2>
              <div className="relative pl-4">
                <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-slate-200" />
                {history.map((h) => (
                  <div key={h.id} className="relative mb-3">
                    <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-accent border-2 border-white" />
                    <div className="ml-3">
                      <p className="text-sm font-medium">{STATUS_LABELS[h.newStatus] ?? h.newStatus}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(h.changedAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kiev' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions sidebar */}
        <div className="space-y-4">
          {action && (
            <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
              <h2 className="font-semibold text-slate-900 mb-3">Дії</h2>
              <Button className="w-full" onClick={() => setConfirmNext(action.next)}>
                {action.label}
              </Button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmNext !== null}
        title="Підтвердити дію?"
        message={`Змінити статус на "${STATUS_LABELS[confirmNext ?? ''] ?? confirmNext}"?`}
        onConfirm={handleStatusChange}
        onCancel={() => setConfirmNext(null)}
      />
    </div>
  );
}
