import { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); }
    catch { return null; }
  });

  const login = async (email, password) => {
    const res = await api.post('auth/login/', { username: email, password });
    localStorage.setItem('access',  res.data.access);
    localStorage.setItem('refresh', res.data.refresh);
    const u = {
      name:            res.data.name,
      role:            res.data.role,
      university_id:   res.data.university_id,
      university_code: res.data.university_code,
      // Profile fields (populated for student / faculty; undefined for others)
      department:      res.data.department  ?? null,
      batch:           res.data.batch       ?? null,
      roll_no:         res.data.roll_no     ?? null,
    };
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    navigate('/dashboard');
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    navigate('/login');
  };

  const updateUser = (updatedFields) => {
    const current = JSON.parse(localStorage.getItem('user')) || {};
    const merged = { ...current, ...updatedFields };
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
