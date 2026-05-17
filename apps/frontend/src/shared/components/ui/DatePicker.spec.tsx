import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DatePicker from './DatePicker';

describe('DatePicker', () => {
  it('renders a text input', () => {
    const { container } = render(<DatePicker />);
    expect(container.querySelector('input')).toBeDefined();
  });

  it('renders label when provided', () => {
    render(<DatePicker label="Дата запису" id="booking-date" />);
    expect(screen.getByText('Дата запису')).toBeDefined();
  });

  it('shows error message', () => {
    render(<DatePicker error="Invalid date" />);
    expect(screen.getByText('Invalid date')).toBeDefined();
  });

  it('renders with placeholder when no value', () => {
    const { container } = render(<DatePicker id="dp" />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input?.placeholder).toBe('дд.мм.рррр');
  });

  it('accepts and displays a value', () => {
    const { container } = render(<DatePicker value="2026-05-19" id="dp2" />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input?.value).toBe('19.05.2026');
  });
});
