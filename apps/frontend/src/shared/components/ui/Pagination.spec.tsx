import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from './Pagination';

describe('Pagination', () => {
  it('renders nothing when totalPages <= 1', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders page buttons', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('disables "prev" on first page', () => {
    render(<Pagination page={1} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByLabelText('Попередня сторінка')).toBeDisabled();
  });

  it('disables "next" on last page', () => {
    render(<Pagination page={5} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByLabelText('Наступна сторінка')).toBeDisabled();
  });

  it('calls onPageChange with correct page when clicking next', () => {
    const onChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Наступна сторінка'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('marks current page as active', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={vi.fn()} />);
    const activeBtn = screen.getByText('2');
    expect(activeBtn.className).toContain('bg-accent');
  });
});
