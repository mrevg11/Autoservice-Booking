import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No data" />);
    expect(screen.getByText('No data')).toBeDefined();
  });

  it('renders optional description', () => {
    render(<EmptyState title="Empty" description="Nothing here yet" />);
    expect(screen.getByText('Nothing here yet')).toBeDefined();
  });

  it('renders icon when provided', () => {
    render(<EmptyState title="Empty" icon={<span data-testid="icon">📭</span>} />);
    expect(screen.getByTestId('icon')).toBeDefined();
  });

  it('renders action when provided', () => {
    render(<EmptyState title="Empty" action={<button>Add item</button>} />);
    expect(screen.getByRole('button', { name: 'Add item' })).toBeDefined();
  });

  it('does not render description when not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole('paragraph')).toBeNull();
  });
});
