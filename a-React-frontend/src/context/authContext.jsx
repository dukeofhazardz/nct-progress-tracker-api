import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // We'll initialize with a mock user so you can develop without a login screen
  const [user, setUser] = useState({
    id: "1",
    name: "Israel",
    role: "ADMIN", // Switch this to 'INSTRUCTOR' or 'STUDENT' to test views
    dept: "Web Development"
  });

  const login = (userData) => setUser(userData);
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);