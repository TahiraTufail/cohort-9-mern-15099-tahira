import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { login as apiLogin, register as apiRegister } from '../services/authService';

jest.mock('../services/authService', () => ({
  login: jest.fn(),
  register: jest.fn(),
}));

const AuthConsumer = () => {
  const { isAuthenticated, loading, user, login, register, logout } = useAuth();

  return (
    <>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{user?.name || 'none'}</span>
      <button type="button" onClick={() => login('jane@example.com', 'Password123')}>Login</button>
      <button type="button" onClick={() => register('Jane', 'jane@example.com', 'Password123')}>Register</button>
      <button type="button" onClick={logout}>Logout</button>
    </>
  );
};

const renderProvider = () => render(<AuthProvider><AuthConsumer /></AuthProvider>);

describe('AuthContext', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('restores a valid persisted session', async () => {
    localStorage.setItem('notes_token', 'stored-token');
    localStorage.setItem('notes_user', JSON.stringify({ name: 'Stored Jane' }));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('user')).toHaveTextContent('Stored Jane');
  });

  test('clears an invalid persisted session', async () => {
    localStorage.setItem('notes_token', 'stored-token');
    localStorage.setItem('notes_user', 'not-json');

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(localStorage.getItem('notes_token')).toBeNull();
  });

  test('persists a session after login and removes it on logout', async () => {
    apiLogin.mockResolvedValue({ data: { token: 'login-token', user: { name: 'Jane' } } });
    renderProvider();

    await act(async () => fireEvent.click(screen.getByText('Login')));

    expect(apiLogin).toHaveBeenCalledWith('jane@example.com', 'Password123');
    expect(localStorage.getItem('notes_token')).toBe('login-token');
    expect(screen.getByTestId('user')).toHaveTextContent('Jane');

    fireEvent.click(screen.getByText('Logout'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(localStorage.getItem('notes_token')).toBeNull();
  });

  test('persists a session after registration', async () => {
    apiRegister.mockResolvedValue({ data: { token: 'registration-token', user: { name: 'Jane' } } });
    renderProvider();

    await act(async () => fireEvent.click(screen.getByText('Register')));

    expect(apiRegister).toHaveBeenCalledWith('Jane', 'jane@example.com', 'Password123');
    expect(localStorage.getItem('notes_token')).toBe('registration-token');
  });
});
