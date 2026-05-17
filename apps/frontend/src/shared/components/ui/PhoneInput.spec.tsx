import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PhoneInput } from './PhoneInput';

describe('PhoneInput', () => {
  it('renders with UA prefix', () => {
    render(<PhoneInput value="" onChange={() => {}} />);
    expect(screen.getByText('🇺🇦 +380')).toBeDefined();
  });

  it('renders label when provided', () => {
    render(<PhoneInput value="" onChange={() => {}} label="Телефон" />);
    expect(screen.getByText('Телефон')).toBeDefined();
  });

  it('shows error message', () => {
    render(<PhoneInput value="" onChange={() => {}} error="Невірний номер" />);
    expect(screen.getByText('Невірний номер')).toBeDefined();
  });

  it('calls onChange with +380 prefix', () => {
    const onChange = vi.fn();
    render(<PhoneInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('XX XXX XX XX'), { target: { value: '671234567' } });
    expect(onChange).toHaveBeenCalledWith('+380671234567');
  });

  it('strips existing +380 from displayed value', () => {
    render(<PhoneInput value="+380671234567" onChange={() => {}} />);
    const input = screen.getByPlaceholderText('XX XXX XX XX') as HTMLInputElement;
    expect(input.value).toBe('671234567');
  });
});
