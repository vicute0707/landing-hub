import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const { user, loading } = useContext(UserContext);

    if (loading) {
        return <div style={{ padding: '100px', textAlign: 'center' }}>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    if (requireAdmin && user.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;