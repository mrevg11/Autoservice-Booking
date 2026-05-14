import PhoneInputLib from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
}

export function PhoneInput({ value, onChange, error, label }: PhoneInputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <PhoneInputLib
        country="ua"
        value={value}
        onChange={(phone) => onChange('+' + phone)}
        enableSearch
        searchPlaceholder="Пошук країни..."
        preferredCountries={['ua', 'pl', 'de', 'us', 'gb']}
        inputClass={`phone-lib-input${error ? ' phone-lib-input--error' : ''}`}
        containerClass="phone-lib-container"
        buttonClass="phone-lib-button"
        dropdownClass="phone-lib-dropdown"
      />
      {error && <span className="text-xs text-red-500 mt-0.5">{error}</span>}
    </div>
  );
}
