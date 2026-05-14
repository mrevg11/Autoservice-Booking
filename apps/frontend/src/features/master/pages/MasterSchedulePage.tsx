import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mastersApi, ScheduleEntry } from '../../../shared/api/endpoints';
import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';
import { toast } from '../../../shared/store/toast.store';

const WEEKDAYS = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота', 'Неділя'];

const DEFAULT_ENTRIES: ScheduleEntry[] = Array.from({ length: 5 }, (_, i) => ({
  weekday: i,
  startTime: '09:00',
  endTime: '18:00',
  isActive: true,
}));

export default function MasterSchedulePage() {
  const qc = useQueryClient();

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['mySchedule'],
    queryFn: () => mastersApi.getMySchedule().then((r) => r.data),
  });

  const [entries, setEntries] = useState<ScheduleEntry[]>(DEFAULT_ENTRIES);

  const saveMutation = useMutation({
    mutationFn: (data: ScheduleEntry[]) => mastersApi.setSchedule(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mySchedule'] });
      toast('Розклад збережено', 'success');
    },
    onError: () => toast('Помилка збереження', 'error'),
  });

  const addDayOffMutation = useMutation({
    mutationFn: ({ date, reason }: { date: string; reason?: string }) =>
      mastersApi.addDayOff(date, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dayOffs'] }); toast('Вихідний додано', 'success'); },
    onError: () => toast('Помилка', 'error'),
  });

  const [dayOffDate, setDayOffDate] = useState('');

  const effectiveEntries = schedule && schedule.length > 0 ? schedule : entries;

  const updateEntry = (weekday: number, field: keyof ScheduleEntry, value: string | boolean) => {
    setEntries((prev) => prev.map((e) => e.weekday === weekday ? { ...e, [field]: value } : e));
  };

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">Мій розклад</h1>

      <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Робочі дні і години</h2>
        <div className="space-y-3">
          {Array.from({ length: 7 }, (_, i) => {
            const entry = effectiveEntries.find((e) => e.weekday === i);
            const isActive = entry?.isActive ?? false;

            return (
              <div key={i} className="flex items-center gap-4">
                <div className="w-24 text-sm text-slate-700">{WEEKDAYS[i]}</div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => updateEntry(i, 'isActive', e.target.checked)}
                  className="accent-accent"
                  aria-label={`Робочий ${WEEKDAYS[i]}`}
                />
                {isActive ? (
                  <>
                    <input
                      type="time"
                      value={entry?.startTime?.slice(0, 5) ?? '09:00'}
                      onChange={(e) => updateEntry(i, 'startTime', e.target.value)}
                      className="border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      aria-label="Час початку"
                    />
                    <span className="text-slate-400">–</span>
                    <input
                      type="time"
                      value={entry?.endTime?.slice(0, 5) ?? '18:00'}
                      onChange={(e) => updateEntry(i, 'endTime', e.target.value)}
                      className="border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      aria-label="Час кінця"
                    />
                  </>
                ) : (
                  <span className="text-sm text-slate-400">Вихідний</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <Button
            onClick={() => saveMutation.mutate(entries.filter((e) => e.isActive))}
            isLoading={saveMutation.isPending}
          >
            Зберегти розклад
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Додати вихідний день</h2>
        <div className="flex gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Дата</label>
            <input
              type="date"
              value={dayOffDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDayOffDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <Button
            size="sm"
            disabled={!dayOffDate}
            isLoading={addDayOffMutation.isPending}
            onClick={() => addDayOffMutation.mutate({ date: dayOffDate })}
          >
            Додати
          </Button>
        </div>
      </div>
    </div>
  );
}
