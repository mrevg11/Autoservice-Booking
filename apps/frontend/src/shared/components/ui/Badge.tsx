import type { BookingStatus } from '../../api/endpoints';

interface BadgeProps {
  status: BookingStatus;
}

const statusConfig: Record<BookingStatus, { label: string; classes: string }> = {
  PENDING:     { label: 'Очікує',       classes: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED:   { label: 'Підтверджено', classes: 'bg-blue-100 text-blue-800' },
  IN_PROGRESS: { label: 'Виконується',  classes: 'bg-purple-100 text-purple-800' },
  COMPLETED:   { label: 'Завершено',    classes: 'bg-green-100 text-green-800' },
  CANCELLED:   { label: 'Скасовано',    classes: 'bg-gray-100 text-gray-600' },
};

export default function Badge({ status }: BadgeProps) {
  const cfg = statusConfig[status] ?? { label: status, classes: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}
