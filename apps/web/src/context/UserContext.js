// src/context/UserContext.js
import React, { createContext, useState, useEffect } from 'react';
import {jwtDecode }from 'jwt-decode'; // ✅ sửa import đúng

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // check token loading

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({
          userId: decoded.sub || decoded.userId || null,
          role: decoded.role || 'user',
          name: decoded.name || decoded.given_name || decoded.email?.split('@')[0] || 'Unknown',
          subscription: decoded.subscription || null,
        });
      } catch (err) {
        console.error('Invalid token:', err);
        localStorage.removeItem('token');
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </UserContext.Provider>
  );
};
