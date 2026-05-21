import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '../../../shared/store/auth.store';
import BookingPhotosSection from '../components/BookingPhotosSection';
import { useVehicles, useCreateVehicle } from '../../vehicles/hooks/useVehicles';
import { getMakes, getModels, getYears } from '../../../shared/data/carData';
import { useServices, useCategories } from '../../services/hooks/useServices';
import { useMasterSlots } from '../../masters/hooks/useMasters';
import { useCreateBooking } from '../hooks/useBookings';
import { useEstimateDurationMulti } from '../../intelligence/hooks/useIntelligence';
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

const DRAFT_KEY = 'booking_wizard_draft';

interface WizardDraft {
  vehicleId: number | null;
  serviceIds: number[];
  masterId: number | undefined;
  date: string;
  slot: string | null;
  notes: string;
  step: number;
}

function loadDraft(): WizardDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as WizardDraft) : null;
  } catch {
    return null;
  }
}

function saveDraft(draft: WizardDraft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // sessionStorage quota exceeded — fail silently
  }
}

function clearDraft(): void {
  sessionStorage.removeItem(DRAFT_KEY);
}

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

const selectCls = (hasError: boolean) =>
  `w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/40 ${
    hasError ? 'border-red-400' : 'border-slate-300'
  }`;

function VehicleForm({ onDone }: { onDone: () => void }) {
  const createVehicle = useCreateVehicle();
  const { control, register, handleSubmit, setValue, formState: { errors } } = useForm<{
    make: string; model: string; year: number | ''; plateNumber: string; vin?: string;
  }>({ mode: 'onChange' });

  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const makes = getMakes();
  const models = selectedMake ? getModels(selectedMake) : [];
  const years = selectedMake && selectedModel ? getYears(selectedMake, selectedModel) : [];

  const handleMakeChange = (make: string) => {
    setSelectedMake(make);
    setSelectedModel('');
    setValue('make', make, { shouldValidate: true });
    setValue('model', '', { shouldValidate: false });
    setValue('year', '', { shouldValidate: false });
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    setValue('model', model, { shouldValidate: true });
    setValue('year', '', { shouldValidate: false });
  };

  return (
    <form onSubmit={handleSubmit((d) => createVehicle.mutate(
      { ...d, year: Number(d.year) },
      {
        onSuccess: () => onDone(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? 'Помилка додавання авто';
          toast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        },
      },
    ))} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <h3 className="font-medium text-slate-900 text-sm">Новий автомобіль</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Марка</label>
          <Controller name="make" control={control} rules={{ required: "Обов'язково" }} render={({ field }) => (
            <select value={field.value ?? ''} onChange={(e) => handleMakeChange(e.target.value)} className={selectCls(!!errors.make)}>
              <option value="">Оберіть марку</option>
              {makes.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )} />
          {errors.make && <p className="text-xs text-red-500">{errors.make.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Модель</label>
          <Controller name="model" control={control} rules={{ required: "Обов'язково" }} render={({ field }) => (
            <select value={field.value ?? ''} onChange={(e) => handleModelChange(e.target.value)} disabled={!selectedMake} className={selectCls(!!errors.model) + (!selectedMake ? ' opacity-50 cursor-not-allowed' : '')}>
              <option value="">{selectedMake ? 'Оберіть модель' : 'Спочатку марку'}</option>
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )} />
          {errors.model && <p className="text-xs text-red-500">{errors.model.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Рік</label>
          <Controller name="year" control={control} rules={{ required: "Обов'язково" }} render={({ field }) => (
            <select value={field.value ? String(field.value) : ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : '')} disabled={!selectedModel} className={selectCls(!!errors.year) + (!selectedModel ? ' opacity-50 cursor-not-allowed' : '')}>
              <option value="">{selectedModel ? 'Оберіть рік' : 'Спочатку модель'}</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          )} />
          {errors.year && <p className="text-xs text-red-500">{errors.year.message}</p>}
        </div>
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

  // Restore draft only for the manual wizard flow (not when coming from SmartBooking with full params)
  const draft = hasFullSmartBookingParams ? null : loadDraft();

  const [step, setStep] = useState(draft?.step ?? prefilledStep);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | undefined>();
  const [selectedMasterId, setSelectedMasterId] = useState<number | undefined>(prefilledMasterId ?? draft?.masterId);
  const [selectedDate, setSelectedDate] = useState(prefilledDate || draft?.date || '');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(prefilledSlot ?? draft?.slot ?? null);
  const [notes, setNotes] = useState(draft?.notes ?? '');
  const [createdBookingId, setCreatedBookingId] = useState<number | null>(null);

  const { data: vehicles, isLoading: vehiclesLoading, isError: vehiclesError } = useVehicles();
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
      return;
    }
    // Restore vehicle from draft
    if (!hasFullSmartBookingParams && draft?.vehicleId && vehicles && !selectedVehicle) {
      const v = vehicles.find((v) => v.id === draft.vehicleId);
      if (v) setSelectedVehicle(v);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles]);

  useEffect(() => {
    if (!prefilledServiceIdsStr || selectedServices.length > 0 || !servicesData) return;
    const ids = prefilledServiceIdsStr.split(',').map(Number).filter(Boolean);
    const matched = servicesData.data.filter((s) => ids.includes(s.id));
    if (matched.length > 0) setSelectedServices(matched);
  }, [servicesData, prefilledServiceIdsStr]);

  // Restore services from draft (manual wizard only)
  useEffect(() => {
    if (hasFullSmartBookingParams || prefilledServiceIdsStr || !draft?.serviceIds.length || selectedServices.length > 0 || !servicesData) return;
    const matched = servicesData.data.filter((s) => draft.serviceIds.includes(s.id));
    if (matched.length > 0) setSelectedServices(matched);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicesData]);

  // Persist wizard state to sessionStorage after each meaningful change
  useEffect(() => {
    if (hasFullSmartBookingParams || createdBookingId) return;
    saveDraft({
      vehicleId: selectedVehicle?.id ?? null,
      serviceIds: selectedServices.map((s) => s.id),
      masterId: selectedMasterId,
      date: selectedDate,
      slot: selectedSlot,
      notes,
      step,
    });
  }, [selectedVehicle, selectedServices, selectedMasterId, selectedDate, selectedSlot, notes, step]);


  const baseDuration = selectedServices.reduce((s, sv) => s + Number(sv.baseDurationMinutes ?? 0), 0);

  const { data: durationEstimate } = useEstimateDurationMulti(
    selectedServiceIds,
    selectedMasterId,
    selectedVehicle?.year,
  );
  // Use model-estimated duration for slot availability; fall back to base sum while loading
  const totalDuration = durationEstimate?.totalEstimatedMinutes ?? baseDuration;

  const { data: slots, isLoading: slotsLoading } = useMasterSlots(
    selectedMasterId, selectedDate, totalDuration, selectedVehicle?.id,
  );

  const createBooking = useCreateBooking();

  const totalPrice = selectedServices.reduce((s, sv) => s + Number(sv.basePrice ?? 0), 0);

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
        estimatedDurationMinutes: totalDuration > 0 ? totalDuration : undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: ({ data }) => { clearDraft(); setCreatedBookingId(data.id); setStep(4); },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? 'Помилка при створенні запису';
          toast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        },
      },
    );
  };

  if (step === 4) {
    const currentUser = useAuthStore.getState().user;
    return (
      <div className="space-y-8 max-w-2xl mx-auto py-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl mb-6">
            ✅
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Запис створено!</h2>
          <p className="text-slate-600">
            Запис #{createdBookingId} створено. Очікуйте підтвердження від майстра.
          </p>
        </div>

        {createdBookingId && (
          <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
            <p className="text-sm font-medium text-slate-700 mb-4">
              Додайте фото автомобіля або опис проблеми — це допоможе майстру підготуватися заздалегідь
            </p>
            <BookingPhotosSection
              bookingId={createdBookingId}
              currentUserId={currentUser?.id}
            />
          </div>
        )}

        <div className="flex gap-3 justify-center">
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
                        <p className="font-medium text-slate-900 text-sm">{Number(service.basePrice ?? 0).toLocaleString('uk-UA')} грн</p>
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
              <div className="text-right">
                <span>~{totalDuration} хв · {totalPrice.toLocaleString('uk-UA')} грн</span>
                {durationEstimate && durationEstimate.totalEstimatedMinutes !== durationEstimate.totalBaseMinutes && (
                  <p className="text-xs text-white/70 mt-0.5">базова: {durationEstimate.totalBaseMinutes} хв</p>
                )}
              </div>
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
                <span>Тривалість (розрахункова)</span>
                <div className="text-right">
                  <span className="font-medium text-slate-900">{totalDuration > 0 ? `~${totalDuration} хв` : '—'}</span>
                  {durationEstimate && durationEstimate.totalEstimatedMinutes !== durationEstimate.totalBaseMinutes && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {(() => {
                        const reasons: string[] = [];
                        if (durationEstimate.vehicleAgeCoeff > 1) reasons.push('вік авто');
                        if (durationEstimate.seasonCoeff > 1) reasons.push('зимовий сезон');
                        if (durationEstimate.masterCoeff !== 1) reasons.push('кваліфікація майстра');
                        return `~${durationEstimate.totalBaseMinutes} хв базова${reasons.length ? ` · збільшено через: ${reasons.join(', ')}` : ''}`;
                      })()}
                    </p>
                  )}
                </div>
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
