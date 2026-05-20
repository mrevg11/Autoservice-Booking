import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { mastersApi, usersApi } from '../../../shared/api/endpoints';
import Input from '../../../shared/components/ui/Input';
import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';
import { toast } from '../../../shared/store/toast.store';
import { useAuthStore } from '../../../shared/store/auth.store';

interface ProfileForm {
  specialization: string;
  experienceYears: number;
  bio: string;
}

interface PersonalForm {
  firstName: string;
  lastName: string;
  phone: string;
}

export default function MasterProfilePage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: userMe, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe().then((r) => r.data),
  });

  const { data: masters } = useQuery({
    queryKey: ['masters', { limit: 50 }],
    queryFn: () => mastersApi.getAll({ limit: 50 }).then((r) => r.data),
    enabled: !!user,
  });

  const me = masters?.data.find((m) => m.user.id === user?.id);

  const updateMutation = useMutation({
    mutationFn: (d: ProfileForm) => mastersApi.updateMyProfile({ ...d, experienceYears: Number(d.experienceYears) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['masters'] }); toast('Профіль оновлено', 'success'); },
    onError: () => toast('Помилка', 'error'),
  });

  const updatePersonalMutation = useMutation({
    mutationFn: (d: PersonalForm) => usersApi.updateMe(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['me'] }); toast('Особисті дані оновлено', 'success'); },
    onError: () => toast('Помилка', 'error'),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    mode: 'onChange',
    values: me ? {
      specialization: me.specialization ?? '',
      experienceYears: me.experienceYears,
      bio: me.bio ?? '',
    } : undefined,
  });

  const { register: regP, handleSubmit: handlePersonal, formState: { errors: errP } } = useForm<PersonalForm>({
    mode: 'onChange',
    values: userMe ? {
      firstName: userMe.firstName,
      lastName: userMe.lastName,
      phone: userMe.phone ?? '',
    } : undefined,
  });

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-slate-900">Профіль майстра</h1>

      {/* Personal info */}
      <div className="bg-white rounded-xl shadow-card border border-slate-100 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center text-white text-xl font-bold">
            {userMe?.firstName[0]}{userMe?.lastName[0]}
          </div>
          <div>
            <p className="font-semibold">{userMe?.firstName} {userMe?.lastName}</p>
            {me && <p className="text-sm text-slate-500">⭐ {Number(me.rating ?? 0).toFixed(1)}</p>}
            <p className="text-xs text-slate-400">{userMe?.email}</p>
          </div>
        </div>

        <h2 className="font-semibold text-slate-900 mb-3 text-sm">Особисті дані</h2>
        <form onSubmit={handlePersonal((d) => updatePersonalMutation.mutate(d))} className="space-y-3 mb-6 pb-6 border-b border-slate-100">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ім'я"
              error={errP.firstName?.message}
              {...regP('firstName', { required: "Обов'язково" })}
            />
            <Input
              label="Прізвище"
              error={errP.lastName?.message}
              {...regP('lastName', { required: "Обов'язково" })}
            />
          </div>
          <Input
            label="Телефон"
            type="tel"
            placeholder="+380XXXXXXXXX"
            error={errP.phone?.message}
            {...regP('phone', {
              pattern: { value: /^\+380\d{9}$/, message: 'Формат: +380XXXXXXXXX' },
            })}
          />
          <Button type="submit" size="sm" isLoading={updatePersonalMutation.isPending}>Зберегти дані</Button>
        </form>

        <h2 className="font-semibold text-slate-900 mb-3 text-sm">Профіль майстра</h2>
        <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
          <Input
            label="Спеціалізація"
            placeholder="Технічне обслуговування, ремонт двигунів..."
            {...register('specialization')}
          />
          <Input
            label="Досвід (років)"
            type="number"
            error={errors.experienceYears?.message}
            {...register('experienceYears', { min: { value: 0, message: 'Мінімум 0' } })}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Про себе</label>
            <textarea
              {...register('bio')}
              placeholder="Розкажіть про свій досвід та підхід до роботи..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <Button type="submit" isLoading={updateMutation.isPending}>Зберегти профіль</Button>
        </form>
      </div>

      {/* Read-only account info */}
      <div className="bg-white rounded-xl shadow-card border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Інформація про акаунт</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Email</span>
            <span className="font-medium">{userMe?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Email підтверджено</span>
            <span className={userMe?.emailVerified ? 'text-green-600 font-medium' : 'text-red-500'}>
              {userMe?.emailVerified ? 'Так' : 'Ні'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Роль</span>
            <span className="font-medium">{userMe?.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
