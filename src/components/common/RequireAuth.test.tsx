import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { useAuth } from '@/hooks/use-auth';
import { makeUser } from '@/test/factories';

// The auth hook is stubbed so these tests cover the guard's own logic.
vi.mock('@/hooks/use-auth', () => ({ useAuth: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);

function renderGuard(roles?: Array<'tenant' | 'landlord' | 'agent' | 'admin'>) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/protected" element={<RequireAuth roles={roles}>secret</RequireAuth>} />
        <Route path="/auth" element={<div>sign in</div>} />
        <Route path="/dashboard" element={<div>dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RequireAuth', () => {
  it('waits while the session is being restored', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    } as unknown as ReturnType<typeof useAuth>);

    renderGuard();
    expect(screen.getByText('Checking your session\u2026')).toBeInTheDocument();
  });

  it('sends anonymous visitors to sign in', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);

    renderGuard();
    expect(screen.getByText('sign in')).toBeInTheDocument();
  });

  it('renders the protected content for an allowed role', () => {
    mockedUseAuth.mockReturnValue({
      user: makeUser({ role: 'landlord' }),
      isAuthenticated: true,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);

    renderGuard(['landlord', 'agent']);
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('redirects a user whose role is not allowed', () => {
    mockedUseAuth.mockReturnValue({
      user: makeUser({ role: 'tenant' }),
      isAuthenticated: true,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);

    renderGuard(['admin']);
    expect(screen.getByText('dashboard')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });
});
