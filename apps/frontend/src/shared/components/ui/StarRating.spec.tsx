import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StarRating from './StarRating';

describe('StarRating', () => {
  it('renders 5 star buttons', () => {
    render(<StarRating value={3} />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('highlights stars up to value', () => {
    render(<StarRating value={3} />);
    const buttons = screen.getAllByRole('button');
    const filled = buttons.filter((b) => b.querySelector('span')?.className.includes('yellow'));
    expect(filled).toHaveLength(3);
  });

  it('calls onChange when clicked (not readonly)', () => {
    const onChange = vi.fn();
    render(<StarRating value={2} onChange={onChange} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[4]);
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('does NOT call onChange when readonly', () => {
    const onChange = vi.fn();
    render(<StarRating value={3} readonly onChange={onChange} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders correct aria-label for group', () => {
    render(<StarRating value={4} />);
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Рейтинг: 4 з 5');
  });
});
