import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LandingPage } from './components/pages/LandingPage';
import { LoginPage } from './components/pages/LoginPage';
import { SignupPage } from './components/pages/SignupPage';
import { VerifyEmailPage } from './components/pages/VerifyEmailPage';
import { ForgotPasswordPage } from './components/pages/ForgotPasswordPage';
import { ResetPasswordPage } from './components/pages/ResetPasswordPage';
import { AboutPage } from './components/pages/AboutPage';
import { FeedPage } from './components/pages/FeedPage';
import { MarketplacePage } from './components/pages/MarketplacePage';
import { ProfilePage } from './components/pages/ProfilePage';
import { MessagesPage } from './components/pages/MessagesPage';
import { NotificationsPage } from './components/pages/NotificationsPage';
import { CreateProductPage } from './components/pages/CreateProductPage';
import { CheckoutPage } from './components/pages/CheckoutPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { ProductDetailPage } from './components/pages/ProductDetailPage';
import { BookmarksPage } from './components/pages/BookmarksPage';
import { HashtagPage } from './components/pages/HashtagPage';
import { PointsPage } from './components/pages/PointsPage';
import { AdminRewardPoolPage } from './components/pages/AdminRewardPoolPage';
import { AdminDashboardPage } from './components/pages/AdminDashboardPage';
import { AdminUsersPage } from './components/pages/AdminUsersPage';
import { AdminModerationPage } from './components/pages/AdminModerationPage';
import { AdminProductsPage } from './components/pages/AdminProductsPage';
import { Layout } from './components/Layout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'signup',
        element: <SignupPage />,
      },
      {
        path: 'verify-email',
        element: <VerifyEmailPage />,
      },
      {
        path: 'forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: 'reset-password',
        element: <ResetPasswordPage />,
      },
      {
        path: 'about',
        element: <AboutPage />,
      },
      {
        path: 'feed',
        element: <FeedPage />,
      },
      {
        path: 'marketplace',
        element: <MarketplacePage />,
      },
      {
        path: 'product/:productId',
        element: <ProductDetailPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'profile/:userId',
        element: <ProfilePage />,
      },
      {
        path: 'messages',
        element: <MessagesPage />,
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },
      {
        path: 'bookmarks',
        element: <BookmarksPage />,
      },
      {
        path: 'hashtag/:hashtag',
        element: <HashtagPage />,
      },
      {
        path: 'create-product',
        element: <CreateProductPage />,
      },
      {
        path: 'checkout',
        element: <CheckoutPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'points',
        element: <PointsPage />,
      },
      {
        path: 'admin',
        element: <AdminDashboardPage />,
      },
      {
        path: 'admin/users',
        element: <AdminUsersPage />,
      },
      {
        path: 'admin/moderation',
        element: <AdminModerationPage />,
      },
      {
        path: 'admin/products',
        element: <AdminProductsPage />,
      },
      {
        path: 'admin/rewards',
        element: <AdminRewardPoolPage />,
      },
      {
        path: 'admin/reward-pool',
        element: <AdminRewardPoolPage />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
