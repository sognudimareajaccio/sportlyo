import React, { useEffect } from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";

// Layout
import Layout from "./components/Layout";

// Pages
import HomePage from "./pages/HomePage";
import EventsPage from "./pages/EventsPage";
import EventDetailPage from "./pages/EventDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AuthCallback from "./pages/AuthCallback";
import ParticipantDashboard from "./pages/ParticipantDashboard";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import MyRegistrationsPage from "./pages/MyRegistrationsPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentCancelPage from "./pages/PaymentCancelPage";
import TimerPage from "./pages/TimerPage";
import ResultsPage from "./pages/ResultsPage";
import CheckInPage from "./pages/CheckInPage";
import OrganizerEventPage from "./pages/OrganizerEventPage";
import OrgaLandingPage from "./pages/OrgaLandingPage";
import PartnersLandingPage from "./pages/PartnersLandingPage";
// ComingSoonPage removed - app is now publicly accessible
import MessagingPage from "./pages/MessagingPage";
import EventShopPage from "./pages/EventShopPage";
import ProviderDashboard from "./pages/ProviderDashboard";
import RfidRentalPage from "./pages/RfidRentalPage";
import ErrorBoundary from "./components/ErrorBoundary";

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (location.state?.user) {
    return children;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// App Router Component
const AppRouter = () => {
  const location = useLocation();

  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <>
    <ScrollToTop />
    <Routes>
      {/* Public routes with Layout */}
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:eventId" element={<EventDetailPage />} />
        <Route path="/events/:eventId/shop" element={<EventShopPage />} />
        <Route path="/results/:eventId" element={<ResultsPage />} />
      </Route>

      {/* Auth routes without Layout */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Payment routes without Layout */}
      <Route path="/payment/success" element={<PaymentSuccessPage />} />
      <Route path="/payment/cancel" element={<PaymentCancelPage />} />

      {/* Timer route without Layout (fullscreen) */}
      <Route
        path="/timer/:registrationId"
        element={
          <ProtectedRoute>
            <TimerPage />
          </ProtectedRoute>
        }
      />

      {/* Protected routes with Layout */}
      <Route element={<Layout />}>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ParticipantDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/registrations"
          element={
            <ProtectedRoute>
              <MyRegistrationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer"
          element={
            <ProtectedRoute>
              <OrganizerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/checkin/:eventId"
          element={
            <ProtectedRoute>
              <CheckInPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkin"
          element={
            <ProtectedRoute>
              <CheckInPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rfid"
          element={
            <ProtectedRoute>
              <RfidRentalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/event/:eventId"
          element={
            <ProtectedRoute>
              <OrganizerEventPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessagingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider"
          element={
            <ProtectedRoute>
              <ProviderDashboard />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Organizer Landing Page (public) */}
      <Route element={<Layout />}>
        <Route path="/organizers" element={<OrgaLandingPage />} />
        <Route path="/partners" element={<PartnersLandingPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="App">
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
          <Toaster position="top-right" richColors />
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
