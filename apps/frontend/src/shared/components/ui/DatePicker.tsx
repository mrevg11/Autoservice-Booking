import ReactDatePicker, { registerLocale } from 'react-datepicker';
import { uk } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('uk', uk);

interface DatePickerProps {
  label?: string;
  error?: string;
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  min?: string;
  max?: string;
  minDate?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  filterDate?: (date: Date) => boolean;
}

function parseLocalDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function toDateStr(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-CA');
}

export default function DatePicker({ label, error, value, onChange, min, max, minDate, id, className = '', disabled, placeholder, filterDate }: DatePickerProps) {
  const inputId = id ?? 'datepicker';

  const minStr = minDate ?? min;
  const selected = parseLocalDate(value);
  const minDateObj = parseLocalDate(minStr) ?? undefined;
  const maxDateObj = parseLocalDate(max) ?? undefined;

  const handleChange = (date: Date | null) => {
    if (onChange) {
      onChange({ target: { value: toDateStr(date) } });
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">{label}</label>
      )}
      <ReactDatePicker
        id={inputId}
        selected={selected}
        onChange={handleChange}
        locale="uk"
        dateFormat="dd.MM.yyyy"
        minDate={minDateObj}
        maxDate={maxDateObj}
        disabled={disabled}
        filterDate={filterDate}
        placeholderText={placeholder ?? 'дд.мм.рррр'}
        wrapperClassName="w-full"
        popperClassName="z-50"
        className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900
          focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition
          ${error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'}
          ${className}`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
