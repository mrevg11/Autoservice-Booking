import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useVehicles } from '../../vehicles/hooks/useVehicles';
import { useRecommendations, useServiceReminders } from '../hooks/useIntelligence';
import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '../../../shared/api/endpoints';
import Spinner from '../../../shared/components/ui/Spinner';
import EmptyState from '../../../shared/components/ui/EmptyState';
import Button from '../../../shared/components/ui/Button';

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span>Відповідність</span>
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-medium text-slate-700">{pct}%</span>
    </div>
  );
}

function ReminderCard({ reminder }: { reminder: { serviceId: number; serviceName: string; lastServiceDate: string; nextRecommendedDate: string; daysOverdue: number; isOverdue: boolean; lastBookingId: number } }) {
  const urgentClass = reminder.isOverdue
    ? 'border-red-200 bg-red-50'
    : 'border-yellow-200 bg-yellow-50';
  const badgeClass = reminder.isOverdue
    ? 'bg-red-100 text-red-700'
    : 'bg-yellow-100 text-yellow-700';

  return (
    <div className={`rounded-xl border p-4 flex items-start justify-between gap-4 ${urgentClass}`}>
      <div className="space-y-1 min-w-0">
        <p className="font-semibold text-slate-900 truncate">{reminder.serviceName}</p>
        <p className="text-xs text-slate-500">
          Останнє обслуговування: {new Date(reminder.lastServiceDate).toLocaleDateString('uk-UA')}
        </p>
        <p className="text-xs text-slate-500">
          Рекомендовано до: {new Date(reminder.nextRecommendedDate).toLocaleDateString('uk-UA')}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
          {reminder.isOverdue
            ? `Прострочено на ${reminder.daysOverdue} дн.`
            : 'Незабаром'}
        </span>
        <Link to={`/client/bookings/new?serviceIds=${reminder.serviceId}`}>
          <Button size="sm" variant="outline">Записатися</Button>
        </Link>
      </div>
    </div>
  );
}

export default function RecommendationsPage() {
  const [selectedServiceId, setSelectedServiceId] = useState<number | undefined>();
  const { data: vehicles } = useVehicles();
  const { data: reminders, isLoading: remindersLoading } = useServiceReminders();
  const { data: servicesPage } = useQuery({
    queryKey: ['services', 'all-active'],
    queryFn: () => servicesApi.getServices({ isActive: true, limit: 100 }).then((r) => r.data),
  });
  const services = servicesPage?.data ?? [];

  const { data, isLoading } = useRecommendations(selectedServiceId);
  const recommendations = data?.recommendations ?? [];

  const hasReminders = (reminders?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Рекомендації</h1>
        <p className="text-slate-600 text-sm">Персоналізовані нагадування та підбір майстрів на основі вашої історії</p>
      </div>

      {/* ── Reminders section ── */}
      {remindersLoading && (
        <div className="flex justify-center py-6"><Spinner size="md" /></div>
      )}
      {!remindersLoading && hasReminders && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-800">Нагадування про обслуговування</h2>
          {reminders!.map((r) => (
            <ReminderCard key={r.serviceId} reminder={r} />
          ))}
        </div>
      )}

      {/* ── Master recommendations section ── */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Рекомендовані майстри</h2>
        {vehicles?.length === 0 ? (
          <EmptyState
            title="Спочатку додайте авто"
            description="Щоб отримати персоналізовані рекомендації"
            icon="🚗"
            action={<Link to="/client/vehicles"><Button size="sm">Додати авто</Button></Link>}
          />
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-card border border-slate-100 p-4 mb-4">
              <p className="text-sm font-medium text-slate-700 mb-3">Оберіть послугу для рекомендацій</p>
              <div className="flex flex-wrap gap-2">
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => setSelectedServiceId(svc.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                      ${selectedServiceId === svc.id ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {svc.name}
                  </button>
                ))}
              </div>
            </div>

            {!selectedServiceId && (
              <EmptyState title="Оберіть послугу" description="Щоб побачити рекомендованих майстрів" icon="🔍" />
            )}

            {selectedServiceId && isLoading && (
              <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            )}

            {selectedServiceId && !isLoading && recommendations.length === 0 && (
              <EmptyState title="Рекомендацій немає" description="Недостатньо даних для підбору" icon="🤖" />
            )}

            {recommendations.length > 0 && (
              <div className="space-y-4">
                {recommendations.map((rec) => (
                  <div key={rec.masterId} className="bg-white rounded-xl shadow-card border border-slate-100 p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
                          {rec.masterName.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{rec.masterName}</p>
                          {rec.specialization && <p className="text-xs text-slate-500">{rec.specialization}</p>}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-bold text-brand">⭐ {Number(rec.rating ?? 0).toFixed(1)}</p>
                        <p className="text-xs text-slate-500">{Number(rec.experienceYears ?? 0)} р. досвіду</p>
                      </div>
                    </div>

                    <ScoreBar score={rec.score} />

                    <div className="flex flex-wrap gap-1.5">
                      {rec.reasons.map((r, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full">{r}</span>
                      ))}
                    </div>

                    <Link to={`/client/bookings/new?masterId=${rec.masterId}&serviceIds=${selectedServiceId}`}>
                      <Button size="sm" className="w-full">Записатися до цього майстра</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
