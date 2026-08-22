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

  const logout = () => {
    localStorage.removeItem('nct_token');
    localStorage.removeItem('nct_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
