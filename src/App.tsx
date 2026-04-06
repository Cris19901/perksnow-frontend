import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Lazy-load all pages so they are code-split into separate chunks.
// Only the chunk for the current route is downloaded by the browser.
const LandingPage = lazy(() => import('./components/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./components/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./components/pages/SignupPage').then(m => ({ default: m.SignupPage })));
const AboutPage = lazy(() => import('./components/pages/AboutPage').then(m => ({ default: m.AboutPage })));
const FeedPage = lazy(() => import('./components/pages/FeedPage').then(m => ({ default: m.FeedPage })));
const MarketplacePage = lazy(() => import('./components/pages/MarketplacePage').then(m => ({ default: m.MarketplacePage })));
const ProfilePage = lazy(() => import('./components/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const MessagesPage = lazy(() => import('./components/pages/MessagesPage').then(m => ({ default: m.MessagesPage })));
const NotificationsPage = lazy(() => import('./components/pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const CreateProductPage = lazy(() => import('./components/pages/CreateProductPage').then(m => ({ default: m.CreateProductPage })));
const CheckoutPage = lazy(() => import('./components/pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const SettingsPage = lazy(() => import('./components/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ReelsPage = lazy(() => import('./components/pages/ReelsPage').then(m => ({ default: m.ReelsPage })));
const PointsPage = lazy(() => import('./components/pages/PointsPage').then(m => ({ default: m.PointsPage })));
const HashtagPage = lazy(() => import('./components/pages/HashtagPage').then(m => ({ default: m.HashtagPage })));
const PeoplePage = lazy(() => import('./components/pages/PeoplePage').then(m => ({ default: m.PeoplePage })));
const ReferralDashboardPage = lazy(() => import('./components/pages/ReferralDashboardPage').then(m => ({ default: m.ReferralDashboardPage })));
const WithdrawPage = lazy(() => import('./components/pages/WithdrawPage').then(m => ({ default: m.WithdrawPage })));
const VerifyWithdrawalPage = lazy(() => import('./components/pages/VerifyWithdrawalPage').then(m => ({ default: m.VerifyWithdrawalPage })));
const SubscriptionPage = lazy(() => import('./components/pages/SubscriptionPage'));
const PaymentCallbackPage = lazy(() => import('./components/pages/PaymentCallbackPage'));
const PaymentHistoryPage = lazy(() => import('./components/pages/PaymentHistoryPage'));
const DiagnosticPage = lazy(() => import('./pages/DiagnosticPage'));
// Admin pages — only loaded if user navigates to /admin/*
const AdminDashboard = lazy(() => import('./components/pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminWithdrawalsPage = lazy(() => import('./components/pages/AdminWithdrawalsPage').then(m => ({ default: m.AdminWithdrawalsPage })));
const AdminSettingsPage = lazy(() => import('./components/pages/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })));
const AdminPointSettingsPage = lazy(() => import('./components/pages/AdminPointSettingsPage').then(m => ({ default: m.AdminPointSettingsPage })));
const AdminReferralSettingsPage = lazy(() => import('./components/pages/AdminReferralSettingsPage').then(m => ({ default: m.AdminReferralSettingsPage })));
const AdminSignupBonusPage = lazy(() => import('./components/pages/AdminSignupBonusPage').then(m => ({ default: m.AdminSignupBonusPage })));
const AdminUserManagementPage = lazy(() => import('./components/pages/AdminUserManagementPage').then(m => ({ default: m.AdminUserManagementPage })));
const AdminContentModerationPage = lazy(() => import('./components/pages/AdminContentModerationPage'));
const AdminAuditLogPage = lazy(() => import('./components/pages/AdminAuditLogPage').then(m => ({ default: m.AdminAuditLogPage })));
const AdminSupportPage = lazy(() => import('./components/pages/AdminSupportPage').then(m => ({ default: m.AdminSupportPage })));
const AdminSubscriptionAnalytics = lazy(() => import('./components/pages/AdminSubscriptionAnalytics').then(m => ({ default: m.AdminSubscriptionAnalytics })));
import { OnboardingFlow } from './components/OnboardingFlow';
import { CartSheet } from './components/CartSheet';
import { ProductDetailModal } from './components/ProductDetailModal';
import PhoneVerificationBanner from './components/PhoneVerificationBanner';
import { ContactSupportChat } from './components/ContactSupportChat';
import { supabase } from './lib/supabase';
import { toast, Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  seller: string;
}

// Mock products database
const productsDB: Record<number, { name: string; price: number; image: string; seller: string; category: string }> = {
  1: {
    name: 'Wireless Noise-Cancelling Headphones',
    price: 199.99,
    image: 'https://images.unsplash.com/photo-1717295248302-543d5a49091f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljcyUyMGdhZGdldHN8ZW58MXx8fHwxNzYyNTM0MTIxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    seller: 'TechStore',
    category: 'Electronics',
  },
  2: {
    name: 'Summer Floral Maxi Dress',
    price: 79.99,
    image: 'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwY2xvdGhpbmd8ZW58MXx8fHwxNzYyNTczMzM3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    seller: 'FashionHub',
    category: 'Fashion',
  },
  3: {
    name: 'Modern Minimalist Table Lamp',
    price: 45.99,
    image: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwZGVjb3J8ZW58MXx8fHwxNzYyNTE4MzY5fDA&ixlib=rb-4.1.0&q=80&w=1080',
    seller: 'HomeDecor',
    category: 'Home & Living',
  },
  4: {
    name: 'Organic Cotton T-Shirt Pack (3pc)',
    price: 34.99,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
    seller: 'EcoWear',
    category: 'Fashion',
  },
  5: {
    name: 'Smart Fitness Watch',
    price: 149.99,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
    seller: 'FitTech',
    category: 'Electronics',
  },
  6: {
    name: 'Handcrafted Ceramic Mug Set',
    price: 29.99,
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600',
    seller: 'Artisan Crafts',
    category: 'Home & Living',
  },
  7: {
    name: 'Premium Yoga Mat with Strap',
    price: 39.99,
    image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600',
    seller: 'YogaLife',
    category: 'Sports',
  },
  8: {
    name: 'Vintage Leather Backpack',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600',
    seller: 'UrbanStyle',
    category: 'Fashion',
  },
  101: {
    name: 'Wireless Noise-Cancelling Headphones',
    price: 199.99,
    image: 'https://images.unsplash.com/photo-1717295248302-543d5a49091f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljcyUyMGdhZGdldHN8ZW58MXx8fHwxNzYyNTM0MTIxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    seller: 'TechStore Official',
    category: 'Electronics',
  },
  102: {
    name: 'Summer Floral Maxi Dress',
    price: 79.99,
    image: 'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwY2xvdGhpbmd8ZW58MXx8fHwxNzYyNTczMzM3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    seller: 'FashionHub',
    category: 'Fashion',
  },
};

// Protected route wrapper component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public route wrapper - redirects logged-in users to feed
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // If user is logged in, redirect to feed
  if (user) {
    return <Navigate to="/feed" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Check if user needs onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setCheckingOnboarding(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        // Show onboarding if not completed
        if (data && !data.onboarding_completed) {
          setShowOnboarding(true);
        }
      } catch (err) {
        console.error('Error checking onboarding:', err);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [user]);

  const handleAddToCart = (productId: number) => {
    const product = productsDB[productId];
    if (!product) return;

    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.id === productId);
      if (existingItem) {
        toast.success('Item quantity updated in cart!');
        return prev.map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      toast.success('Added to cart!');
      return [
        ...prev,
        {
          id: productId,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: 1,
          seller: product.seller,
        },
      ];
    });
  };

  const handleUpdateQuantity = (productId: number, quantity: number) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, quantity } : item))
    );
  };

  const handleRemoveItem = (productId: number) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
    toast.success('Item removed from cart');
  };

  const handleCartClick = () => {
    setIsCartOpen(true);
  };

  const handleProductClick = (productId: number) => {
    const product = productsDB[productId];
    if (product) {
      setSelectedProduct({
        id: productId,
        ...product,
        seller: {
          name: product.seller,
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        },
      });
      setIsProductModalOpen(true);
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    // Navigation will be handled by CheckoutPage component
    setIsCartOpen(false);
  };

  const cartItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <Toaster position="top-center" richColors />

      {/* Phone Verification Banner - TEMPORARILY DISABLED until Termii Sender ID approved
      <PhoneVerificationBanner />
      */}

      {/* Onboarding Flow */}
      {showOnboarding && !checkingOnboarding && (
        <OnboardingFlow
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      }>
      <Routes>
        {/* Public routes - redirect logged-in users to feed */}
        <Route path="/" element={
          <PublicRoute>
            <LandingPage onNavigate={(page) => window.location.href = `/${page}`} />
          </PublicRoute>
        } />
        <Route path="/login" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        } />
        <Route path="/about" element={<AboutPage />} />

        {/* Protected routes */}
        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <FeedPage
                onCartClick={handleCartClick}
                onAddToCart={handleAddToCart}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hashtag/:hashtag"
          element={
            <ProtectedRoute>
              <HashtagPage
                onCartClick={handleCartClick}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketplace"
          element={
            <ProtectedRoute>
              <MarketplacePage
                onCartClick={handleCartClick}
                onAddToCart={handleAddToCart}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage
                onCartClick={handleCartClick}
                onAddToCart={handleAddToCart}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:username"
          element={
            <ProtectedRoute>
              <ProfilePage
                onCartClick={handleCartClick}
                onAddToCart={handleAddToCart}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/people"
          element={
            <ProtectedRoute>
              <PeoplePage
                onCartClick={handleCartClick}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessagesPage
                onCartClick={handleCartClick}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage
                onCartClick={handleCartClick}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-product"
          element={
            <ProtectedRoute>
              <CreateProductPage
                onCartClick={handleCartClick}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <CheckoutPage
                cartItems={cartItems}
                onCartClick={handleCartClick}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage
                onCartClick={handleCartClick}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reels"
          element={
            <ProtectedRoute>
              <ReelsPage
                onCartClick={handleCartClick}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/points"
          element={
            <ProtectedRoute>
              <PointsPage
                onCartClick={handleCartClick}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/referrals"
          element={
            <ProtectedRoute>
              <ReferralDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/withdraw"
          element={
            <ProtectedRoute>
              <WithdrawPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/verify-withdrawal"
          element={<VerifyWithdrawalPage />}
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard
                onCartClick={handleCartClick}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/withdrawals"
          element={
            <ProtectedRoute>
              <AdminWithdrawalsPage
                onCartClick={handleCartClick}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <AdminSettingsPage
                onCartClick={handleCartClick}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/point-settings"
          element={
            <ProtectedRoute>
              <AdminPointSettingsPage
                onCartClick={handleCartClick}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/referral-settings"
          element={
            <ProtectedRoute>
              <AdminReferralSettingsPage
                onCartClick={handleCartClick}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/signup-bonus"
          element={
            <ProtectedRoute>
              <AdminSignupBonusPage
                onCartClick={handleCartClick}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-log"
          element={
            <ProtectedRoute>
              <AdminAuditLogPage
                onCartClick={handleCartClick}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/support"
          element={
            <ProtectedRoute>
              <AdminSupportPage
                onCartClick={handleCartClick}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminUserManagementPage
                onCartClick={handleCartClick}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/moderation"
          element={
            <ProtectedRoute>
              <AdminContentModerationPage
                onCartClick={handleCartClick}
                cartItemsCount={cartItemsCount}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subscription-analytics"
          element={
            <ProtectedRoute>
              <AdminSubscriptionAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription"
          element={
            <ProtectedRoute>
              <SubscriptionPage />
            </ProtectedRoute>
          }
        />
        <Route path="/diagnostic" element={<DiagnosticPage />} />
        <Route
          path="/subscription/history"
          element={
            <ProtectedRoute>
              <PaymentHistoryPage />
            </ProtectedRoute>
          }
        />
        {/* Payment callback must be public - user session may not be ready after redirect */}
        <Route path="/subscription/callback" element={<PaymentCallbackPage />} />
      </Routes>
      </Suspense>

      <CartSheet
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
      />
      <ProductDetailModal
        product={selectedProduct}
        open={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
        onAddToCart={handleAddToCart}
      />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CurrencyProvider>
          <AppContent />
          <ContactSupportChat />
        </CurrencyProvider>
      </AuthProvider>
      {/* Vercel Analytics - tracks page views and events */}
      <Analytics />
      {/* Vercel Speed Insights - tracks Core Web Vitals */}
      <SpeedInsights />
    </BrowserRouter>
  );
}