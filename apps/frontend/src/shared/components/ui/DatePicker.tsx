import { InputHTMLAttributes } from 'react';

interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  minDate?: string;
}

export default function DatePicker({ label, error, minDate, id, className = '', ...props }: DatePickerProps) {
  const today = new Date().toISOString().slice(0, 10);
  const inputId = id ?? 'datepicker';

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">{label}</label>
      )}
      <input
        id={inputId}
        type="date"
        min={minDate ?? today}
        className={`rounded-lg border px-3 py-2 text-sm text-slate-900
          focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition
          ${error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
