import { useState } from 'react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'text-base', md: 'text-xl', lg: 'text-3xl' };

export default function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const displayed = hover || value;

  return (
    <div className={`flex gap-0.5 ${sizes[size]}`} role="group" aria-label={`Рейтинг: ${value} з 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} зірка`}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          tabIndex={readonly ? -1 : 0}
          disabled={readonly}
        >
          <span className={star <= displayed ? 'text-yellow-400' : 'text-slate-300'}>★</span>
        </button>
      ))}
    </div>
  );
}
