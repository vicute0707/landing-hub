import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import './styles/GlobalTransitions.css';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Pages from './pages/Pages';
import Payments from './pages/Payments';
import MyPayouts from './pages/MyPayouts';
import AdminPayoutManagement from './pages/AdminPayoutManagement';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Templates from './pages/Templates';
import Marketplace from './pages/Marketplace';
import MarketplaceDetail from './pages/MarketplaceDetail';
import PurchasedPages from './pages/PurchasedPages';
import SellPage from './pages/SellPage';
import MySales from './pages/MySales';
import PaymentSandbox from './pages/PaymentSandbox';
import PaymentResult from './pages/PaymentResult';
import FormData from './pages/FormData';
import { GoogleOAuthProvider } from '@react-oauth/google';
import ErrorBoundary from './components/ErrorBoundary';
import { UserProvider } from './context/UserContext';
import CreateLandingPage from './components/CreateLanding';
import GioiThieu from './components/about_public/GioiThieu';
import Contact from './components/about_public/Contact';
import PageAbout from './components/about_public/Pages ';
import Blog from './components/about_public/Blog';
import AdminAddTemplate from './components/AdminAddTemplate'; // Thêm component cho admin
import AdminMarketplace from './pages/AdminMarketplace';
import CozeChat from "./components/CozeChat";
import AdminUser from "./pages/AdminUsers";
import UnifiedPayments from './pages/UnifiedPayments';
import DeploymentSettings from './components/DeploymentSettings';
import AdminSupport from './pages/AdminSupport';
import AdminAnalytics from './pages/AdminAnalytics';
import SupportChatbox from './components/SupportChatbox';

function App() {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    return (
        <GoogleOAuthProvider clientId={clientId}>
            <ErrorBoundary>
                <Router>
                    <UserProvider>
                        <Routes>
                            {/* Public routes */}
                            <Route path="/public">
                                <Route index element={<Navigate to="/public/gioithieu" replace />} />
                                <Route path="gioithieu" element={<GioiThieu />} />
                                <Route path="lienhe" element={<Contact />} />
                                <Route path="pages" element={<PageAbout />} />
                                <Route path="bai-viet" element={<Blog />} />
                            </Route>
                            {/* Auth routes */}
                            <Route path="/auth" element={<AuthPage />} />
                            <Route path="/" element={<Navigate to="/auth" replace />} />
                            {/* Protected routes */}
                            <Route path="/pages" element={<Pages />} />
                            {/* Deployment route - must be before :pageId routes */}
                            <Route path="/pages/:pageId/deploy" element={<DeploymentSettings />} />
                            <Route path="/pages/create" element={<CreateLandingPage />} />
                            <Route path="/create-landing" element={<Navigate to="/pages/create" replace />} />
                            <Route path="/templates" element={<Templates />} />
                            <Route path="/market" element={<Marketplace />} />
                            <Route path="/marketplace" element={<Marketplace />} />
                            <Route path="/marketplace/:id" element={<MarketplaceDetail />} />
                            <Route path="/purchased-pages" element={<PurchasedPages />} />
                            <Route path="/sell-page" element={<SellPage />} />
                            <Route path="/my-sales" element={<MySales />} />
                            <Route path="/setting-form" element={<FormData />} />
                            <Route path="/payments" element={<UnifiedPayments />} />
                            <Route path="/my-payouts" element={<MyPayouts />} />
                            <Route path="/payment/sandbox" element={<PaymentSandbox />} />
                            <Route path="/payment/result" element={<PaymentResult />} />

                            {/* Admin route */}
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/qltemplates" element={<AdminAddTemplate />} />
                            <Route path="/admin/marketplace" element={<AdminMarketplace />} />
                            <Route path="/admin/payouts" element={<AdminPayoutManagement />} />
                            <Route path="/admin/support" element={<AdminSupport />} />
                            <Route path="/admin/analytics" element={<AdminAnalytics />} />
                            <Route path="/reports" element={<Reports />} />
                            <Route path="/users" element={<AdminUser />} />
                            {/* Catch-all route */}
                            <Route path="*" element={<Navigate to="/auth" replace />} />

                        </Routes>

                        {/* Toast notification */}
                        <ToastContainer position="bottom-right" autoClose={3000} />

                        {/* ✅ Chat LD hiển thị toàn hệ thống */}
                        <CozeChat enabled={false} />

                        {/* ✅ Support Chatbox - Modern AI-powered support */}
                        <SupportChatbox />
                    </UserProvider>
                </Router>
            </ErrorBoundary>
        </GoogleOAuthProvider>
    );
}

export default App;