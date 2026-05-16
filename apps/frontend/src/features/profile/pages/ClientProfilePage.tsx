import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usersApi } from '../../../shared/api/endpoints';
import { useAuthStore } from '../../../shared/store/auth.store';
import Input from '../../../shared/components/ui/Input';
import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';
import { toast } from '../../../shared/store/toast.store';

const profileSchema = z.object({
  firstName: z.string().min(2, 'Мінімум 2 символи'),
  lastName: z.string().min(2, 'Мінімум 2 символи'),
  phone: z.string().optional(),
});

type ProfileData = z.infer<typeof profileSchema>;

export default function ClientProfilePage() {
  const { user, setAuth } = useAuthStore();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe().then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (d: ProfileData) => usersApi.updateMe(d),
    onSuccess: ({ data: updated }) => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      if (user && refreshToken) {
        setAuth(
          { ...user, firstName: updated.firstName, lastName: updated.lastName },
          useAuthStore.getState().accessToken ?? '',
          refreshToken,
        );
      }
      toast('Профіль оновлено', 'success');
    },
    onError: () => toast('Помилка збереження', 'error'),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    values: data ? { firstName: data.firstName, lastName: data.lastName, phone: data.phone ?? '' } : undefined,
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-slate-900">Мій профіль</h1>

      <div className="bg-white rounded-xl shadow-card border border-slate-100 p-6">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center text-white text-xl font-bold">
            {data?.firstName[0]}{data?.lastName[0]}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{data?.firstName} {data?.lastName}</p>
            <p className="text-sm text-slate-500">{data?.email}</p>
            <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full font-medium">
              {data?.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ім'я" error={errors.firstName?.message} {...register('firstName')} />
            <Input label="Прізвище" error={errors.lastName?.message} {...register('lastName')} />
          </div>
          <Input label="Телефон" type="tel" {...register('phone')} />
          <Button type="submit" isLoading={updateMutation.isPending}>Зберегти зміни</Button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Інформація про акаунт</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Email</span>
            <span className="font-medium">{data?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Email підтверджено</span>
            <span className={data?.emailVerified ? 'text-green-600 font-medium' : 'text-red-500'}>
              {data?.emailVerified ? 'Так' : 'Ні'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Роль</span>
            <span className="font-medium">{data?.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
