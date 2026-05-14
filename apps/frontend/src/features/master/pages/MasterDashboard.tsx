import { Link } from 'react-router-dom';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useMyBookings } from '../../bookings/hooks/useBookings';
import Badge from '../../../shared/components/ui/Badge';
import Spinner from '../../../shared/components/ui/Spinner';

export default function MasterDashboard() {
  const { user } = useAuth();

  const today = new Date().toISOString().slice(0, 10);
  const { data, isLoading } = useMyBookings({ limit: 20, page: 1 });

  const todayBookings = (data?.data ?? []).filter((b) =>
    b.scheduledAt.startsWith(today),
  ).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const confirmed = todayBookings.filter((b) => b.status === 'CONFIRMED').length;
  const completed = todayBookings.filter((b) => b.status === 'COMPLETED').length;

  const nextBooking = todayBookings.find((b) => ['CONFIRMED', 'PENDING'].includes(b.status));

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Доброго ранку';
    if (h < 18) return 'Доброго дня';
    return 'Доброго вечора';
  };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="bg-brand text-white rounded-2xl p-6">
        <h1 className="text-2xl font-extrabold mb-1">{greet()}, {user?.firstName}! 🔧</h1>
        <p className="text-white/70 text-sm">Сьогодні {new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', weekday: 'long' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Записів сьогодні', value: todayBookings.length },
          { label: 'Підтверджено', value: confirmed },
          { label: 'Завершено', value: completed },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl shadow-card border border-slate-100 p-4 text-center">
            <p className="text-3xl font-extrabold text-brand">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Next booking */}
      {nextBooking && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-5">
          <p className="text-xs font-semibold text-accent mb-2">НАСТУПНИЙ ЗАПИС</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">
                {nextBooking.client?.firstName} {nextBooking.client?.lastName}
              </p>
              <p className="text-sm text-slate-600">
                {new Date(nextBooking.scheduledAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                {' · '}
                {nextBooking.vehicle?.make} {nextBooking.vehicle?.model}
              </p>
            </div>
            <Link to={`/master/bookings/${nextBooking.id}`}>
              <Badge status={nextBooking.status} />
            </Link>
          </div>
        </div>
      )}

      {/* Today's bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Записи на сьогодні</h2>
          <Link to="/master/bookings" className="text-sm text-accent hover:underline">Всі записи →</Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : todayBookings.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">На сьогодні записів немає</div>
        ) : (
          <div className="space-y-3">
            {todayBookings.map((b) => (
              <Link
                key={b.id}
                to={`/master/bookings/${b.id}`}
                className="bg-white rounded-xl shadow-card border border-slate-100 p-4 flex items-center justify-between hover:border-accent/30 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-slate-900">
                      {new Date(b.scheduledAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <Badge status={b.status} />
                  </div>
                  <p className="text-sm text-slate-600">{b.client?.firstName} {b.client?.lastName}</p>
                  <p className="text-xs text-slate-400">{b.vehicle?.make} {b.vehicle?.model} ({b.vehicle?.year})</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900 text-sm">{b.totalPrice} грн</p>
                  <p className="text-xs text-slate-500">{b.estimatedDurationMinutes} хв</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
