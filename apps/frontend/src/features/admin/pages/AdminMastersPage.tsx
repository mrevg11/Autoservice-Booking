import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mastersApi, adminUsersApi, type MasterDto } from '../../../shared/api/endpoints';
import Spinner from '../../../shared/components/ui/Spinner';
import { toast } from '../../../shared/store/toast.store';

export default function AdminMastersPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['masters-admin'],
    queryFn: () => mastersApi.getAll({ limit: 100 }).then((r) => r.data),
  });

  const blockMutation = useMutation({
    mutationFn: ({ userId, isBlocked }: { userId: number; isBlocked: boolean }) =>
      adminUsersApi.update(userId, { isBlocked }),
    onSuccess: () => { toast('Оновлено', 'success'); qc.invalidateQueries({ queryKey: ['masters-admin'] }); },
    onError: () => toast('Помилка', 'error'),
  });

  const masters = data?.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Майстри</h1>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : masters.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Майстрів не знайдено</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {masters.map((m: MasterDto) => (
            <div key={m.id} className="bg-white rounded-xl shadow-card border border-slate-100 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {m.user.firstName[0]}{m.user.lastName[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{m.user.firstName} {m.user.lastName}</p>
                    <p className="text-xs text-slate-500">{m.specialization ?? 'Без спеціалізації'}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-brand">⭐ {m.rating.toFixed(1)}</p>
                  <p className="text-xs text-slate-400">{m.experienceYears} р.</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">{m.user.email}</p>
              {m.bio && <p className="text-xs text-slate-400 line-clamp-2">{m.bio}</p>}
              <div className="flex gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={() => blockMutation.mutate({ userId: m.user.id, isBlocked: true })}
                  className="px-2 py-1 text-xs rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                >
                  Заблокувати
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
