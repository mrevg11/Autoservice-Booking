import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../../shared/api/endpoints';
import Input from '../../../shared/components/ui/Input';
import Button from '../../../shared/components/ui/Button';

const schema = z.object({ email: z.string().email('Невірний формат email') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: FormData) => authApi.forgotPassword(data.email),
    onSuccess: () => setSent(true),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  if (sent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Перевірте пошту</h2>
          <p className="text-slate-600 text-sm">
            Якщо обліковий запис існує, ми надіслали інструкції зі скидання паролю.
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
          <h1 className="text-2xl font-extrabold text-brand">Забули пароль?</h1>
          <p className="text-sm text-slate-500 mt-1">Введіть email для відновлення</p>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" isLoading={mutation.isPending} className="w-full" size="lg">
            Надіслати інструкції
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          <Link to="/login" className="text-accent font-medium hover:underline">← Повернутися до входу</Link>
        </p>
      </div>
    </div>
  );
}
