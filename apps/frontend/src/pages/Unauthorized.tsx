import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="text-8xl font-extrabold text-slate-200 mb-4">403</div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Доступ заборонено</h1>
      <p className="text-slate-500 mb-6">У вас немає прав для перегляду цієї сторінки</p>
      <Link to="/" className="inline-flex items-center justify-center px-5 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors">
        На головну
      </Link>
    </div>
  );
}
