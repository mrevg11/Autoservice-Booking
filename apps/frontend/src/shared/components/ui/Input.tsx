import { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export default function Input({ label, error, hint, leftIcon, rightIcon, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-slate-400 pointer-events-none">{leftIcon}</span>
        )}
        <input
          id={inputId}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition
            ${leftIcon ? 'pl-9' : ''} ${rightIcon ? 'pr-9' : ''}
            ${error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'}
            ${className}`}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 text-slate-400 pointer-events-none">{rightIcon}</span>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
