import { useEffect } from 'react';
import { useToastStore } from '../store/toast.store';

function ToastItem({ id, message, type }: { id: string; message: string; type: string }) {
  const remove = useToastStore((s) => s.remove);

  useEffect(() => {
    const t = setTimeout(() => remove(id), 4000);
    return () => clearTimeout(t);
  }, [id, remove]);

  const colorMap: Record<string, string> = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-brand',
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${colorMap[type] ?? 'bg-brand'} animate-fade-in`}
    >
      <span className="flex-1">{message}</span>
      <button
        onClick={() => remove(id)}
        aria-label="Закрити"
        className="opacity-70 hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  );
}
