import { Link } from 'react-router-dom';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useMyBookings } from '../../bookings/hooks/useBookings';
import { useVehicles } from '../../vehicles/hooks/useVehicles';
import Badge from '../../../shared/components/ui/Badge';
import Spinner from '../../../shared/components/ui/Spinner';
import EmptyState from '../../../shared/components/ui/EmptyState';
import Button from '../../../shared/components/ui/Button';

export default function ClientDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useMyBookings({ limit: 3, page: 1 });
  const { data: vehicles } = useVehicles();

  const activeBookings = data?.data.filter((b) =>
    ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status),
  ) ?? [];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="bg-brand text-white rounded-2xl p-6">
        <h1 className="text-2xl font-extrabold mb-1">
          Вітаємо, {user?.firstName}! 👋
        </h1>
        <p className="text-white/70 text-sm">Керуйте своїми записами та автомобілями</p>
        <div className="mt-4 flex gap-3 flex-wrap">
          <Link
            to="/client/bookings/new"
            className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
          >
            + Новий запис
          </Link>
          <Link
            to="/client/bookings/smart"
            className="px-4 py-2 bg-white/15 text-white text-sm font-medium rounded-lg hover:bg-white/25 transition-colors"
          >
            🤖 Розумний підбір
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Активних записів', value: activeBookings.length, to: '/client/bookings' },
          { label: 'Завершених', value: data?.data.filter((b) => b.status === 'COMPLETED').length ?? 0, to: '/client/bookings?status=COMPLETED' },
          { label: 'Автомобілів', value: vehicles?.length ?? 0, to: '/client/vehicles' },
        ].map(({ label, value, to }) => (
          <Link
            key={label}
            to={to}
            className="bg-white rounded-xl shadow-card border border-slate-100 p-5 hover:border-accent/30 transition-colors"
          >
            <p className="text-3xl font-extrabold text-brand">{value}</p>
            <p className="text-sm text-slate-500 mt-1">{label}</p>
          </Link>
        ))}
      </div>

      {/* Recent bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Останні записи</h2>
          <Link to="/client/bookings" className="text-sm text-accent hover:underline">
            Всі записи →
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner size="md" /></div>
        ) : data?.data.length === 0 ? (
          <EmptyState
            title="Записів поки немає"
            description="Запишіться на перше ТО прямо зараз"
            icon="📅"
            action={
              <Button onClick={() => {}}>
                <Link to="/client/bookings/new">Записатися</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {data?.data.map((booking) => (
              <Link
                key={booking.id}
                to={`/client/bookings/${booking.id}`}
                className="bg-white rounded-xl shadow-card border border-slate-100 p-4 flex items-center justify-between hover:border-accent/30 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge status={booking.status} />
                    <span className="text-sm font-medium text-slate-900">
                      {booking.master?.user.firstName} {booking.master?.user.lastName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {new Date(booking.scheduledAt).toLocaleDateString('uk-UA', {
                      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kiev',
                    })}
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-900">{booking.totalPrice} грн</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
