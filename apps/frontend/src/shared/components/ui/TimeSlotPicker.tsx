interface TimeSlotPickerProps {
  slots: string[];
  value: string | null;
  onChange: (slot: string) => void;
}

export default function TimeSlotPicker({ slots, value, onChange }: TimeSlotPickerProps) {
  if (slots.length === 0) {
    return <p className="text-sm text-slate-500 italic">Вільних слотів немає на цю дату</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {slots.map((slot) => {
        const time = slot.length > 5 ? slot.slice(0, 5) : slot;
        const isSelected = value === slot;
        return (
          <button
            key={slot}
            type="button"
            onClick={() => onChange(slot)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
              ${isSelected
                ? 'bg-accent text-white border-accent'
                : 'bg-white text-slate-700 border-slate-300 hover:border-accent hover:text-accent'
              }`}
          >
            {time}
          </button>
        );
      })}
    </div>
  );
}
