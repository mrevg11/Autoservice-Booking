import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../../shared/api/endpoints';
import Input from '../../../shared/components/ui/Input';
import Button from '../../../shared/components/ui/Button';

const schema = z.object({
  password: z.string().min(8, 'Мінімум 8 символів').regex(/[A-Z]/, 'Потрібна велика літера').regex(/[0-9]/, 'Потрібна цифра'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Паролі не збігаються', path: ['confirm'] });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [done, setDone] = useState(false);
  const token = searchParams.get('token') ?? '';

  const mutation = useMutation({
    mutationFn: (data: FormData) => authApi.resetPassword(token, data.password),
    onSuccess: () => setDone(true),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  if (!token) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-card p-8 max-w-md w-full text-center">
          <p className="text-red-600">Недійсне посилання для скидання паролю.</p>
          <Link to="/forgot-password" className="mt-4 inline-block text-accent hover:underline text-sm">
            Запросити новий лист
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-card p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2">Пароль змінено</h2>
          <Link to="/login" className="text-accent font-medium hover:underline text-sm">Увійти</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-brand">Новий пароль</h1>
        </div>

        {mutation.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            Не вдалося змінити пароль. Посилання могло застаріти.
          </div>
        )}

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <Input label="Новий пароль" type="password" placeholder="Мінімум 8 символів" error={errors.password?.message} {...register('password')} />
          <Input label="Підтвердити пароль" type="password" placeholder="Повторіть пароль" error={errors.confirm?.message} {...register('confirm')} />
          <Button type="submit" isLoading={mutation.isPending} className="w-full" size="lg">Змінити пароль</Button>
        </form>
      </div>
    </div>
  );
}
