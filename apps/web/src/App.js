import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import ErrorBoundary from './components/ErrorBoundary';
import { UserProvider, UserContext } from './context/UserContext';

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
import LandingPage from './pages/LandingPage';
import AdminPage from './pages/AdminPage';
import CustomerForm from "./components/CustomerForm";
import BrowserPage from './pages/BrowserPage';
import GioiThieu from './pages/GioiThieu';
import Marketplace from './pages/Marketplace';
import Support from './pages/Support';
import Contact from './pages/Contact';
import MyLibrary from './pages/MyLibrary';
// Components
import SideBar from './components/Sidebar';
import NewsList from './pages/NewsList';
import NewsDetail from './pages/NewsDetail';

// ===== PrivateRoute =====
const PrivateRoute = ({ children }) => {
  const { user } = useContext(UserContext);

  if (!user) {
    // Nếu chưa login, redirect về Auth
    return <Navigate to="/auth" replace />;
  }
  return children;
};

// ===== Dashboard Layout =====
const DashboardLayout = () => (
  <div style={{ display: 'flex', height: '100vh' }}>
    <SideBar />
    <div style={{ flex: 1, padding: '20px', background: '#f9fafb', overflowY: 'auto' }}>
      <Outlet />
    </div>
  </div>
);

function App() {
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <ErrorBoundary>
        <UserProvider>
          <Router>
            <Routes>
              {/* Auth page */}
              <Route path="/auth" element={<AuthPage />} />

              {/* Redirect mặc định */}
              <Route path="/" element={<Navigate to="/auth" replace />} />

              {/* Dashboard + sidebar (Private) */}
              <Route
                element={
                  <PrivateRoute>
                    <DashboardLayout />
                  </PrivateRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/pages" element={<Pages />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/marketing" element={<Marketing />} />
                <Route path="/chatbot" element={<Chatbot />} />
                <Route path="/users" element={<Users />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/mylibrary" element={<MyLibrary />} />
              </Route>

              {/* Full-page landing / giới thiệu / customer form */}
              <Route path="/gioithieu" element={<GioiThieu />} />
              <Route path="/browser" element={<BrowserPage />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/support" element={<Support />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/news" element={<NewsList />} />
              <Route path="news/:id" element={<NewsDetail />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/gioithieu" replace />} />
            </Routes>
          </Router>
        </UserProvider>
      </ErrorBoundary>
    </GoogleOAuthProvider>
  );
}

export default App;
