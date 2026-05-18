import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useVehicles, useCreateVehicle } from '../../vehicles/hooks/useVehicles';
import { useServices, useCategories } from '../../services/hooks/useServices';
import { useMasterSlots } from '../../masters/hooks/useMasters';
import { useCreateBooking } from '../hooks/useBookings';
import { useEstimateDuration } from '../../intelligence/hooks/useIntelligence';
import { useQuery } from '@tanstack/react-query';
import { mastersApi } from '../../../shared/api/endpoints';
import Button from '../../../shared/components/ui/Button';
import Input from '../../../shared/components/ui/Input';
import DatePicker from '../../../shared/components/ui/DatePicker';
import TimeSlotPicker from '../../../shared/components/ui/TimeSlotPicker';
import Spinner from '../../../shared/components/ui/Spinner';
import { toast } from '../../../shared/store/toast.store';
import type { ServiceItem, Vehicle } from '../../../shared/api/endpoints';
import { kyivToUTC, toKyivDisplay } from '../../../shared/utils/date';

const STEPS = ['Авто', 'Послуги', 'Майстер і час', 'Підтвердження', 'Готово'];

function StepProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className={`flex flex-col items-center`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
              ${i < current ? 'bg-accent border-accent text-white'
                : i === current ? 'bg-white border-accent text-accent'
                : 'bg-white border-slate-300 text-slate-400'}`}
            >
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-xs mt-1 hidden sm:block ${i === current ? 'text-accent font-medium' : 'text-slate-400'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 w-8 sm:w-12 mx-1 ${i < current ? 'bg-accent' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function VehicleForm({ onDone }: { onDone: () => void }) {
  const createVehicle = useCreateVehicle();
  const { register, handleSubmit, formState: { errors } } = useForm<{
    make: string; model: string; year: number; plateNumber: string; vin?: string;
  }>({ mode: 'onChange' });

  return (
    <form onSubmit={handleSubmit((d) => createVehicle.mutate(
      { ...d, year: Number(d.year) },
      { onSuccess: () => onDone() },
    ))} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <h3 className="font-medium text-slate-900 text-sm">Новий автомобіль</h3>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Марка" placeholder="Toyota" error={errors.make?.message} {...register('make', { required: 'Обов\'язково' })} />
        <Input label="Модель" placeholder="Camry" error={errors.model?.message} {...register('model', { required: 'Обов\'язково' })} />
        <Input label="Рік" type="number" placeholder="2020" min={1900} max={new Date().getFullYear()} error={errors.year?.message} {...register('year', { required: 'Обов\'язково', min: { value: 1900, message: 'Не раніше 1900' }, max: { value: new Date().getFullYear(), message: `Не пізніше ${new Date().getFullYear()}` } })} />
        <Input label="Держ. номер" placeholder="АА1234АА" error={errors.plateNumber?.message} {...register('plateNumber', { required: 'Обов\'язково', pattern: { value: /^[A-ZА-ЯІЇЄ]{2}\d{4}[A-ZА-ЯІЇЄ]{2}$/i, message: 'Формат: АА1234АА' } })} />
      </div>
      <Input label="VIN (необов'язково)" placeholder="1HGCM82633..." {...register('vin')} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={createVehicle.isPending}>Додати</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Скасувати</Button>
      </div>
    </form>
  );
}

export default function BookingWizardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showVehicleForm, setShowVehicleForm] = useState(false);

  const prefilledMasterId = searchParams.get('masterId') ? Number(searchParams.get('masterId')) : undefined;
  const prefilledVehicleId = searchParams.get('vehicleId') ? Number(searchParams.get('vehicleId')) : undefined;
  const prefilledScheduledAt = searchParams.get('scheduledAt') ?? ''; // UTC ISO from SmartBooking
  const prefilledDate = searchParams.get('date') ?? '';
  const prefilledSlot = searchParams.get('slot') ?? null;
  const prefilledServiceIdsStr = searchParams.get('serviceIds') ?? '';
  const hasFullSmartBookingParams = !!prefilledMasterId && (!!prefilledScheduledAt || (!!prefilledDate && !!prefilledSlot)) && !!prefilledServiceIdsStr;
  const prefilledStep = hasFullSmartBookingParams ? 3 : 0;

  const [step, setStep] = useState(prefilledStep);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | undefined>();
  const [selectedMasterId, setSelectedMasterId] = useState<number | undefined>(prefilledMasterId);
  const [selectedDate, setSelectedDate] = useState(prefilledDate);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(prefilledSlot);
  const [notes, setNotes] = useState('');
  const [createdBookingId, setCreatedBookingId] = useState<number | null>(null);

  const { data: vehicles, isLoading: vehiclesLoading, isError: vehiclesError, error: vehiclesErr } = useVehicles();
  if (vehiclesErr) console.log('Vehicles fetch error:', vehiclesErr);
  const { data: categories } = useCategories();
  const { data: servicesData, isLoading: servicesLoading } = useServices({
    categoryId: activeCategoryId, isActive: true, limit: 50,
  });
  const selectedServiceIds = selectedServices.map((s) => s.id);
  const { data: mastersData, isLoading: mastersLoading } = useQuery({
    queryKey: ['masters-for-services', selectedServiceIds],
    queryFn: () => selectedServiceIds.length > 0
      ? mastersApi.getForServices(selectedServiceIds).then((r) => r.data)
      : mastersApi.getAll({ limit: 50 }).then((r) => r.data),
    enabled: step === 2,
  });

  const { data: workingDays } = useQuery({
    queryKey: ['working-days', selectedMasterId],
    queryFn: () => mastersApi.getWorkingDays(selectedMasterId!).then((r) => r.data),
    enabled: !!selectedMasterId,
  });

  // Fetch master info individually — needed when arriving from SmartBooking (step starts at 3,
  // mastersData is never loaded because enabled: step === 2 was never true)
  const { data: selectedMasterInfo } = useQuery({
    queryKey: ['master-info', selectedMasterId],
    queryFn: () => mastersApi.getOne(selectedMasterId!).then((r) => r.data),
    enabled: !!selectedMasterId,
  });

  useEffect(() => {
    if (prefilledVehicleId && vehicles && !selectedVehicle) {
      const v = vehicles.find((v) => v.id === prefilledVehicleId);
      if (v) setSelectedVehicle(v);
    }
  }, [vehicles, prefilledVehicleId]);

  useEffect(() => {
    if (!prefilledServiceIdsStr || selectedServices.length > 0 || !servicesData) return;
    const ids = prefilledServiceIdsStr.split(',').map(Number).filter(Boolean);
    const matched = servicesData.data.filter((s) => ids.includes(s.id));
    if (matched.length > 0) setSelectedServices(matched);
  }, [servicesData, prefilledServiceIdsStr]);


  const totalDuration = selectedServices.reduce((s, sv) => s + Number(sv.baseDurationMinutes ?? 0), 0);
  const { data: slots, isLoading: slotsLoading } = useMasterSlots(
    selectedMasterId, selectedDate, totalDuration,
  );

  useEstimateDuration(
    selectedServices[0]?.id,
    selectedMasterId,
    selectedVehicle?.year,
  );

  const createBooking = useCreateBooking();

  const totalPrice = selectedServices.reduce((s, sv) => s + Number(sv.price ?? 0), 0);

  const maxDate = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

  const today = new Date().toISOString().split('T')[0];

  const handleConfirm = () => {
    if (!selectedVehicle) { toast('Оберіть автомобіль', 'error'); setStep(0); return; }
    if (selectedServices.length === 0) { toast('Оберіть послугу', 'error'); setStep(1); return; }
    if (!selectedMasterId) { toast('Оберіть майстра', 'error'); setStep(2); return; }
    if (!prefilledScheduledAt && (!selectedDate || !selectedSlot)) { toast('Оберіть дату та час', 'error'); setStep(2); return; }
    const scheduledAt = prefilledScheduledAt || kyivToUTC(selectedDate, selectedSlot ?? '');
    if (new Date(scheduledAt) < new Date()) {
      toast('Оберіть майбутню дату', 'error');
      return;
    }

    createBooking.mutate(
      {
        masterId: selectedMasterId,
        vehicleId: selectedVehicle.id,
        serviceIds: selectedServices.map((s) => s.id),
        scheduledAt,
        notes: notes || undefined,
      },
      {
        onSuccess: ({ data }) => { setCreatedBookingId(data.id); setStep(4); },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
          console.error('Booking error:', err?.response?.data);
          const msg = err?.response?.data?.message ?? 'Помилка при створенні запису';
          toast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        },
      },
    );
  };

  if (step === 4) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl mb-6" style={{ animation: 'ping 0.5s ease-out' }}>
          ✅
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Запис створено!</h2>
        <p className="text-slate-600 mb-8">
          Запис #{createdBookingId} створено. Очікуйте підтвердження від майстра.
        </p>
        <div className="flex gap-3">
          <Link to="/client/bookings">
            <Button>Мої записи</Button>
          </Link>
          <Link to="/client/dashboard">
            <Button variant="ghost">На головну</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Новий запис</h1>
        <div className="text-sm text-slate-500">{step + 1} / {STEPS.length - 1}</div>
      </div>

      <StepProgress current={step} />

      {/* Step 0: Vehicle */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-900">Оберіть автомобіль</h2>
          {vehiclesLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : vehiclesError ? (
            <p className="text-sm text-red-500 py-4">Не вдалося завантажити автомобілі. Спробуйте оновити сторінку.</p>
          ) : (
            <div className="space-y-2">
              {(vehicles ?? []).map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicle(v)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-colors
                    ${selectedVehicle?.id === v.id ? 'border-accent bg-accent/5' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <p className="font-medium text-slate-900">{v.make} {v.model}</p>
                  <p className="text-sm text-slate-500">{v.year} · {v.plateNumber}</p>
                </button>
              ))}
              {!showVehicleForm && (
                <button
                  onClick={() => setShowVehicleForm(true)}
                  className="w-full text-left p-4 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-accent hover:text-accent transition-colors text-sm"
                >
                  + Додати новий автомобіль
                </button>
              )}
              {showVehicleForm && <VehicleForm onDone={() => setShowVehicleForm(false)} />}
            </div>
          )}
        </div>
      )}

      {/* Step 1: Services */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-900">Оберіть послуги</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategoryId(undefined)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${!activeCategoryId ? 'bg-accent text-white' : 'bg-white border border-slate-300 text-slate-600'}`}
            >
              Усі
            </button>
            {(categories ?? []).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${activeCategoryId === cat.id ? 'bg-accent text-white' : 'bg-white border border-slate-300 text-slate-600'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {servicesLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <div className="space-y-2">
              {(servicesData?.data ?? []).map((service) => {
                const isSelected = selectedServices.some((s) => s.id === service.id);
                return (
                  <button
                    key={service.id}
                    onClick={() =>
                      setSelectedServices((prev) =>
                        isSelected ? prev.filter((s) => s.id !== service.id) : [...prev, service],
                      )
                    }
                    className={`w-full text-left p-4 rounded-xl border-2 transition-colors
                      ${isSelected ? 'border-accent bg-accent/5' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{service.name}</p>
                        <p className="text-xs text-slate-500">{service.category.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-900 text-sm">{Number(service.price ?? 0).toFixed(0)} грн</p>
                        <p className="text-xs text-slate-500">{service.baseDurationMinutes} хв</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedServices.length > 0 && (
            <div className="bg-brand text-white rounded-xl p-4 text-sm flex items-center justify-between">
              <span>Обрано: {selectedServices.length} послуг</span>
              <span>{totalDuration} хв · {totalPrice.toFixed(2)} грн</span>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Master & time */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-900">Оберіть майстра та час</h2>
          <div className="text-right">
            <Link to="/client/bookings/smart" className="text-sm text-accent hover:underline">
              🤖 Або використати розумний підбір →
            </Link>
          </div>

          {mastersLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : !mastersLoading && (mastersData?.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-xl border border-slate-200">
              Немає майстрів що виконують усі обрані послуги. Спробуйте обрати інші послуги або зменшити їх кількість.
            </p>
          ) : (
            <div className="space-y-2">
              {(mastersData?.data ?? []).map((master) => (
                <button
                  key={master.id}
                  onClick={() => { setSelectedMasterId(master.id); setSelectedSlot(null); }}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-colors
                    ${selectedMasterId === master.id ? 'border-accent bg-accent/5' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center text-sm font-bold text-brand">
                      {master.user.firstName[0]}{master.user.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-900">{master.user.firstName} {master.user.lastName}</p>
                      <p className="text-xs text-slate-500">⭐ {Number(master.rating ?? 0).toFixed(1)} · {master.experienceYears} р. досвіду</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedMasterId && (
            <div className="space-y-3">
              <DatePicker
                label="Дата"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null); }}
                min={today}
                max={maxDate}
                filterDate={(date) => {
                  const day = date.getDay();
                  return workingDays ? workingDays.includes(day) : (day !== 0 && day !== 6);
                }}
              />
              {selectedDate && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Вільні слоти:</p>
                  {slotsLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <TimeSlotPicker
                      slots={slots ?? []}
                      value={selectedSlot}
                      onChange={setSelectedSlot}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-900">Підтвердження запису</h2>
          <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Автомобіль</span>
              <span className="font-medium">{selectedVehicle?.make} {selectedVehicle?.model} ({selectedVehicle?.year})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Послуги</span>
              <span className="font-medium text-right max-w-xs">{selectedServices.map((s) => s.name).join(', ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Майстер</span>
              <span className="font-medium">
                {(() => {
                  const fromList = mastersData?.data.find((m) => m.id === selectedMasterId);
                  const master = fromList ?? selectedMasterInfo;
                  return `${master?.user?.firstName ?? ''} ${master?.user?.lastName ?? ''}`.trim() || '—';
                })()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Дата та час</span>
              <span className="font-medium">
                {prefilledScheduledAt
                  ? toKyivDisplay(prefilledScheduledAt, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
                  : (selectedDate && selectedSlot
                      ? (() => {
                          const [y, m, d] = selectedDate.split('-').map(Number);
                          const dateLabel = new Date(Date.UTC(y, m - 1, d))
                            .toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', timeZone: 'UTC' });
                          return `${dateLabel} о ${selectedSlot}`;
                        })()
                      : '—')}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-3 space-y-1">
              <div className="flex justify-between text-slate-600 text-sm">
                <span>Тривалість</span>
                <span>{totalDuration > 0 ? `${totalDuration} хв` : '—'}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Загальна сума</span>
                <span className="text-accent">{totalPrice > 0 ? `${totalPrice.toFixed(2)} грн` : '0.00 грн'}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Нотатки (необов'язково)</label>
            <textarea
              value={notes}
              onChange={(e) => { if (e.target.value.length <= 300) setNotes(e.target.value); }}
              maxLength={300}
              placeholder="Особливі побажання або питання..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="flex justify-end text-xs text-slate-400 mt-1">
              {notes.length}/300
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button
          variant="ghost"
          onClick={() => { try { step > 0 ? setStep(step - 1) : navigate(-1); } catch { navigate(-1); } }}
        >
          ← Назад
        </Button>

        {step < 3 ? (
          <Button
            disabled={
              (step === 0 && !selectedVehicle) ||
              (step === 1 && selectedServices.length === 0) ||
              (step === 2 && (!selectedMasterId || !selectedSlot))
            }
            onClick={() => setStep(step + 1)}
          >
            Далі →
          </Button>
        ) : (
          <Button onClick={handleConfirm} isLoading={createBooking.isPending}>
            Підтвердити запис
          </Button>
        )}
      </div>
    </div>
  );
}
