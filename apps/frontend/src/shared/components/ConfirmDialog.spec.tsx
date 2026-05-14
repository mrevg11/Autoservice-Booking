import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Підтвердити дію',
    message: 'Ви впевнені?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders when isOpen=true', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Підтвердити дію')).toBeDefined();
    expect(screen.getByText('Ви впевнені?')).toBeDefined();
  });

  it('does not render when isOpen=false', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Підтвердити дію')).toBeNull();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Підтвердити'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Скасувати'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when backdrop clicked', () => {
    const onCancel = vi.fn();
    const { container } = render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    // The outermost div is the backdrop
    const backdrop = container.firstChild as HTMLElement;
    if (backdrop) fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalled();
  });

  it('closes on Escape key press', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders custom labels', () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Видалити" cancelLabel="Ні" />);
    expect(screen.getByText('Видалити')).toBeDefined();
    expect(screen.getByText('Ні')).toBeDefined();
  });
});
