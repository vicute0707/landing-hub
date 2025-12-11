import React, { useState, useEffect, useContext, Suspense } from 'react';
import { UserContext } from '../context/UserContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { jwtDecode } from 'jwt-decode';
import '../styles/pages.css';
import { useLocation, useNavigate } from 'react-router-dom';
import DogLoader from '../components/Loader';
import PageContent from '../components/Page.content';

const Pages = () => {
    const { user } = useContext(UserContext);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const initializeAuth = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No token found in localStorage');
                navigate('/auth');
                setLoading(false);
                return;
            }

            try {
                const decodedToken = jwtDecode(token);
                if (!decodedToken.role || !decodedToken.userId) {
                    console.error('Invalid token: role or userId not found');
                    navigate('/auth');
                    setLoading(false);
                    return;
                }
                setUserRole(decodedToken.role);
            } catch (err) {
                console.error('Error decoding token:', err);
                navigate('/auth');
            } finally {
                setLoading(false);
            }
        };

        if (user?.role) {
            setUserRole(user.role);
            setLoading(false);
        } else {
            initializeAuth();
        }
    }, [user, navigate]);

    if (loading) return <DogLoader />;

    const renderContentPage = () => {
        return <PageContent />;
    };

    const isCompact = location.pathname !== '';

    return (
        <div className="pages-container">
            <Header role={userRole} />
            <Sidebar role={userRole} isCompact={isCompact} />

            <div className="pages-main">
                <div className="pages-content">{renderContentPage()}</div>
            </div>
        </div>
    );
};

export default React.memo(Pages);