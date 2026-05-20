import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = '';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('maktaba_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get(`${API_BASE}/api/auth/me`)
        .then(res => {
          setUser(res.data.user);
        })
        .catch(() => {
          localStorage.removeItem('maktaba_token');
          delete axios.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (emailOrToken, passwordOrUser) => {
    // Called from settings update: login(token, userObject)
    if (typeof passwordOrUser === 'object' && passwordOrUser !== null) {
      const token = emailOrToken;
      const user = passwordOrUser;
      localStorage.setItem('maktaba_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      return user;
    }
    // Normal login: login(email, password)
    const res = await axios.post(`${API_BASE}/api/auth/login`, { email: emailOrToken, password: passwordOrUser });
    const { token, user } = res.data;
    localStorage.setItem('maktaba_token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(user);
    return user;
  };

  const register = async (username, email, password) => {
    const res = await axios.post(`${API_BASE}/api/auth/register`, { username, email, password });
    const { token, user } = res.data;
    localStorage.setItem('maktaba_token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('maktaba_token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
