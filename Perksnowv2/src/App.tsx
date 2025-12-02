import { useState, useEffect } from 'react';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { useCart } from './contexts/CartContext';
import { useAuth } from './contexts/AuthContext';
import { LandingPage } from './components/pages/LandingPage';
import { LoginPage } from './components/pages/LoginPage';
import { SignupPage } from './components/pages/SignupPage';
import { AboutPage } from './components/pages/AboutPage';
import { FeedPage } from './components/pages/FeedPage';
import { MarketplacePage } from './components/pages/MarketplacePage';
import { ProfilePage } from './components/pages/ProfilePage';
import { MessagesPage } from './components/pages/MessagesPage';
import { NotificationsPage } from './components/pages/NotificationsPage';
import { CreateProductPage } from './components/pages/CreateProductPage';
import { CheckoutPage } from './components/pages/CheckoutPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { CartSheet } from './components/CartSheet';
import { ProductDetailModal } from './components/ProductDetailModal';
import { toast, Toaster } from 'sonner';

type Page =
  | 'landing'
  | 'login'
  | 'signup'
  | 'about'
  | 'feed'
  | 'marketplace'
  | 'profile'
  | 'messages'
  | 'notifications'
  | 'create-product'
  | 'checkout'
  | 'settings';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const { user, loading } = useAuth();
  const { cartItemsCount, cartItems } = useCart();

  // Redirect to feed if user is already logged in
  useEffect(() => {
    if (!loading && user && currentPage === 'landing') {
      setCurrentPage('feed');
    }
  }, [user, loading, currentPage]);

  const handleLogin = () => {
    setCurrentPage('feed');
  };

  const handleSignup = () => {
    setCurrentPage('feed');
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  const handleCartClick = () => {
    setIsCartOpen(true);
  };

  const handleProductClick = (productId: string) => {
    // This can be enhanced later to fetch full product details
    setSelectedProduct({ id: productId });
    setIsProductModalOpen(true);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    setCurrentPage('checkout');
    setIsCartOpen(false);
  };

  // Render the appropriate page based on currentPage state
  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage onNavigate={handleNavigate} />;
      case 'login':
        return <LoginPage onNavigate={handleNavigate} onLogin={handleLogin} />;
      case 'signup':
        return <SignupPage onNavigate={handleNavigate} onSignup={handleSignup} />;
      case 'about':
        return <AboutPage onNavigate={handleNavigate} />;
      case 'feed':
        return (
          <FeedPage
            onNavigate={handleNavigate}
            onCartClick={handleCartClick}
            cartItemsCount={cartItemsCount}
          />
        );
      case 'marketplace':
        return (
          <MarketplacePage
            onNavigate={handleNavigate}
            onCartClick={handleCartClick}
            cartItemsCount={cartItemsCount}
          />
        );
      case 'profile':
        return (
          <ProfilePage
            onNavigate={handleNavigate}
            onCartClick={handleCartClick}
            cartItemsCount={cartItemsCount}
          />
        );
      case 'messages':
        return (
          <MessagesPage
            onNavigate={handleNavigate}
            onCartClick={handleCartClick}
            cartItemsCount={cartItemsCount}
          />
        );
      case 'notifications':
        return (
          <NotificationsPage
            onNavigate={handleNavigate}
            onCartClick={handleCartClick}
            cartItemsCount={cartItemsCount}
          />
        );
      case 'create-product':
        return (
          <CreateProductPage
            onNavigate={handleNavigate}
            onCartClick={handleCartClick}
            cartItemsCount={cartItemsCount}
          />
        );
      case 'checkout':
        return (
          <CheckoutPage
            onNavigate={handleNavigate}
            onCartClick={handleCartClick}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            onNavigate={handleNavigate}
            onCartClick={handleCartClick}
            cartItemsCount={cartItemsCount}
          />
        );
      default:
        return <LandingPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      {renderPage()}
      <CartSheet
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        onCheckout={handleCheckout}
      />
      <ProductDetailModal
        product={selectedProduct}
        open={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
      />
    </>
  );
}

export default function App() {
  return (
    <CurrencyProvider>
      <AppContent />
    </CurrencyProvider>
  );
}
