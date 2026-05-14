import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

function InlineMessage({ type, children }: { type: 'success' | 'error'; children: React.ReactNode }) {
  const styles = type === 'success'
    ? 'bg-green-50 border-green-200 text-green-800'
    : 'bg-red-50 border-red-200 text-red-700';
  return (
    <div className={`p-3 rounded-xl border text-sm ${styles}`}>{children}</div>
  );
}

export default function RegisterSection() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: FormData) => authApi.register(data),
    onSuccess: () => {
      setTimeout(() => navigate('/login'), 3000);
    },
    onError: () => {
      setServerError('Не вдалося зареєструватися. Можливо, email вже зайнятий.');
    },
  });

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    setServerError(null);
    mutation.mutate(data);
  };

  return (
    <section id="register" className="bg-white rounded-2xl shadow-card border border-slate-100 p-8 scroll-mt-20">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-brand">Зареєструватися безкоштовно</h2>
          <p className="text-sm text-slate-500 mt-1">Створіть обліковий запис та запишіться за 60 секунд</p>
        </div>

        {mutation.isSuccess ? (
          <InlineMessage type="success">
            <strong>Майже готово!</strong> Ми надіслали листа для підтвердження на вашу адресу.
            Перевірте папку «Вхідні». Через кілька секунд вас буде перенаправлено на сторінку входу…
          </InlineMessage>
        ) : (
          <>
            {serverError && <InlineMessage type="error">{serverError}</InlineMessage>}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
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
              <a href="/login" className="text-accent font-medium hover:underline">Увійти</a>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
