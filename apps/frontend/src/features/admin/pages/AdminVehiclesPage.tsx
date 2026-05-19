import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminVehiclesApi, type AdminVehicle } from '../../../shared/api/endpoints';
import Spinner from '../../../shared/components/ui/Spinner';
import Button from '../../../shared/components/ui/Button';
import Pagination from '../../../shared/components/ui/Pagination';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import { toast } from '../../../shared/store/toast.store';

const LIMIT = 20;

export default function AdminVehiclesPage() {
  const [page, setPage] = useState(1);
  const [detailsVehicle, setDetailsVehicle] = useState<AdminVehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminVehicle | null>(null);
  const navigate = useNavigate();
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/admin/bookings?vehicleId=${v.id}`)}
                        >
                          Переглянути записи
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setDeleteTarget(v)}
                        >
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
              <button onClick={() => setDetailsVehicle(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
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
            <div className="flex justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setDetailsVehicle(null); navigate(`/admin/bookings?vehicleId=${detailsVehicle.id}`); }}
              >
                Переглянути записи
              </Button>
              <Button size="sm" onClick={() => setDetailsVehicle(null)}>Закрити</Button>
            </div>
          </div>
        </div>
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
