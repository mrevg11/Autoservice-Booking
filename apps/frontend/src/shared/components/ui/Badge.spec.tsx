import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from './Badge';

describe('Badge', () => {
  it('renders PENDING as "Очікує" with yellow classes', () => {
    render(<Badge status="PENDING" />);
    const el = screen.getByText('Очікує');
    expect(el).toBeInTheDocument();
    expect(el.className).toContain('yellow');
  });

  it('renders COMPLETED as "Завершено" with green classes', () => {
    render(<Badge status="COMPLETED" />);
    const el = screen.getByText('Завершено');
    expect(el).toBeInTheDocument();
    expect(el.className).toContain('green');
  });

  it('renders CONFIRMED with blue classes', () => {
    render(<Badge status="CONFIRMED" />);
    const el = screen.getByText('Підтверджено');
    expect(el.className).toContain('blue');
  });

  it('renders IN_PROGRESS with purple classes', () => {
    render(<Badge status="IN_PROGRESS" />);
    const el = screen.getByText('Виконується');
    expect(el.className).toContain('purple');
  });

  it('renders CANCELLED with gray classes', () => {
    render(<Badge status="CANCELLED" />);
    const el = screen.getByText('Скасовано');
    expect(el.className).toContain('gray');
  });
});
