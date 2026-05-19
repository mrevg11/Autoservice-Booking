import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminVehiclesApi,
  bookingsApi,
  type AdminVehicle,
  type Booking,
} from '../../../shared/api/endpoints';
import Spinner from '../../../shared/components/ui/Spinner';
import Button from '../../../shared/components/ui/Button';
import Pagination from '../../../shared/components/ui/Pagination';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import { toast } from '../../../shared/store/toast.store';
import { toKyivDisplay } from '../../../shared/utils/date';

const LIMIT = 20;

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:     { label: 'Очікує',      color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED:   { label: 'Підтверджено', color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'Виконується', color: 'bg-purple-100 text-purple-700' },
  COMPLETED:   { label: 'Завершено',   color: 'bg-green-100 text-green-700' },
  CANCELLED:   { label: 'Скасовано',   color: 'bg-red-100 text-red-700' },
};

function VehicleBookingsModal({ vehicle, onClose }: { vehicle: AdminVehicle; onClose: () => void }) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-vehicle-bookings', vehicle.id, page],
    queryFn: () =>
      bookingsApi.getAll({ vehicleId: vehicle.id, page, limit: 10 }).then((r) => r.data),
  });

  const bookings: Booking[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-lg text-slate-900">
              Записи — {vehicle.make} {vehicle.model} ({vehicle.year})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {vehicle.plateNumber ?? 'без номера'} · {vehicle.client.firstName} {vehicle.client.lastName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex justify-center py-10"><Spinner size="lg" /></div>
          ) : bookings.length === 0 ? (
            <p className="text-center text-slate-400 py-10 text-sm">Записів для цього автомобіля не знайдено</p>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => {
                const statusInfo = STATUS_LABELS[b.status] ?? { label: b.status, color: 'bg-slate-100 text-slate-600' };
                return (
                  <div key={b.id} className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-400">#{b.id}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-900">
                          {toKyivDisplay(b.scheduledAt)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Майстер: {b.master?.user
                            ? `${b.master.user.firstName} ${b.master.user.lastName}`
                            : '—'}
                        </p>
                        {b.bookingServices?.length > 0 && (
                          <p className="text-xs text-slate-500">
                            Послуги: {b.bookingServices.map((s) => s.service.name).join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-slate-900 text-sm">
                          {Number(b.totalPrice).toLocaleString('uk-UA')} ₴
                        </p>
                        <p className="text-xs text-slate-400">{b.estimatedDurationMinutes} хв</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">{total} записів</span>
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
          <Button size="sm" onClick={onClose}>Закрити</Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminVehiclesPage() {
  const [page, setPage] = useState(1);
  const [detailsVehicle, setDetailsVehicle] = useState<AdminVehicle | null>(null);
  const [bookingsVehicle, setBookingsVehicle] = useState<AdminVehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminVehicle | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-vehicles', page],
    queryFn: () => adminVehiclesApi.getAll({ page, limit: LIMIT }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminVehiclesApi.remove(id),
    onSuccess: () => {
      toast('Автомобіль видалено', 'success');
      qc.invalidateQueries({ queryKey: ['admin-vehicles'] });
      setDeleteTarget(null);
    },
    onError: () => toast('Помилка видалення', 'error'),
  });

  const vehicles = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Автомобілі</h1>
        <span className="text-sm text-slate-500">{total} автомобілів</span>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-slate-100">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : vehicles.length === 0 ? (
          <p className="text-center text-slate-400 py-12 text-sm">Автомобілів не знайдено</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">ID</th>
                  <th className="text-left px-4 py-3">Автомобіль</th>
                  <th className="text-left px-4 py-3">Держ. номер</th>
                  <th className="text-left px-4 py-3">Власник</th>
                  <th className="text-right px-4 py-3">Дії</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono">#{v.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {v.make} {v.model} <span className="text-slate-400 font-normal">({v.year})</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{v.plateNumber ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-900">{v.client.firstName} {v.client.lastName}</div>
                      <div className="text-xs text-slate-400">{v.client.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end flex-wrap">
                        <Button size="sm" variant="ghost" onClick={() => setDetailsVehicle(v)}>
                          Деталі
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setBookingsVehicle(v)}>
                          Переглянути записи
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(v)}>
                          Видалити
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Details modal */}
      {detailsVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-slate-900">Деталі автомобіля</h2>
              <button
                onClick={() => setDetailsVehicle(null)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-slate-500">ID</dt>
              <dd className="font-medium text-slate-900">#{detailsVehicle.id}</dd>
              <dt className="text-slate-500">Марка</dt>
              <dd className="font-medium text-slate-900">{detailsVehicle.make}</dd>
              <dt className="text-slate-500">Модель</dt>
              <dd className="font-medium text-slate-900">{detailsVehicle.model}</dd>
              <dt className="text-slate-500">Рік</dt>
              <dd className="font-medium text-slate-900">{detailsVehicle.year}</dd>
              <dt className="text-slate-500">Держ. номер</dt>
              <dd className="font-medium text-slate-900">{detailsVehicle.plateNumber ?? '—'}</dd>
              <dt className="text-slate-500">VIN</dt>
              <dd className="font-medium text-slate-900 font-mono text-xs break-all">{detailsVehicle.vin ?? '—'}</dd>
              <dt className="text-slate-500">Власник</dt>
              <dd className="font-medium text-slate-900">{detailsVehicle.client.firstName} {detailsVehicle.client.lastName}</dd>
              <dt className="text-slate-500">Email власника</dt>
              <dd className="font-medium text-slate-900 text-xs break-all">{detailsVehicle.client.email}</dd>
            </dl>
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setDetailsVehicle(null)}>Закрити</Button>
            </div>
          </div>
        </div>
      )}

      {/* Bookings modal */}
      {bookingsVehicle && (
        <VehicleBookingsModal vehicle={bookingsVehicle} onClose={() => setBookingsVehicle(null)} />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen
          isDanger
          title="Видалити автомобіль?"
          message={`${deleteTarget.make} ${deleteTarget.model} (${deleteTarget.year}) — власник: ${deleteTarget.client.firstName} ${deleteTarget.client.lastName}. Усі записи по цьому авто отримають порожнє поле автомобіля.`}
          confirmLabel="Видалити"
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
