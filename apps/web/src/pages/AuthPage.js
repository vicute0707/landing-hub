import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import Login from '../components/Login';
import Register from '../components/Register';
import Background from '../components/Background';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import api from '@landinghub/api';
import '../styles/AuthPage.css';
import LoadingDog from '../components/DogLoader';

const AuthPage = () => {
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('login');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setError('Không nhận được token từ Google');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const decoded = jwtDecode(credentialResponse.credential);

      const userData = {
        role: 'user',
        name: decoded.name || decoded.given_name || decoded.email.split('@')[0],
        userId: decoded.sub,
      };

      // Lưu token + userInfo vào localStorage
      localStorage.setItem('token', credentialResponse.credential);
      localStorage.setItem('userInfo', JSON.stringify(userData));

      // Gửi lên backend
      await api.post('/auth/google-callback', { email: decoded.email, name: userData.name });
      const res = await api.get('/user/info');
      const backendUser = res.data;

      setUser({ ...backendUser, userId: backendUser._id });

      // Chuyển hướng SPA
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Đăng nhập thất bại: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleFailure = (err) => {
    console.error('Google Login Failed:', err);
    setError('Đăng nhập thất bại. Vui lòng thử lại.');
  };

  return (
    <Background>
      <div className="auth-page">
        {loading && <LoadingDog />}
        <div className="tab-container">
          <label className={`tab_label ${activeTab === 'login' ? 'active' : ''}`} onClick={() => setActiveTab('login')}>Login</label>
          <label className={`tab_label ${activeTab === 'register' ? 'active' : ''}`} onClick={() => setActiveTab('register')}>Register</label>
          <div className={`indicator ${activeTab}`}></div>
        </div>
        <div className="tab-content">
          {activeTab === 'login' && <Login onGoogleSuccess={handleGoogleSuccess} onGoogleFailure={handleGoogleFailure} error={error} />}
          {activeTab === 'register' && <Register />}
        </div>
        <div className="google-login-container">
          <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleFailure} />
        </div>
        {error && <div className="auth-error">{error}</div>}
      </div>
    </Background>
  );
};

export default AuthPage;
