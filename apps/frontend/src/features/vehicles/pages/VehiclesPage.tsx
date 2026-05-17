import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle } from '../hooks/useVehicles';
import Button from '../../../shared/components/ui/Button';
import Input from '../../../shared/components/ui/Input';
import Spinner from '../../../shared/components/ui/Spinner';
import EmptyState from '../../../shared/components/ui/EmptyState';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import { toast } from '../../../shared/store/toast.store';
import type { Vehicle, CreateVehiclePayload } from '../../../shared/api/endpoints';
import { getMakes, getModels, getYears } from '../../../shared/data/carData';

const selectCls = (hasError: boolean) =>
  `w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/40 ${
    hasError ? 'border-red-400' : 'border-slate-300'
  }`;

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: (string | number)[];
  placeholder: string;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={selectCls(!!error) + (disabled ? ' opacity-50 cursor-not-allowed' : '')}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={String(o)}>{o}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function VehicleForm({
  defaultValues,
  onSave,
  onCancel,
  isLoading,
}: {
  defaultValues?: Partial<CreateVehiclePayload>;
  onSave: (data: CreateVehiclePayload) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const { control, register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateVehiclePayload>({
    defaultValues,
    mode: 'onChange',
  });

  const selectedMake = watch('make') ?? '';
  const selectedModel = watch('model') ?? '';

  const makes = getMakes();
  const models = selectedMake ? getModels(selectedMake) : [];
  const years = selectedMake && selectedModel ? getYears(selectedMake, selectedModel) : [];

  const handleMakeChange = (make: string) => {
    setValue('make', make, { shouldValidate: true });
    setValue('model', '', { shouldValidate: false });
    setValue('year', '' as unknown as number, { shouldValidate: false });
  };

  const handleModelChange = (model: string) => {
    setValue('model', model, { shouldValidate: true });
    setValue('year', '' as unknown as number, { shouldValidate: false });
  };

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <div className="grid grid-cols-2 gap-3">
        <Controller
          name="make"
          control={control}
          rules={{ required: "Обов'язково" }}
          render={({ field }) => (
            <SelectField
              label="Марка"
              value={field.value ?? ''}
              onChange={handleMakeChange}
              options={makes}
              placeholder="Оберіть марку"
              error={errors.make?.message}
            />
          )}
        />
        <Controller
          name="model"
          control={control}
          rules={{ required: "Обов'язково" }}
          render={({ field }) => (
            <SelectField
              label="Модель"
              value={field.value ?? ''}
              onChange={handleModelChange}
              options={models}
              placeholder={selectedMake ? 'Оберіть модель' : 'Спочатку марку'}
              disabled={!selectedMake}
              error={errors.model?.message}
            />
          )}
        />
        <Controller
          name="year"
          control={control}
          rules={{ required: "Обов'язково" }}
          render={({ field }) => (
            <SelectField
              label="Рік"
              value={field.value ? String(field.value) : ''}
              onChange={(v) => field.onChange(v ? Number(v) : '')}
              options={years}
              placeholder={selectedModel ? 'Оберіть рік' : 'Спочатку модель'}
              disabled={!selectedModel}
              error={errors.year?.message}
            />
          )}
        />
        <Input label="Держ. номер" placeholder="АА1234АА" error={errors.plateNumber?.message} {...register('plateNumber', { required: "Обов'язково", pattern: { value: /^[A-ZА-ЯІЇЄ]{2}\d{4}[A-ZА-ЯІЇЄ]{2}$/i, message: 'Формат: АА1234АА' } })} />
      </div>
      <Input
        label="VIN (необов'язково)"
        placeholder="1HGCM82633A123456"
        error={errors.vin?.message}
        {...register('vin', {
          validate: (v) =>
            !v || /^[A-HJ-NPR-Z0-9]{17}$/.test(v) || 'VIN має бути 17 символів',
        })}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={isLoading}>Зберегти</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Скасувати</Button>
      </div>
    </form>
  );
}

function VehicleCard({ vehicle, onEdit, onDelete }: { vehicle: Vehicle; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{vehicle.make} {vehicle.model}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{vehicle.year} · {vehicle.plateNumber}</p>
          {vehicle.vin && <p className="text-xs text-slate-400 mt-1">VIN: {vehicle.vin}</p>}
          {vehicle.mileage && <p className="text-xs text-slate-400">Пробіг: {vehicle.mileage.toLocaleString()} км</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-brand transition-colors" aria-label="Редагувати">✏️</button>
          <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" aria-label="Видалити">🗑️</button>
        </div>
      </div>
    </div>
  );
}

export default function VehiclesPage() {
  const { data: vehicles, isLoading } = useVehicles();
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();

  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleCreate = (data: CreateVehiclePayload) => {
    const payload: CreateVehiclePayload = {
      ...data,
      vin: data.vin?.trim() || undefined,
      plateNumber: data.plateNumber?.trim() || '',
    };
    createVehicle.mutate(payload, {
      onSuccess: () => { toast('Автомобіль додано', 'success'); setShowForm(false); },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        console.error('Vehicle create error:', error?.response?.data);
        const msg = error?.response?.data?.message ?? 'Помилка додавання авто';
        toast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      },
    });
  };

  const handleUpdate = (data: CreateVehiclePayload) => {
    if (!editingVehicle) return;
    const { make, model, year, plateNumber, vin } = data;
    const payload = { make, model, year, plateNumber: plateNumber?.trim() || '', vin: vin?.trim() ?? '' };
    updateVehicle.mutate(
      { id: editingVehicle.id, data: payload },
      {
        onSuccess: () => { toast('Збережено', 'success'); setEditingVehicle(null); },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (error: any) => {
          console.error('Vehicle update error:', error?.response?.data);
          const msg = error?.response?.data?.message ?? 'Помилка збереження';
          toast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteVehicle.mutate(deleteId, {
      onSuccess: () => { toast('Автомобіль видалено', 'success'); setDeleteId(null); },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        const msg = error?.response?.data?.message ?? 'Помилка видалення';
        toast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        setDeleteId(null);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Мої автомобілі</h1>
        {!showForm && (
          <Button size="sm" onClick={() => { setShowForm(true); setEditingVehicle(null); }}>
            + Додати авто
          </Button>
        )}
      </div>

      {showForm && (
        <VehicleForm onSave={handleCreate} onCancel={() => setShowForm(false)} isLoading={createVehicle.isPending} />
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : vehicles?.length === 0 && !showForm ? (
        <EmptyState
          title="У вас ще немає авто"
          description="Додайте автомобіль, щоб записатися на сервіс"
          icon="🚗"
          action={<Button onClick={() => setShowForm(true)}>Додати авто</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(vehicles ?? []).map((v) =>
            editingVehicle?.id === v.id ? (
              <VehicleForm
                key={v.id}
                defaultValues={{ ...v, vin: v.vin ?? undefined }}
                onSave={handleUpdate}
                onCancel={() => setEditingVehicle(null)}
                isLoading={updateVehicle.isPending}
              />
            ) : (
              <VehicleCard key={v.id} vehicle={v} onEdit={() => setEditingVehicle(v)} onDelete={() => setDeleteId(v.id)} />
            ),
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Видалити автомобіль?"
        message="Цю дію не можна відмінити."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        isDanger
      />
    </div>
  );
}
