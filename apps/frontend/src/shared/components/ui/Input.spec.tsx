import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Input from './Input';

describe('Input', () => {
  it('renders without label', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeDefined();
  });

  it('renders label and associates it with input', () => {
    render(<Input label="Email" id="email" />);
    expect(screen.getByLabelText('Email')).toBeDefined();
  });

  it('shows error message', () => {
    render(<Input error="Required field" />);
    expect(screen.getByText('Required field')).toBeDefined();
  });

  it('shows hint when no error', () => {
    render(<Input hint="Enter your full name" />);
    expect(screen.getByText('Enter your full name')).toBeDefined();
  });

  it('does not show hint when error is present', () => {
    render(<Input hint="Hint text" error="Error text" />);
    expect(screen.queryByText('Hint text')).toBeNull();
    expect(screen.getByText('Error text')).toBeDefined();
  });

  it('renders leftIcon', () => {
    render(<Input leftIcon={<span data-testid="left-icon">@</span>} />);
    expect(screen.getByTestId('left-icon')).toBeDefined();
  });

  it('renders rightIcon', () => {
    render(<Input rightIcon={<span data-testid="right-icon">x</span>} />);
    expect(screen.getByTestId('right-icon')).toBeDefined();
  });
});
