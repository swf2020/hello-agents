import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';

vi.mock('../src/api/client', () => ({
  api: {
    getProfile: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    getPosts: vi.fn(),
    createPost: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

import { api } from '../src/api/client';
import Login from '../src/pages/Login';
import Register from '../src/pages/Register';
import Home from '../src/pages/Home';
import NewPost from '../src/pages/NewPost';
import Profile from '../src/pages/Profile';

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
  api.getPosts.mockResolvedValue({ posts: [], total: 0, page: 1, totalPages: 0 });
});

describe('Login Page', () => {
  it('renders login form', () => {
    renderWithRouter(<Login />);
    expect(screen.getByRole('heading', { name: 'Login' })).toBeDefined();
    expect(screen.getByLabelText('Username')).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
  });

  it('submits login form', async () => {
    api.login.mockResolvedValueOnce({ token: 'token123', user: { id: 1, username: 'test', role: 'user' } });

    renderWithRouter(<Login />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Username'), 'testuser');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith({ username: 'testuser', password: 'password123' });
    });
  });

  it('shows error on failed login', async () => {
    api.login.mockRejectedValueOnce(new Error('Invalid credentials'));

    renderWithRouter(<Login />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Username'), 'test');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeDefined();
    });
  });
});

describe('Register Page', () => {
  it('renders register form', () => {
    renderWithRouter(<Register />);
    expect(screen.getByRole('heading', { name: 'Register' })).toBeDefined();
    expect(screen.getByLabelText('Username')).toBeDefined();
    expect(screen.getByLabelText('Email')).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
  });

  it('shows error for short password', async () => {
    renderWithRouter(<Register />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Username'), 'testuser');
    await user.type(screen.getByLabelText('Email'), 'test@test.com');
    await user.type(screen.getByLabelText('Password'), '12345');
    await user.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      expect(screen.getByText(/at least 6 characters/)).toBeDefined();
    });
  });

  it('submits register form successfully', async () => {
    api.register.mockResolvedValueOnce({ token: 'token123', user: { id: 1, username: 'newuser', role: 'user' } });

    renderWithRouter(<Register />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Username'), 'newuser');
    await user.type(screen.getByLabelText('Email'), 'new@test.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith({
        username: 'newuser', password: 'password123', email: 'new@test.com',
      });
    });
  });
});

describe('Home Page', () => {
  it('renders posts list', async () => {
    api.getPosts.mockResolvedValueOnce({
      posts: [
        { id: 1, title: 'First Post', content: 'Hello world', category: 'general', authorName: 'user1', pinned: 0, createdAt: '2024-01-01' },
        { id: 2, title: 'Second Post', content: 'Another post', category: 'tech', authorName: 'user2', pinned: 0, createdAt: '2024-01-02' },
      ],
      total: 2, page: 1, totalPages: 1,
    });

    renderWithRouter(<Home />);

    await waitFor(() => {
      expect(screen.getByText('First Post')).toBeDefined();
      expect(screen.getByText('Second Post')).toBeDefined();
    });
  });

  it('shows category filter buttons', async () => {
    renderWithRouter(<Home />);
    await waitFor(() => {
      expect(screen.getByText('All')).toBeDefined();
    });
    expect(screen.getByText('general')).toBeDefined();
    expect(screen.getByText('tech')).toBeDefined();
  });
});

describe('NewPost Page', () => {
  it('renders create post form', () => {
    renderWithRouter(<NewPost />);
    expect(screen.getByRole('heading', { name: 'Create New Post' })).toBeDefined();
    expect(screen.getByLabelText('Title')).toBeDefined();
    expect(screen.getByLabelText('Content')).toBeDefined();
    expect(screen.getByLabelText('Category')).toBeDefined();
  });

  it('submits new post', async () => {
    api.createPost.mockResolvedValueOnce({ id: 1, title: 'New', content: 'Content', category: 'general' });

    renderWithRouter(<NewPost />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Title'), 'New');
    await user.type(screen.getByLabelText('Content'), 'Content');
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      expect(api.createPost).toHaveBeenCalledWith({
        title: 'New', content: 'Content', category: 'general',
      });
    });
  });
});

describe('Profile Page', () => {
  it('renders profile information when authenticated', async () => {
    localStorage.setItem('token', 'fake-token');
    api.getProfile.mockResolvedValueOnce({
      id: 1, username: 'testuser', email: 'test@test.com', role: 'user', createdAt: '2024-01-01',
    });

    renderWithRouter(<Profile />);

    await waitFor(() => {
      expect(screen.getByText(/testuser/)).toBeDefined();
    });
  });

  it('can update email', async () => {
    localStorage.setItem('token', 'fake-token');
    api.getProfile.mockResolvedValueOnce({
      id: 1, username: 'testuser', email: 'old@test.com', role: 'user', createdAt: '2024-01-01',
    });
    api.updateProfile.mockResolvedValueOnce({
      id: 1, username: 'testuser', email: 'new@test.com', role: 'user', createdAt: '2024-01-01',
    });

    renderWithRouter(<Profile />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeDefined();
    });

    const emailInput = screen.getByLabelText('Email');
    await user.clear(emailInput);
    await user.type(emailInput, 'new@test.com');
    await user.click(screen.getByRole('button', { name: 'Update Profile' }));

    await waitFor(() => {
      expect(api.updateProfile).toHaveBeenCalledWith({ email: 'new@test.com' });
    });
  });
});
