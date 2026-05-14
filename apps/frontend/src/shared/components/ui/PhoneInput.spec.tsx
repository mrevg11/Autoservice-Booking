import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PhoneInput } from './PhoneInput';

// Mock the phone input library which requires CSS and has DOM complexity
vi.mock('react-phone-input-2', () => ({
  default: ({ onChange, value }: { onChange: (v: string) => void; value: string }) => (
    <input
      type="tel"
      data-testid="phone-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

describe('PhoneInput', () => {
  it('renders phone input element', () => {
    render(<PhoneInput value="+380" onChange={() => {}} />);
    expect(screen.getByTestId('phone-input')).toBeDefined();
  });

  it('renders label when provided', () => {
    render(<PhoneInput value="" onChange={() => {}} label="Телефон" />);
    expect(screen.getByText('Телефон')).toBeDefined();
  });

  it('shows error message', () => {
    render(<PhoneInput value="" onChange={() => {}} error="Невірний номер" />);
    expect(screen.getByText('Невірний номер')).toBeDefined();
  });
});
