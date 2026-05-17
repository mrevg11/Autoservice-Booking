import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLogin } from '../../../shared/hooks/useAuth';
import Input from '../../../shared/components/ui/Input';
import Button from '../../../shared/components/ui/Button';

const schema = z.object({
  email: z.string().email('Невірний формат email'),
  password: z.string().min(1, 'Введіть пароль'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const loginMutation = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const onSubmit = (data: FormData) => {
    loginMutation.reset();
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-brand">Вхід до системи</h1>
          <p className="text-sm text-slate-500 mt-1">Раді бачити вас знову!</p>
        </div>

        {loginMutation.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            Невірний email або пароль
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            data-testid="email-input"
            {...register('email')}
          />
          <div className="space-y-1">
            <Input
              label="Пароль"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              data-testid="password-input"
              {...register('password')}
            />
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-accent hover:underline">
                Забули пароль?
              </Link>
            </div>
          </div>
          <Button type="submit" isLoading={loginMutation.isPending} className="w-full" size="lg" data-testid="login-button">
            Увійти
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Немає облікового запису?{' '}
          <Link to="/register" className="text-accent font-medium hover:underline">
            Зареєструватися
          </Link>
        </p>
      </div>
    </div>
  );
}
