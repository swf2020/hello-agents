import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';
import Navbar from '../src/components/Navbar';

vi.mock('../src/api/client', () => ({
  api: {
    getProfile: vi.fn(),
  },
}));

import { api } from '../src/api/client';

function renderWithRouter(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  api.getProfile.mockRejectedValue(new Error('No token'));
});

describe('Navbar', () => {
  it('renders login and register links when not authenticated', () => {
    renderWithRouter(<Navbar />);
    expect(screen.getByText('BBS')).toBeDefined();
    expect(screen.getByText('Login')).toBeDefined();
    expect(screen.getByText('Register')).toBeDefined();
  });

  it('renders username and logout when authenticated', async () => {
    localStorage.setItem('token', 'fake-token');
    api.getProfile.mockResolvedValueOnce({
      id: 1, username: 'testuser', email: 'test@test.com', role: 'user',
    });

    renderWithRouter(<Navbar />);

    const username = await screen.findByText('testuser');
    expect(username).toBeDefined();
    expect(screen.getByText('Logout')).toBeDefined();
  });
});
