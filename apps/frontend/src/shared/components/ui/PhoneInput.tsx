interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
}

export function PhoneInput({ value, onChange, error, label }: PhoneInputProps) {
  const localNumber = value.startsWith('+380') ? value.slice(4) : '';

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <div className={`flex items-center rounded-xl border h-10 bg-white overflow-hidden transition
        ${error ? 'border-red-400 bg-red-50 focus-within:ring-2 focus-within:ring-red-200' : 'border-slate-300 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20'}`}>
        <span className="px-3 shrink-0 text-sm text-slate-600 font-medium select-none border-r border-slate-200 h-full flex items-center bg-slate-50">
          🇺🇦 +380
        </span>
        <input
          type="tel"
          placeholder="XX XXX XX XX"
          maxLength={9}
          className="flex-1 px-3 outline-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 h-full"
          value={localNumber}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
            onChange(digits ? '+380' + digits : '');
          }}
        />
      </div>
      {error && <span className="text-xs text-red-500 mt-0.5">{error}</span>}
    </div>
  );
}
