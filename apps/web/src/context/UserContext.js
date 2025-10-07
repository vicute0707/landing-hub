// src/context/UserContext.js
import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // ✅ named export mới

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                setUser({
                    userId: decodedToken.sub || decodedToken.userId,
                    role: decodedToken.role || 'user',
                    name: decodedToken.name || decodedToken.given_name || decodedToken.email?.split('@')[0],
                    subscription: decodedToken.subscription || null,
                });
            } catch (err) {
                console.error('Invalid token:', err);
                localStorage.removeItem('token');
            }
        }
    }, []);

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        setUser(null);
    };

    return (
        <UserContext.Provider value={{ user, setUser, logout }}>
            {children}
        </UserContext.Provider>
    );
};
