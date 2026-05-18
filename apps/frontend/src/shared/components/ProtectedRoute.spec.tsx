import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuthStore } from '../store/auth.store';

function TestOutlet() {
  return <div>Protected content</div>;
}

function renderWithRouter(
  initialEntry: string,
  allowedRoles?: ('CLIENT' | 'MASTER' | 'ADMIN')[],
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/unauthorized" element={<div>Unauthorized page</div>} />
        <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
          <Route path="/protected" element={<TestOutlet />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null });
  });

  it('redirects to /login when not authenticated', () => {
    renderWithRouter('/protected');
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders Outlet when authenticated with correct role', () => {
    useAuthStore.setState({
      user: { id: 1, email: 'a@b.com', role: 'CLIENT', firstName: 'A', lastName: 'B', emailVerified: true },
      accessToken: 'token',
    });
    renderWithRouter('/protected', ['CLIENT']);
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('redirects to /unauthorized for wrong role', () => {
    useAuthStore.setState({
      user: { id: 1, email: 'a@b.com', role: 'MASTER', firstName: 'A', lastName: 'B', emailVerified: true },
      accessToken: 'token',
    });
    renderWithRouter('/protected', ['CLIENT']);
    expect(screen.getByText('Unauthorized page')).toBeInTheDocument();
  });

  it('renders Outlet when authenticated without role restriction', () => {
    useAuthStore.setState({
      user: { id: 1, email: 'a@b.com', role: 'CLIENT', firstName: 'A', lastName: 'B', emailVerified: true },
      accessToken: 'token',
    });
    renderWithRouter('/protected');
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});
