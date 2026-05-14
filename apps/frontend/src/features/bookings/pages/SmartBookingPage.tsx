import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useVehicles } from '../../vehicles/hooks/useVehicles';
import { useServices, useCategories } from '../../services/hooks/useServices';
import { intelligenceApi, SlotSuggestion, ServiceItem } from '../../../shared/api/endpoints';
import Button from '../../../shared/components/ui/Button';
import DatePicker from '../../../shared/components/ui/DatePicker';
import EmptyState from '../../../shared/components/ui/EmptyState';
import Spinner from '../../../shared/components/ui/Spinner';

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-medium">{pct}%</span>
    </div>
  );
}

function SlotCard({ suggestion, onChoose }: { suggestion: SlotSuggestion; onChoose: () => void }) {
  const start = new Date(suggestion.startAt);
  const end = new Date(suggestion.endAt);

  return (
    <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-900">{suggestion.masterName}</p>
          <p className="text-sm text-slate-500 mt-0.5">
            📅 {start.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })},{' '}
            {start.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
            {' – '}
            {end.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 mb-0.5">Відповідність</p>
          <p className="font-bold text-brand">{Math.round(suggestion.score * 100)}%</p>
        </div>
      </div>
      <ScoreBar score={suggestion.score} />
      <div className="flex flex-wrap gap-1.5">
        {suggestion.reasons.map((r, i) => (
          <span key={i} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{r}</span>
        ))}
      </div>
      <Button size="sm" className="w-full" onClick={onChoose}>
        Обрати цей варіант
      </Button>
    </div>
  );
}

export default function SmartBookingPage() {
  const navigate = useNavigate();
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | undefined>();
  const [preferredDate, setPreferredDate] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<number | undefined>();
  const [searched, setSearched] = useState(false);

  const { data: vehicles } = useVehicles();
  const { data: categories } = useCategories();
  const { data: servicesData } = useServices({ categoryId: activeCategoryId, isActive: true, limit: 50 });

  const selectedVehicle = vehicles?.find((v) => v.id === selectedVehicleId);

  const { data: suggestions, isFetching, refetch } = useQuery({
    queryKey: ['suggestSlots', selectedServiceIds[0], preferredDate, selectedVehicle?.year],
    queryFn: () =>
      intelligenceApi.suggestSlots(selectedServiceIds[0], preferredDate || new Date().toISOString().slice(0, 10), selectedVehicle?.year)
        .then((r) => r.data),
    enabled: false,
  });

  const handleSearch = () => {
    setSearched(true);
    refetch();
  };

  const handleChoose = (s: SlotSuggestion) => {
    const params = new URLSearchParams({
      masterId: String(s.masterId),
      date: s.startAt.slice(0, 10),
      slot: s.startAt.slice(11, 16),
      serviceIds: selectedServiceIds.join(','),
      vehicleId: selectedVehicleId ? String(selectedVehicleId) : '',
    });
    navigate(`/client/bookings/new?${params}`);
  };

  const services = servicesData?.data ?? [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">🤖 Розумний підбір часу</h1>
      <p className="text-slate-600 text-sm">Оберіть послуги і авто — система знайде найкращого майстра і вільний час.</p>

      {/* Vehicle */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Автомобіль (необов'язково)</label>
        <select
          value={selectedVehicleId ?? ''}
          onChange={(e) => setSelectedVehicleId(e.target.value ? Number(e.target.value) : undefined)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">Не вказано</option>
          {(vehicles ?? []).map((v) => (
            <option key={v.id} value={v.id}>{v.make} {v.model} ({v.year})</option>
          ))}
        </select>
      </div>

      {/* Services */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">Послуги</label>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveCategoryId(undefined)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!activeCategoryId ? 'bg-accent text-white' : 'bg-white border border-slate-300 text-slate-600'}`}>
            Усі
          </button>
          {(categories ?? []).map((cat) => (
            <button key={cat.id} onClick={() => setActiveCategoryId(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeCategoryId === cat.id ? 'bg-accent text-white' : 'bg-white border border-slate-300 text-slate-600'}`}>
              {cat.name}
            </button>
          ))}
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {services.map((s: ServiceItem) => {
            const sel = selectedServiceIds.includes(s.id);
            return (
              <button key={s.id} onClick={() =>
                setSelectedServiceIds((prev) => sel ? prev.filter((id) => id !== s.id) : [...prev, s.id])
              }
                className={`w-full text-left p-3 rounded-lg border transition-colors text-sm
                  ${sel ? 'border-accent bg-accent/5' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <span className="font-medium">{s.name}</span>
                <span className="text-slate-500 ml-2">{s.baseDurationMinutes} хв</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date */}
      <DatePicker label="Бажана дата (необов'язково)" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />

      <Button
        onClick={handleSearch}
        disabled={selectedServiceIds.length === 0}
        isLoading={isFetching}
        className="w-full"
        size="lg"
      >
        Знайти найкращий час
      </Button>

      {/* Results */}
      {isFetching && <div className="flex justify-center py-8"><Spinner size="lg" /></div>}

      {searched && !isFetching && suggestions && (
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-900">Результати ({suggestions.suggestions.length})</h2>
          {suggestions.suggestions.length === 0 ? (
            <EmptyState title="Слотів не знайдено" description="Спробуйте інші послуги або дату" icon="🔍" />
          ) : (
            suggestions.suggestions.map((s, i) => (
              <SlotCard key={i} suggestion={s} onChoose={() => handleChoose(s)} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
