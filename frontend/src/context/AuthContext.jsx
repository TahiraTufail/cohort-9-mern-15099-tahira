import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, register as apiRegister } from '../services/authService';

const AuthContext = createContext(null);

/**
 * SECURITY NOTE:
 * Storing JWT tokens and user objects in localStorage is a development-stage trade-off
 * to persist user sessions across browser refreshes without building cookie infrastructure.
 * In a production environment, tokens should be stored in secure, same-site httpOnly cookies to prevent XSS vulnerability.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('notes_token');
      const storedUser = localStorage.getItem('notes_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      localStorage.removeItem('notes_token');
      localStorage.removeItem('notes_user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await apiLogin(email, password);
    const { token: newToken, user: newUser } = res.data;

    setToken(newToken);
    setUser(newUser);

    localStorage.setItem('notes_token', newToken);
    localStorage.setItem('notes_user', JSON.stringify(newUser));

    return res;
  };

  const register = async (name, email, password) => {
    const res = await apiRegister(name, email, password);
    const { token: newToken, user: newUser } = res.data;

    setToken(newToken);
    setUser(newUser);

    localStorage.setItem('notes_token', newToken);
    localStorage.setItem('notes_user', JSON.stringify(newUser));

    return res;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('notes_token');
    localStorage.removeItem('notes_user');
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token),
    loading,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
