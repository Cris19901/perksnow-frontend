import { useState } from 'react';
import { CurrencyProvider } from './contexts/CurrencyContext';
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
import { toast, Toaster } from 'sonner@2.0.3';

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

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentPage('feed');
  };

  const handleSignup = () => {
    setIsLoggedIn(true);
    setCurrentPage('feed');
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

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
    setCurrentPage('checkout');
    setIsCartOpen(false);
  };

  const cartItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

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
            onAddToCart={handleAddToCart}
            cartItemsCount={cartItemsCount}
          />
        );
      case 'marketplace':
        return (
          <MarketplacePage
            onNavigate={handleNavigate}
            onCartClick={handleCartClick}
            onAddToCart={handleAddToCart}
            cartItemsCount={cartItemsCount}
          />
        );
      case 'profile':
        return (
          <ProfilePage
            onNavigate={handleNavigate}
            onCartClick={handleCartClick}
            onAddToCart={handleAddToCart}
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
            cartItems={cartItems}
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
    <CurrencyProvider>
      <AppContent />
    </CurrencyProvider>
  );
}
