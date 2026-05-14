import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ToastContainer from './Toast';
import { useToastStore } from '../store/toast.store';

// Reset Zustand store before each test
beforeEach(() => {
  useToastStore.setState({ toasts: [] });
});

describe('ToastContainer', () => {
  it('renders nothing when no toasts', () => {
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a success toast', () => {
    useToastStore.setState({
      toasts: [{ id: '1', message: 'Успіх!', type: 'success' }],
    });
    render(<ToastContainer />);
    expect(screen.getByText('Успіх!')).toBeDefined();
  });

  it('renders an error toast', () => {
    useToastStore.setState({
      toasts: [{ id: '2', message: 'Помилка!', type: 'error' }],
    });
    render(<ToastContainer />);
    expect(screen.getByText('Помилка!')).toBeDefined();
  });

  it('removes toast when close button is clicked', async () => {
    useToastStore.setState({
      toasts: [{ id: '3', message: 'Закрити мене', type: 'info' }],
    });
    render(<ToastContainer />);
    const closeBtn = screen.getByLabelText('Закрити');
    await act(async () => {
      fireEvent.click(closeBtn);
    });
    expect(screen.queryByText('Закрити мене')).toBeNull();
  });

  it('renders multiple toasts', () => {
    useToastStore.setState({
      toasts: [
        { id: '4', message: 'Перше', type: 'info' },
        { id: '5', message: 'Друге', type: 'success' },
      ],
    });
    render(<ToastContainer />);
    expect(screen.getByText('Перше')).toBeDefined();
    expect(screen.getByText('Друге')).toBeDefined();
  });

  it('auto-removes toast after 4 seconds', async () => {
    vi.useFakeTimers();
    useToastStore.setState({
      toasts: [{ id: '6', message: 'Тимчасово', type: 'info' }],
    });
    render(<ToastContainer />);
    expect(screen.getByText('Тимчасово')).toBeDefined();
    await act(async () => {
      vi.advanceTimersByTime(4100);
    });
    expect(screen.queryByText('Тимчасово')).toBeNull();
    vi.useRealTimers();
  });
});
