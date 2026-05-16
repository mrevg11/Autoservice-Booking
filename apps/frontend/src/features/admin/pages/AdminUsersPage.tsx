import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { adminUsersApi, type UserDto, type CreateMasterPayload } from '../../../shared/api/endpoints';
import Button from '../../../shared/components/ui/Button';
import Input from '../../../shared/components/ui/Input';
import Spinner from '../../../shared/components/ui/Spinner';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import { toast } from '../../../shared/store/toast.store';

type RoleFilter = '' | 'CLIENT' | 'MASTER' | 'ADMIN';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const roleLabel: Record<string, string> = { CLIENT: 'Клієнт', MASTER: 'Майстер', ADMIN: 'Адмін' };
const roleBadge: Record<string, string> = {
  CLIENT: 'bg-blue-100 text-blue-700',
  MASTER: 'bg-green-100 text-green-700',
  ADMIN: 'bg-purple-100 text-purple-700',
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showCreateMaster, setShowCreateMaster] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter],
    queryFn: () => adminUsersApi.getAll({ role: roleFilter || undefined, limit: 100 }).then((r) => r.data),
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, isBlocked }: { id: number; isBlocked: boolean }) =>
      adminUsersApi.update(id, { isBlocked }),
    onSuccess: () => { toast('Оновлено', 'success'); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: () => toast('Помилка', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminUsersApi.remove(id),
    onSuccess: () => { toast('Видалено', 'success'); setDeleteId(null); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? 'Помилка видалення';
      toast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      setDeleteId(null);
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateMasterPayload>();
  const createMasterMutation = useMutation({
    mutationFn: (d: CreateMasterPayload) => adminUsersApi.createMaster(d),
    onSuccess: () => {
      toast('Майстра створено', 'success');
      setShowCreateMaster(false);
      reset();
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => toast('Помилка (можливо, email вже зайнятий)', 'error'),
  });

  const users = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Користувачі</h1>
        <Button size="sm" onClick={() => setShowCreateMaster(true)}>+ Додати майстра</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['', 'CLIENT', 'MASTER', 'ADMIN'] as RoleFilter[]).map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${roleFilter === r ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {r === '' ? 'Всі' : roleLabel[r]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['ID', "Ім'я", 'Email', 'Роль', 'Верифікований', 'Заблокований', 'Дії'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u: UserDto) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-400">#{u.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                      {roleLabel[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">{u.emailVerified ? '✅' : '❌'}</td>
                  <td className="px-4 py-3">{u.isBlocked ? '🚫' : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => blockMutation.mutate({ id: u.id, isBlocked: !u.isBlocked })}
                        className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors whitespace-nowrap ${u.isBlocked ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                      >
                        {u.isBlocked ? 'Розблокувати' : 'Заблокувати'}
                      </button>
                      <button
                        onClick={() => setDeleteId(u.id)}
                        className="px-2 py-1 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700 transition-colors"
                      >
                        Видалити
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="text-center text-slate-400 py-8 text-sm">Користувачів не знайдено</p>
          )}
        </div>
      )}

      {showCreateMaster && (
        <Modal title="Додати майстра" onClose={() => { setShowCreateMaster(false); reset(); }}>
          <form onSubmit={handleSubmit((d) => createMasterMutation.mutate(d))} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Ім'я" placeholder="Іван" error={errors.firstName?.message}
                {...register('firstName', { required: "Обов'язково" })} />
              <Input label="Прізвище" placeholder="Коваль" error={errors.lastName?.message}
                {...register('lastName', { required: "Обов'язково" })} />
            </div>
            <Input label="Email" type="email" placeholder="master@email.com" error={errors.email?.message}
              {...register('email', { required: "Обов'язково" })} />
            <Input label="Телефон (необов'язково)" {...register('phone')} />
            <Input label="Пароль" type="password" placeholder="Мінімум 8 символів" error={errors.password?.message}
              {...register('password', { required: "Обов'язково", minLength: { value: 8, message: 'Мінімум 8 символів' } })} />
            <div className="flex gap-2 pt-1">
              <Button type="submit" isLoading={createMasterMutation.isPending}>Створити</Button>
              <Button type="button" variant="ghost" onClick={() => { setShowCreateMaster(false); reset(); }}>Скасувати</Button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Видалити користувача?"
        message="Цю дію не можна відмінити. Всі дані користувача будуть видалені."
        onConfirm={() => { if (deleteId !== null) deleteMutation.mutate(deleteId); }}
        onCancel={() => setDeleteId(null)}
        isDanger
      />
    </div>
  );
}
