import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { CartSheet } from './CartSheet';
import { ProductDetailModal } from './ProductDetailModal';
import { toast, Toaster } from 'sonner';

export function Layout() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const { user, loading } = useAuth();
  const { cartItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to feed if user is already logged in and on landing page
  useEffect(() => {
    if (!loading && user && location.pathname === '/') {
      navigate('/feed', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    navigate('/checkout');
    setIsCartOpen(false);
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      <Outlet />
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
