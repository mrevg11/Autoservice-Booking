import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../../shared/api/endpoints';
import Spinner from '../../../shared/components/ui/Spinner';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8 w-full max-w-md text-center">
        {status === 'loading' && (
          <>
            <div className="flex justify-center mb-4"><Spinner size="lg" /></div>
            <p className="text-slate-600">Підтверджуємо email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Email підтверджено!</h2>
            <p className="text-slate-600 text-sm mb-6">Тепер ви можете увійти до системи.</p>
            <Link to="/login" className="inline-flex items-center justify-center px-6 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors">
              Увійти
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Помилка підтвердження</h2>
            <p className="text-slate-600 text-sm mb-6">Посилання недійсне або застаріло.</p>
            <Link to="/register" className="text-accent font-medium hover:underline text-sm">
              Зареєструватися знову
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
