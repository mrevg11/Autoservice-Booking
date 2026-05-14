import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DatePicker from './DatePicker';

describe('DatePicker', () => {
  it('renders a date input', () => {
    const { container } = render(<DatePicker />);
    expect(container.querySelector('input[type="date"]')).toBeDefined();
  });

  it('renders label when provided', () => {
    render(<DatePicker label="Дата запису" id="booking-date" />);
    expect(screen.getByLabelText('Дата запису')).toBeDefined();
  });

  it('shows error message', () => {
    render(<DatePicker error="Invalid date" />);
    expect(screen.getByText('Invalid date')).toBeDefined();
  });

  it('uses provided minDate', () => {
    render(<DatePicker minDate="2026-01-01" id="dp" />);
    const input = document.getElementById('dp') as HTMLInputElement;
    expect(input?.min).toBe('2026-01-01');
  });

  it('defaults minDate to today when not provided', () => {
    render(<DatePicker id="dp2" />);
    const input = document.getElementById('dp2') as HTMLInputElement;
    const today = new Date().toISOString().slice(0, 10);
    expect(input?.min).toBe(today);
  });
});
