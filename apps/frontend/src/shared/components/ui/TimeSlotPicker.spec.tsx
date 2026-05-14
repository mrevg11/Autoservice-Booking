import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TimeSlotPicker from './TimeSlotPicker';

describe('TimeSlotPicker', () => {
  it('renders "no slots" message when slots array is empty', () => {
    render(<TimeSlotPicker slots={[]} value={null} onChange={vi.fn()} />);
    expect(screen.getByText('Вільних слотів немає на цю дату')).toBeInTheDocument();
  });

  it('renders slot buttons', () => {
    render(<TimeSlotPicker slots={['09:00', '09:30', '10:00']} value={null} onChange={vi.fn()} />);
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('09:30')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });

  it('calls onChange with selected slot', () => {
    const onChange = vi.fn();
    render(<TimeSlotPicker slots={['09:00', '10:00']} value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('10:00'));
    expect(onChange).toHaveBeenCalledWith('10:00');
  });

  it('marks selected slot with accent class', () => {
    render(<TimeSlotPicker slots={['09:00', '10:00']} value="09:00" onChange={vi.fn()} />);
    const selected = screen.getByText('09:00');
    expect(selected.className).toContain('bg-accent');
  });
});
