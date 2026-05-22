import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLogin } from '../../../shared/hooks/useAuth';
import Input from '../../../shared/components/ui/Input';
import Button from '../../../shared/components/ui/Button';

export default function LoginPage() {
  const loginMutation = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate(
      { email, password },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
          const msg = err?.response?.data?.message;
          setError(typeof msg === 'string' ? msg : 'Невірний email або пароль');
        },
      },
    );
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-brand">Вхід до системи</h1>
          <p className="text-sm text-slate-500 mt-1">Раді бачити вас знову!</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => { setError(''); setEmail(e.target.value); }}
            data-testid="email-input"
          />
          <div className="space-y-1">
            <Input
              label="Пароль"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setError(''); setPassword(e.target.value); }}
              data-testid="password-input"
            />
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-accent hover:underline">
                Забули пароль?
              </Link>
            </div>
          </div>
          <Button
            type="submit"
            isLoading={loginMutation.isPending}
            disabled={!email || !password}
            className="w-full"
            size="lg"
            data-testid="login-button"
          >
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
