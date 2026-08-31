/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import axiosInstance from '../api/axiosInstance';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem('nct_user') || 'null'),
  );

  const login = async (credentials) => {
    const { data } = await axiosInstance.post('/auth/login', credentials);

    localStorage.setItem('nct_token', data.token);
    localStorage.setItem('nct_user', JSON.stringify(data.user));
    setUser(data.user);

    return data.user;
  };

  /**
   * Merge a change the user just made to their own account into the session.
   * The top bar and sidebar render from `nct_user`, so a new profile picture has
   * to land there too or it would only appear after a re-login.
   */
  const updateUser = (patch) =>
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      localStorage.setItem('nct_user', JSON.stringify(next));
      return next;
    });

  const logout = () => {
    localStorage.removeItem('nct_token');
    localStorage.removeItem('nct_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
