import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useBooking, useBookingHistory, useCancelBooking, useRescheduleBooking } from '../hooks/useBookings';
import { useReviewForBooking, useCreateReview } from '../../reviews/hooks/useReviews';
import BookingPhotosSection from '../components/BookingPhotosSection';
import Badge from '../../../shared/components/ui/Badge';
import Spinner from '../../../shared/components/ui/Spinner';
import StarRating from '../../../shared/components/ui/StarRating';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import DatePicker from '../../../shared/components/ui/DatePicker';
import Button from '../../../shared/components/ui/Button';
import { toast } from '../../../shared/store/toast.store';
import { useAuthStore } from '../../../shared/store/auth.store';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Очікує',
  CONFIRMED: 'Підтверджено',
  IN_PROGRESS: 'В роботі',
  COMPLETED: 'Завершено',
  CANCELLED: 'Скасовано',
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bookingId = Number(id);
  const { data: booking, isLoading } = useBooking(bookingId);
  const { data: history } = useBookingHistory(bookingId);
  const { data: existingReview } = useReviewForBooking(bookingId);
  const cancelMutation = useCancelBooking();
  const rescheduleMutation = useRescheduleBooking();
  const createReview = useCreateReview();

  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const [showCancel, setShowCancel] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  if (!booking) {
    return <div className="text-center py-16 text-slate-500">Запис не знайдено</div>;
  }

  const canCancel =
    ['PENDING', 'CONFIRMED'].includes(booking.status) &&
    new Date(booking.scheduledAt).getTime() - Date.now() > 2 * 60 * 60 * 1000;

  const canReview = booking.status === 'COMPLETED' && !existingReview;

  const handleCancel = () => {
    cancelMutation.mutate(bookingId, {
      onSuccess: () => {
        toast('Запис скасовано', 'success');
        setShowCancel(false);
        navigate('/client/bookings');
      },
      onError: () => toast('Помилка скасування', 'error'),
    });
  };

  const handleReschedule = () => {
    if (!newDate || !newTime) {
      toast('Оберіть нову дату та час', 'error');
      return;
    }
    const scheduledAt = new Date(`${newDate}T${newTime}:00`).toISOString();
    rescheduleMutation.mutate(
      { id: bookingId, scheduledAt },
      {
        onSuccess: () => {
          toast('Запис перенесено', 'success');
          setShowReschedule(false);
          setNewDate('');
          setNewTime('');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? 'Помилка перенесення';
          toast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        },
      },
    );
  };

  const handleReview = () => {
    createReview.mutate(
      { bookingId, rating: reviewRating, comment: reviewComment || undefined },
      {
        onSuccess: () => toast('Відгук додано!', 'success'),
        onError: () => toast('Помилка збереження відгуку', 'error'),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/client/bookings" className="text-sm text-accent hover:underline">← Мої записи</Link>
        <span className="text-slate-300">|</span>
        <h1 className="text-xl font-bold text-slate-900">Запис #{booking.id}</h1>
        <Badge status={booking.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Деталі запису</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-slate-500">Дата та час</p>
                <p className="font-medium">{new Date(booking.scheduledAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kiev' })}</p>
              </div>
              <div><p className="text-slate-500">Орієнтовна тривалість</p>
                <p className="font-medium">~{booking.estimatedDurationMinutes} хв</p>
              </div>
              <div><p className="text-slate-500">Автомобіль</p>
                <p className="font-medium">{booking.vehicle?.make} {booking.vehicle?.model} ({booking.vehicle?.year})</p>
              </div>
              <div><p className="text-slate-500">Сума</p>
                <p className="font-semibold text-accent">{booking.totalPrice} грн</p>
              </div>
            </div>
            {booking.notes && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-slate-500 text-xs mb-1">Нотатки</p>
                <p className="text-sm text-slate-700">{booking.notes}</p>
              </div>
            )}
          </div>

          {/* Services */}
          <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Послуги</h2>
            <div className="space-y-2">
              {booking.bookingServices?.map((bs) => (
                <div key={bs.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{bs.service?.name ?? '—'}</span>
                  <div className="flex gap-4 text-slate-500">
                    <span>{bs.service?.baseDurationMinutes ? `${bs.service.baseDurationMinutes} хв` : '—'}</span>
                    <span className="font-medium text-slate-900">{Number(bs.actualPrice ?? 0).toFixed(2)} грн</span>
                  </div>
                </div>
              ))}
              {(booking.bookingServices?.length ?? 0) > 0 && (() => {
                const baseDuration = booking.bookingServices.reduce(
                  (s, bs) => s + (bs.service?.baseDurationMinutes ?? 0), 0,
                );
                const adjusted = booking.estimatedDurationMinutes !== baseDuration;
                return (
                  <div className="pt-2 mt-1 border-t border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span className="text-slate-700">Разом</span>
                      <div className="flex gap-4">
                        <span className="text-slate-600">~{booking.estimatedDurationMinutes} хв</span>
                        <span className="text-accent">{booking.totalPrice} грн</span>
                      </div>
                    </div>
                    {adjusted && (
                      <p className="text-xs text-slate-400 text-right">
                        базова {baseDuration} хв — скориговано за характеристиками авто та сезоном
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Photos */}
          <BookingPhotosSection bookingId={bookingId} currentUserId={currentUser?.id} />

          {/* Status timeline */}
          {history && history.length > 0 && (
            <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Хронологія статусів</h2>
              <div className="relative pl-4">
                <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-slate-200" />
                {history.map((h) => (
                  <div key={h.id} className="relative mb-3 last:mb-0">
                    <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-accent border-2 border-white" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-900">{STATUS_LABELS[h.newStatus] ?? h.newStatus}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(h.changedAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kiev' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review form */}
          {canReview && (
            <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
              <h2 className="font-semibold text-slate-900 mb-3">Залишити відгук</h2>
              <div className="space-y-3">
                <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Ваш коментар (необов'язково)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <Button onClick={handleReview} isLoading={createReview.isPending}>
                  Надіслати відгук
                </Button>
              </div>
            </div>
          )}

          {existingReview && (
            <div className="bg-green-50 rounded-xl border border-green-200 p-4">
              <p className="text-sm text-green-700 font-medium">Ви вже залишили відгук</p>
              <StarRating value={existingReview.rating} readonly size="sm" />
              {existingReview.comment && <p className="text-sm text-green-600 mt-1">{existingReview.comment}</p>}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Майстер</h2>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white text-sm font-bold">
                {booking.master?.user.firstName[0]}{booking.master?.user.lastName[0]}
              </div>
              <div>
                <p className="font-medium text-sm">{booking.master?.user.firstName} {booking.master?.user.lastName}</p>
                <p className="text-xs text-slate-500">⭐ {Number(booking.master?.rating ?? 0).toFixed(1)}</p>
              </div>
            </div>
            {booking.master?.specialization && (
              <p className="text-xs text-slate-500">{booking.master.specialization}</p>
            )}
          </div>

          {canCancel && (
            <div className="space-y-2">
              <Button variant="ghost" className="w-full" onClick={() => setShowReschedule(!showReschedule)}>
                {showReschedule ? 'Скасувати перенесення' : 'Перенести запис'}
              </Button>
              {showReschedule && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                  <p className="text-sm font-medium text-slate-700">Нова дата та час</p>
                  <DatePicker
                    placeholder="Оберіть дату"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    min={new Date().toLocaleDateString('en-CA')}
                  />
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleReschedule}
                    isLoading={rescheduleMutation.isPending}
                    disabled={!newDate || !newTime}
                  >
                    Підтвердити перенесення
                  </Button>
                </div>
              )}
              <Button variant="danger" className="w-full" onClick={() => setShowCancel(true)}>
                Скасувати запис
              </Button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showCancel}
        title="Скасувати запис?"
        message="Ви впевнені? Цю дію не можна відмінити."
        onConfirm={handleCancel}
        onCancel={() => setShowCancel(false)}
        confirmLabel="Так, скасувати"
        isDanger
      />
    </div>
  );
}
