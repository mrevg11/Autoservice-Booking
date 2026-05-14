import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Layout from './shared/components/Layout';
import ProtectedRoute from './shared/components/ProtectedRoute';
import Spinner from './shared/components/ui/Spinner';

// Public pages
import LandingPage from './pages/LandingPage';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';

// Auth pages
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage';
import VerifyEmailPage from './features/auth/pages/VerifyEmailPage';

// Services
import ServicesPage from './features/services/pages/ServicesPage';

// Lazy load feature pages for better bundle splitting
const ClientDashboard = lazy(() => import('./features/profile/pages/ClientDashboard'));
const ClientBookingsPage = lazy(() => import('./features/bookings/pages/ClientBookingsPage'));
const BookingDetailPage = lazy(() => import('./features/bookings/pages/BookingDetailPage'));
const BookingWizardPage = lazy(() => import('./features/bookings/pages/BookingWizardPage'));
const SmartBookingPage = lazy(() => import('./features/bookings/pages/SmartBookingPage'));
const VehiclesPage = lazy(() => import('./features/vehicles/pages/VehiclesPage'));
const RecommendationsPage = lazy(() => import('./features/intelligence/pages/RecommendationsPage'));
const ClientProfilePage = lazy(() => import('./features/profile/pages/ClientProfilePage'));

const MasterDashboard = lazy(() => import('./features/master/pages/MasterDashboard'));
const MasterBookingsPage = lazy(() => import('./features/master/pages/MasterBookingsPage'));
const MasterBookingDetailPage = lazy(() => import('./features/master/pages/MasterBookingDetailPage'));
const MasterSchedulePage = lazy(() => import('./features/master/pages/MasterSchedulePage'));
const MasterProfilePage = lazy(() => import('./features/master/pages/MasterProfilePage'));

const AdminDashboard = lazy(() => import('./features/admin/pages/AdminDashboard'));
const AdminUsersPage = lazy(() => import('./features/admin/pages/AdminUsersPage'));
const AdminServicesPage = lazy(() => import('./features/admin/pages/AdminServicesPage'));
const AdminMastersPage = lazy(() => import('./features/admin/pages/AdminMastersPage'));
const AdminBookingsPage = lazy(() => import('./features/admin/pages/AdminBookingsPage'));
const AdminAnalyticsPage = lazy(() => import('./features/admin/pages/AdminAnalyticsPage'));

function PageLoader() {
  return (
    <div className="flex justify-center py-20">
      <Spinner size="lg" />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'services', element: <ServicesPage /> },
      { path: 'unauthorized', element: <Unauthorized /> },

      // Client routes
      {
        element: <ProtectedRoute allowedRoles={['CLIENT']} />,
        children: [
          {
            path: 'client/dashboard',
            element: <Suspense fallback={<PageLoader />}><ClientDashboard /></Suspense>,
          },
          {
            path: 'client/bookings',
            element: <Suspense fallback={<PageLoader />}><ClientBookingsPage /></Suspense>,
          },
          {
            path: 'client/bookings/new',
            element: <Suspense fallback={<PageLoader />}><BookingWizardPage /></Suspense>,
          },
          {
            path: 'client/bookings/smart',
            element: <Suspense fallback={<PageLoader />}><SmartBookingPage /></Suspense>,
          },
          {
            path: 'client/bookings/:id',
            element: <Suspense fallback={<PageLoader />}><BookingDetailPage /></Suspense>,
          },
          {
            path: 'client/vehicles',
            element: <Suspense fallback={<PageLoader />}><VehiclesPage /></Suspense>,
          },
          {
            path: 'client/recommendations',
            element: <Suspense fallback={<PageLoader />}><RecommendationsPage /></Suspense>,
          },
          {
            path: 'client/profile',
            element: <Suspense fallback={<PageLoader />}><ClientProfilePage /></Suspense>,
          },
        ],
      },

      // Master routes
      {
        element: <ProtectedRoute allowedRoles={['MASTER']} />,
        children: [
          {
            path: 'master/dashboard',
            element: <Suspense fallback={<PageLoader />}><MasterDashboard /></Suspense>,
          },
          {
            path: 'master/bookings',
            element: <Suspense fallback={<PageLoader />}><MasterBookingsPage /></Suspense>,
          },
          {
            path: 'master/bookings/:id',
            element: <Suspense fallback={<PageLoader />}><MasterBookingDetailPage /></Suspense>,
          },
          {
            path: 'master/schedule',
            element: <Suspense fallback={<PageLoader />}><MasterSchedulePage /></Suspense>,
          },
          {
            path: 'master/profile',
            element: <Suspense fallback={<PageLoader />}><MasterProfilePage /></Suspense>,
          },
        ],
      },

      // Admin routes
      {
        element: <ProtectedRoute allowedRoles={['ADMIN']} />,
        children: [
          { path: 'admin/dashboard', element: <Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense> },
          { path: 'admin/users', element: <Suspense fallback={<PageLoader />}><AdminUsersPage /></Suspense> },
          { path: 'admin/services', element: <Suspense fallback={<PageLoader />}><AdminServicesPage /></Suspense> },
          { path: 'admin/masters', element: <Suspense fallback={<PageLoader />}><AdminMastersPage /></Suspense> },
          { path: 'admin/bookings', element: <Suspense fallback={<PageLoader />}><AdminBookingsPage /></Suspense> },
          { path: 'admin/analytics', element: <Suspense fallback={<PageLoader />}><AdminAnalyticsPage /></Suspense> },
        ],
      },

      { path: '*', element: <NotFound /> },
    ],
  },
]);
