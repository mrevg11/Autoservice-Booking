interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'accent' | 'white' | 'brand';
}

const sizes = { sm: 16, md: 24, lg: 40 };
const colors = { accent: '#f97316', white: '#ffffff', brand: '#1a2744' };

export default function Spinner({ size = 'md', color = 'accent' }: SpinnerProps) {
  const px = sizes[size];
  const c = colors[color];

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Завантаження"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke={c} strokeWidth="2.5" strokeOpacity="0.2" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke={c}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
