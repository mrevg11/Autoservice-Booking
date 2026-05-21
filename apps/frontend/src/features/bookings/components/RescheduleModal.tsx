import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mastersApi } from '../../../shared/api/endpoints';
import { useRescheduleBooking } from '../hooks/useBookings';
import DatePicker from '../../../shared/components/ui/DatePicker';
import TimeSlotPicker from '../../../shared/components/ui/TimeSlotPicker';
import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';
import { kyivToUTC, toKyivDisplay } from '../../../shared/utils/date';
import { toast } from '../../../shared/store/toast.store';
import type { Booking } from '../../../shared/api/endpoints';

interface RescheduleModalProps {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RescheduleModal({ booking, onClose, onSuccess }: RescheduleModalProps) {
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState<string | null>(null);

  const masterId = booking.master?.id;
  const vehicleId = booking.vehicle?.id;
  const duration = booking.estimatedDurationMinutes;

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

  const { data: workingDays } = useQuery({
    queryKey: ['working-days', masterId],
    queryFn: () => mastersApi.getWorkingDays(masterId!).then((r) => r.data),
    enabled: !!masterId,
  });

  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ['masterSlots', masterId, date, duration, vehicleId],
    queryFn: () => mastersApi.getSlots(masterId!, date, duration, vehicleId).then((r) => r.data),
    enabled: !!masterId && !!date && duration > 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const rescheduleMutation = useRescheduleBooking();

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = () => {
    if (!date || !slot) {
      toast('Оберіть нову дату та час', 'error');
      return;
    }
    const scheduledAt = kyivToUTC(date, slot);
    rescheduleMutation.mutate(
      { id: booking.id, scheduledAt },
      {
        onSuccess: () => {
          toast('Запис перенесено', 'success');
          onSuccess();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? 'Помилка перенесення';
          toast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        },
      },
    );
  };

  const serviceNames = booking.bookingServices
    ?.map((bs) => bs.service?.name)
    .filter(Boolean)
    .join(', ');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Перенести запис #{booking.id}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {/* Booking details */}
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Деталі запису</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <p className="text-slate-500 text-xs">Поточна дата</p>
              <p className="font-medium text-slate-900">
                {toKyivDisplay(booking.scheduledAt, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Тривалість</p>
              <p className="font-medium text-slate-900">~{duration} хв</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Майстер</p>
              <p className="font-medium text-slate-900">
                {booking.master?.user.firstName} {booking.master?.user.lastName}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Автомобіль</p>
              <p className="font-medium text-slate-900">
                {booking.vehicle?.make} {booking.vehicle?.model} ({booking.vehicle?.year})
              </p>
            </div>
          </div>
          {serviceNames && (
            <div className="mt-2">
              <p className="text-slate-500 text-xs">Послуги</p>
              <p className="font-medium text-slate-900 text-sm">{serviceNames}</p>
            </div>
          )}
        </div>

        {/* Date & time selection */}
        <div className="p-6 space-y-4">
          <p className="text-sm font-semibold text-slate-700">Оберіть нову дату та час</p>

          <DatePicker
            label="Нова дата"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSlot(null);
            }}
            min={today}
            max={maxDate}
            filterDate={(d) => {
              const day = d.getDay();
              return workingDays ? workingDays.includes(day) : day !== 0 && day !== 6;
            }}
          />

          {date && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Вільні слоти:</p>
              {slotsLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : (
                <TimeSlotPicker slots={slots ?? []} value={slot} onChange={setSlot} />
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Скасувати
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            isLoading={rescheduleMutation.isPending}
            disabled={!date || !slot}
          >
            Підтвердити перенесення
          </Button>
        </div>
      </div>
    </div>
  );
}
