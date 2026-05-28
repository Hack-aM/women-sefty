import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { Toaster } from 'react-hot-toast';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import LoadingScreen from './components/ui/LoadingScreen';
import FakeCallOverlay from './components/FakeCallOverlay';
import ErrorBoundary from './components/ErrorBoundary';

const Login        = lazy(() => import('./pages/Login'));
const OTPVerify    = lazy(() => import('./pages/OTPVerify'));
const Home         = lazy(() => import('./pages/Home'));
const SOSPage      = lazy(() => import('./pages/SOSPage'));
const LiveTracking = lazy(() => import('./pages/LiveTracking'));
const NearbyHelp   = lazy(() => import('./pages/NearbyHelp'));
const Contacts     = lazy(() => import('./pages/Contacts'));
const FakeCall     = lazy(() => import('./pages/FakeCall'));
const SafetyTips   = lazy(() => import('./pages/SafetyTips'));
const Profile      = lazy(() => import('./pages/Profile'));
const AISafety     = lazy(() => import('./pages/AISafety'));
const SOSHistory   = lazy(() => import('./pages/SOSHistory'));
const IncidentReport = lazy(() => import('./pages/IncidentReport'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const SOSPortal    = lazy(() => import('./pages/SOSPortal'));
const NotFound     = lazy(() => import('./pages/NotFound'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return !user ? children : <Navigate to="/" replace />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <FakeCallOverlay />
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Public */}
              <Route element={<AuthLayout />}>
                <Route path="/login"  element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/verify" element={<PublicRoute><OTPVerify /></PublicRoute>} />
              </Route>

              {/* Protected */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index             element={<Home />} />
                <Route path="/sos"       element={<SOSPage />} />
                <Route path="/tracking"  element={<LiveTracking />} />
                <Route path="/nearby"    element={<NearbyHelp />} />
                <Route path="/contacts"  element={<Contacts />} />
                <Route path="/fakecall"  element={<FakeCall />} />
                <Route path="/tips"      element={<SafetyTips />} />
                <Route path="/profile"   element={<Profile />} />
                <Route path="/ai-safety" element={<AISafety />} />
                <Route path="/history"   element={<SOSHistory />} />
                <Route path="/report"    element={<IncidentReport />} />
                <Route path="/admin"     element={<AdminDashboard />} />
              </Route>

              {/* Public Emergency Tracking Portal */}
              <Route path="/sos-portal/:alertId" element={<SOSPortal />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#1a1a2e',
                color: '#f8fafc',
                border: '1px solid rgba(236, 72, 153, 0.2)',
                borderRadius: '1rem',
                fontSize: '0.875rem',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              },
              success: { iconTheme: { primary: '#ec4899', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#f87171', secondary: '#fff' } },
            }}
          />
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
