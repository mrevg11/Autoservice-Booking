import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useVehicles } from '../../vehicles/hooks/useVehicles';
import { useRecommendations } from '../hooks/useIntelligence';
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

export default function RecommendationsPage() {
  const [selectedServiceId, setSelectedServiceId] = useState<number | undefined>();
  const { data: vehicles } = useVehicles();

  const { data, isLoading } = useRecommendations(selectedServiceId);
  const recommendations = data?.recommendations ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Рекомендовані майстри</h1>
        <p className="text-slate-600 text-sm">Система підбирає майстрів на основі ваших попередніх записів та відгуків</p>
      </div>

      {vehicles?.length === 0 ? (
        <EmptyState
          title="Спочатку додайте авто"
          description="Щоб отримати персоналізовані рекомендації"
          icon="🚗"
          action={<Link to="/client/vehicles"><Button size="sm">Додати авто</Button></Link>}
        />
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-card border border-slate-100 p-4">
            <p className="text-sm font-medium text-slate-700 mb-3">Оберіть послугу для рекомендацій</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 1, name: 'ТО та діагностика' },
                { id: 2, name: 'Ремонт двигуна' },
                { id: 3, name: 'Кузовні роботи' },
              ].map(({ id, name }) => (
                <button
                  key={id}
                  onClick={() => setSelectedServiceId(id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${selectedServiceId === id ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {name}
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
                      <p className="font-bold text-brand">⭐ {rec.rating.toFixed(1)}</p>
                      <p className="text-xs text-slate-500">{rec.experienceYears} р. досвіду</p>
                    </div>
                  </div>

                  <ScoreBar score={rec.score} />

                  <div className="flex flex-wrap gap-1.5">
                    {rec.reasons.map((r, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full">{r}</span>
                    ))}
                  </div>

                  <Link to={`/client/bookings/new?masterId=${rec.masterId}&serviceId=${selectedServiceId}`}>
                    <Button size="sm" className="w-full">Записатися до цього майстра</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
