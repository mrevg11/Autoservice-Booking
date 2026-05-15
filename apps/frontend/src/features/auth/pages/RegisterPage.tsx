import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../../shared/api/endpoints';
import Input from '../../../shared/components/ui/Input';
import { PhoneInput } from '../../../shared/components/ui/PhoneInput';
import Button from '../../../shared/components/ui/Button';

const schema = z.object({
  firstName: z.string().min(2, 'Мінімум 2 символи'),
  lastName: z.string().min(2, 'Мінімум 2 символи'),
  email: z.string().email('Невірний формат email'),
  phone: z.string().optional().refine(
    (v) => !v || v === '+' || isValidPhoneNumber(v),
    { message: 'Невірний формат номера' },
  ),
  password: z
    .string()
    .min(8, 'Мінімум 8 символів')
    .regex(/[A-Z]/, 'Потрібна велика літера')
    .regex(/[0-9]/, 'Потрібна цифра'),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: FormData) => authApi.register(data),
    onSuccess: () => setDone(true),
  });

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  if (done) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Підтвердьте email</h2>
          <p className="text-slate-600 text-sm">
            Ми надіслали лист для підтвердження на вашу адресу. Перевірте папку «Вхідні».
          </p>
          <Link to="/login" className="mt-6 inline-block text-accent font-medium hover:underline text-sm">
            Повернутися до входу
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-brand">Реєстрація</h1>
          <p className="text-sm text-slate-500 mt-1">Створіть обліковий запис клієнта</p>
        </div>

        {mutation.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            Не вдалося зареєструватися. Можливо, email вже зайнятий.
          </div>
        )}

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ім'я" placeholder="Іван" error={errors.firstName?.message} {...register('firstName')} />
            <Input label="Прізвище" placeholder="Коваль" error={errors.lastName?.message} {...register('lastName')} />
          </div>
          <Input label="Email" type="email" placeholder="your@email.com" error={errors.email?.message} {...register('email')} />
          <Controller
            name="phone"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <PhoneInput
                label="Телефон (необов'язково)"
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.phone?.message}
              />
            )}
          />
          <Input
            label="Пароль"
            type="password"
            placeholder="Мінімум 8 символів"
            hint="Мінімум 8 символів, велика літера та цифра"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" isLoading={mutation.isPending} className="w-full" size="lg">
            Зареєструватися
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Вже є обліковий запис?{' '}
          <Link to="/login" className="text-accent font-medium hover:underline">Увійти</Link>
        </p>
      </div>
    </div>
  );
}
