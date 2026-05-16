import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle } from '../hooks/useVehicles';
import Button from '../../../shared/components/ui/Button';
import Input from '../../../shared/components/ui/Input';
import Spinner from '../../../shared/components/ui/Spinner';
import EmptyState from '../../../shared/components/ui/EmptyState';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import { toast } from '../../../shared/store/toast.store';
import type { Vehicle, CreateVehiclePayload } from '../../../shared/api/endpoints';

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
  const { register, handleSubmit, formState: { errors } } = useForm<CreateVehiclePayload>({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Марка" error={errors.make?.message} {...register('make', { required: 'Обов\'язково' })} />
        <Input label="Модель" error={errors.model?.message} {...register('model', { required: 'Обов\'язково' })} />
        <Input label="Рік" type="number" error={errors.year?.message} {...register('year', { required: 'Обов\'язково', valueAsNumber: true })} />
        <Input label="Держ. номер" error={errors.plateNumber?.message} {...register('plateNumber', { required: 'Обов\'язково' })} />
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
    createVehicle.mutate(data, {
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
    updateVehicle.mutate(
      { id: editingVehicle.id, data },
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
      onError: () => { toast('Помилка', 'error'); setDeleteId(null); },
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
