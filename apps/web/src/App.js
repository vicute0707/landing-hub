// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import ErrorBoundary from './components/ErrorBoundary';
import { UserProvider } from './context/UserContext';

// Pages
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Pages from './pages/Pages';
import Leads from './pages/Leads';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Marketing from './pages/Marketing';
import Chatbot from './pages/Chatbot';
import Users from './pages/Users';
import Templates from './pages/Templates';
import CustomerInteractions from './pages/CustomerInteractions';
import LandingPage from './pages/LandingPage';
import AdminPage from './pages/AdminPage';
import CustomerForm from "./components/CustomerForm";
// Components
import SideBar from './components/Sidebar';

function App() {
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  // Layout wrapper cho các trang có sidebar
  const DashboardLayout = () => (
    <div style={{ display: 'flex', height: '100vh' }}>
      <SideBar />
      <div style={{ flex: 1, padding: '20px', background: '#f9fafb', overflowY: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <ErrorBoundary>
        <UserProvider>
          <Router>
            <Routes>
              {/* Trang Auth */}
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/" element={<Navigate to="/auth" replace />} />

              {/* Các trang có sidebar */}
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/pages" element={<Pages />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/customerForm" element={<CustomerForm />} />

                <Route path="/payments" element={<Payments />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/marketing" element={<Marketing />} />
                <Route path="/chatbot" element={<Chatbot />} />
                <Route path="/users" element={<Users />} />
                <Route path="/templates" element={<Templates />} />
                {/* <Route path="/customer-interactions" element={<CustomerInteractions />} /> */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/admin" element={<AdminPage />} /> 


                <Route path="/test-form" element={<CustomerForm />} />

              </Route>

              {/* Catch-all nếu route không tồn tại */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </UserProvider>
      </ErrorBoundary>
    </GoogleOAuthProvider>
  );
}

export default App;
