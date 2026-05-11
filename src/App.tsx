import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

import AuthLayout from '@/components/features/auth/AuthLayout';
import LoginPage from '@/components/features/auth/LoginPage';
import SignUpPage from '@/components/features/auth/SignUpPage';
import WelcomePage from '@/components/features/onboarding/WelcomePage';
import ProtectedRoute from '@/components/features/auth/ProtectedRoute';

import MainLayout from '@/components/layout/MainLayout';
import Dashboard from '@/components/features/dashboard/Dashboard';
import ProfilePage from '@/components/features/profile/ProfilePage';
import TransactionsPage from '@/pages/TransactionsPage/TransactionsPage';
import AccountsPage from '@/pages/AccountsPage/AccountsPage';
import AccountDetailView from '@/pages/AccountsPage/AccountDetailView';
import RemindersPage from '@/pages/RemindersPage/RemindersPage';
import Flow from '@/pages/Flow/Flow';
import SplashScreen from '@/components/layout/SplashScreen';
import ComingSoonPage from '@/components/features/ComingSoonPage';
import { NexusProvider } from '@/context/NexusContext';
import NexusDrawer from '@/components/features/nexus/NexusDrawer';
import ManageFlow from '@/pages/Flow/ManageFlow';

function App() {
  const { currentUser, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    
    if (!hasSeenSplash) {
      setShowSplash(true);
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem('hasSeenSplash', 'true');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (showSplash || loading) {
    return <SplashScreen />;
  }

  const location = useLocation();
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';

  return (
    <NexusProvider>
      <div className={`app-container ${isDashboard ? 'is-dashboard' : ''}`}>
        <NexusDrawer />
        <Routes>
        {/* Onboarding */}
        <Route path="/welcome" element={
          currentUser ? <Navigate to="/" replace /> : <WelcomePage />
        } />

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={
            currentUser ? <Navigate to="/" replace /> : <LoginPage />
          } />
          <Route path="/signup" element={
            currentUser ? <Navigate to="/" replace /> : <SignUpPage />
          } />
        </Route>

        {/* Protected Application Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/accounts/:id/edit" element={<AccountDetailView />} />
            <Route path="/flow/:tab?" element={<Flow />} />
            <Route path="/flow/manage/:type/:id" element={<ManageFlow />} />

            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Global Redirect/Catch-all */}
        <Route path="/coming-soon" element={<ComingSoonPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
    </NexusProvider>
  );
}

export default App;

