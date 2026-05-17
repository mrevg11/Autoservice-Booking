import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '../shared/api/endpoints';
import { useAuthStore } from '../shared/store/auth.store';
import Spinner from '../shared/components/ui/Spinner';
import RegisterSection from '../features/landing/components/RegisterSection';

function scrollToRegister() {
  document.getElementById('register')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getCategoryIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('обслугов') || n.includes('то')) return '🔧';
  if (n.includes('діагност')) return '🔍';
  if (n.includes('кузов')) return '🚗';
  if (n.includes('двигун') || n.includes('мотор')) return '⚙️';
  if (n.includes('гальм')) return '🛑';
  if (n.includes('шин') || n.includes('колес')) return '🏎️';
  if (n.includes('електр')) return '⚡';
  return '🔧';
}

export default function LandingPage() {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated() && user) {
    if (user.role === 'CLIENT') return <Navigate to="/client/dashboard" replace />;
    if (user.role === 'MASTER') return <Navigate to="/master/dashboard" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  }

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => servicesApi.getCategories().then((r) => r.data),
  });

  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="relative bg-brand text-white rounded-2xl overflow-hidden px-8 py-20 text-center">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 30% 50%, #f97316 0%, transparent 60%), radial-gradient(circle at 70% 20%, #3b82f6 0%, transparent 50%)'
        }} />
        <div className="relative">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Запишіться на сервіс<br />
            <span className="text-accent">за 60 секунд</span>
          </h1>
          <p className="text-lg text-white/75 mb-8 max-w-xl mx-auto">
            Розумна система підбору майстра та часу. Онлайн-запис, підтвердження та нагадування.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={scrollToRegister}
              className="inline-flex items-center justify-center px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-colors"
            >
              Записатися
            </button>
            <Link
              to="/services"
              className="inline-flex items-center justify-center px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20"
            >
              Дивитися послуги
            </Link>
          </div>
        </div>
      </section>

      {/* Services categories */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Наші послуги</h2>
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner size="lg" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(categories ?? []).map((cat) => (
              <Link
                key={cat.id}
                to={`/services?categoryId=${cat.id}`}
                className="bg-white rounded-xl p-5 shadow-card border border-slate-100 hover:border-accent/30 hover:-translate-y-0.5 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3 text-accent text-xl group-hover:bg-accent group-hover:text-white transition-colors">
                  {getCategoryIcon(cat.name)}
                </div>
                <h3 className="font-semibold text-slate-900">{cat.name}</h3>
                {cat.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{cat.description}</p>}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Як це працює</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '01', icon: '🔍', title: 'Оберіть послугу', desc: 'Знайдіть потрібну послугу з нашого каталогу' },
            { step: '02', icon: '👨‍🔧', title: 'Знайдіть майстра', desc: 'Система підбере найкращого спеціаліста для вас' },
            { step: '03', icon: '📅', title: 'Приїдьте вчасно', desc: 'Отримайте підтвердження та нагадування' },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4 text-2xl">
                {icon}
              </div>
              <div className="text-xs font-bold text-accent mb-1">КРОК {step}</div>
              <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-white rounded-2xl p-8 shadow-card">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Чому ми</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: '🤖', title: 'Розумний підбір', desc: 'AI-алгоритм знаходить найкращий час і майстра' },
            { icon: '⭐', title: 'Досвідчені майстри', desc: 'Тільки перевірені спеціалісти з відгуками' },
            { icon: '⏰', title: 'Зручний час', desc: 'Вибирайте слот онлайн 24/7' },
            { icon: '📧', title: 'Email-нагадування', desc: 'Не забудете про запис завдяки сповіщенням' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex flex-col items-center text-center">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
              <p className="text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Register section */}
      <RegisterSection />

      {/* Footer */}
      <footer className="border-t border-slate-200 pt-8 pb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-1 font-extrabold text-brand">
          Auto<span className="text-accent">Service</span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent mb-1" />
        </div>
        <p className="text-xs text-slate-400">© 2026 AutoService. Всі права захищено.</p>
      </footer>
    </div>
  );
}
