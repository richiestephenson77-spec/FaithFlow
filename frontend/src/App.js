import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { initPostHog } from './utils/analytics';
import posthog from './utils/analytics';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Search from './pages/Search';
import Settings from './pages/Settings';
import AccountSettings from './pages/AccountSettings';
import NotificationSettings from './pages/NotificationSettings';
import PrayerReminders from './pages/PrayerReminders';
import ContactUs from './pages/ContactUs';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Community from './pages/Community';
import Churches from './pages/Churches';
import ChurchPage from './pages/ChurchPage';
import FindChurches from './pages/FindChurches';
import FindChurchDetail from './pages/FindChurchDetail';
import ChurchesHub from './pages/ChurchesHub';
import Explore from './pages/Explore';
import Bible from './pages/Bible';
import BibleDictionary from './pages/BibleDictionary';
import BibleMaps from './pages/BibleMaps';
import PrayerDetail from './pages/PrayerDetail';
import BibleBot from './pages/BibleBot';
import PrayerPage from './pages/PrayerPage';
import AnsweredPrayers from './pages/AnsweredPrayers';
import PrayerImmersive from './pages/PrayerImmersive';
import Messages from './pages/Messages';
import ChatThread from './pages/ChatThread';
import Confessions from './pages/Confessions';
import ConfessionDetail from './pages/ConfessionDetail';
import Onboarding from './pages/Onboarding';
import PrayerPartners from './pages/PrayerPartners';
import PrayerQueue from './pages/PrayerQueue';
import Feelings from './pages/Feelings';
import Pastors from './pages/Pastors';
import MyPastorRequests from './pages/MyPastorRequests';
import PastorDashboard from './pages/PastorDashboard';
import PrayerCellDirectory from './pages/PrayerCellDirectory';
import PrayerCellHostRoom from './pages/PrayerCellHostRoom';
import PrayerCellGuestRoom from './pages/PrayerCellGuestRoom';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './contexts/ToastContext';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/" replace /> : children;
}

function PageViewTracker() {
  const location = useLocation();
  useEffect(() => {
    posthog.capture('$pageview', { $current_url: window.location.href });
  }, [location.pathname]);
  return null;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <SocketProvider>
              <Layout />
            </SocketProvider>
          </PrivateRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="community" element={<Community />} />
        <Route path="churches" element={<Churches />} />
        <Route path="churches/:id" element={<ChurchPage />} />
        <Route path="explore" element={<Explore />} />
        <Route path="bible" element={<Bible />} />
        <Route path="prayer/:id" element={<PrayerDetail />} />
        <Route path="search" element={<Search />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/account" element={<AccountSettings />} />
        <Route path="settings/notifications" element={<NotificationSettings />} />
        <Route path="settings/reminders" element={<PrayerReminders />} />
        <Route path="settings/contact" element={<ContactUs />} />
        <Route path="bible-bot" element={<BibleBot />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="profile/:id" element={<Profile />} />
        <Route path="prayer" element={<PrayerPage />} />
        <Route path="pray/:id" element={<PrayerImmersive />} />
        <Route path="answered" element={<AnsweredPrayers />} />
        <Route path="messages" element={<Messages />} />
        <Route path="messages/:conversationId" element={<ChatThread />} />
        <Route path="confessions" element={<Confessions />} />
        <Route path="/confessions/:id" element={<ConfessionDetail />} />
        <Route path="prayer-cells" element={<PrayerCellDirectory />} />
        <Route path="prayer-cells/:cellId/host" element={<PrayerCellHostRoom />} />
        <Route path="prayer-cells/:cellId/guest" element={<PrayerCellGuestRoom />} />
        <Route path="find-churches" element={<FindChurches />} />
        <Route path="find-churches/:placeId" element={<FindChurchDetail />} />
        <Route path="churches-hub" element={<ChurchesHub />} />
        <Route path="bible-dictionary" element={<BibleDictionary />} />
        <Route path="bible-maps" element={<BibleMaps />} />
        <Route path="prayer-partners" element={<PrayerPartners />} />
        <Route path="prayer-queue" element={<PrayerQueue />} />
        <Route path="feelings" element={<Feelings />} />
        <Route path="pastors" element={<Pastors />} />
        <Route path="my-pastor-requests" element={<MyPastorRequests />} />
        <Route path="pastor-dashboard" element={<PastorDashboard />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  useEffect(() => { initPostHog(); }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    // Keep the webview drawing under the status bar (that's what makes
    // env(safe-area-inset-top) non-zero, which the padding fix relies on),
    // and use dark status bar content since the app is light-themed.
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <PageViewTracker />
        {/* Top-level safety net — catches shell/provider errors too */}
        <ErrorBoundary>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}
