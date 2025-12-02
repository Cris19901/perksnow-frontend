import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  seller: string;
}

interface CartContextType {
  cartItems: CartItem[];
  loading: boolean;
  addToCart: (productId: string, productData: { name: string; price: number; image: string; seller: string }) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  cartItemsCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load cart items from database when user changes
  useEffect(() => {
    async function loadCart() {
      if (!user) {
        setCartItems([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch cart items with product details
        const { data, error } = await supabase
          .from('cart_items')
          .select(`
            id,
            product_id,
            quantity,
            products:product_id (
              id,
              title,
              price,
              image_url,
              users:seller_id (
                username,
                full_name
              )
            )
          `)
          .eq('user_id', user.id);

        if (error) throw error;

        // Transform data to match CartItem interface
        const transformedItems: CartItem[] = (data || []).map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          name: item.products?.title || 'Unknown Product',
          price: item.products?.price || 0,
          image: item.products?.image_url || '',
          quantity: item.quantity,
          seller: item.products?.users?.full_name || item.products?.users?.username || 'Unknown Seller',
        }));

        setCartItems(transformedItems);
      } catch (err) {
        console.error('Error loading cart:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCart();
  }, [user]);

  const addToCart = async (productId: string, productData: { name: string; price: number; image: string; seller: string }) => {
    if (!user) {
      toast.error('Please log in to add items to cart');
      return;
    }

    try {
      // Check if item already exists in cart
      const existingItem = cartItems.find(item => item.product_id === productId);

      if (existingItem) {
        // Update quantity
        await updateQuantity(productId, existingItem.quantity + 1);
        toast.success('Item quantity updated in cart!');
      } else {
        // Insert new cart item
        const { data, error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: productId,
            quantity: 1,
          })
          .select()
          .single();

        if (error) throw error;

        // Add to local state
        const newItem: CartItem = {
          id: data.id,
          product_id: productId,
          ...productData,
          quantity: 1,
        };

        setCartItems(prev => [...prev, newItem]);
        toast.success('Added to cart!');
      }
    } catch (err: any) {
      console.error('Error adding to cart:', err);
      toast.error(err.message || 'Failed to add to cart');
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!user) return;

    if (quantity < 1) {
      await removeFromCart(productId);
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;

      // Update local state
      setCartItems(prev =>
        prev.map(item =>
          item.product_id === productId ? { ...item, quantity } : item
        )
      );
    } catch (err: any) {
      console.error('Error updating quantity:', err);
      toast.error(err.message || 'Failed to update quantity');
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;

      // Update local state
      setCartItems(prev => prev.filter(item => item.product_id !== productId));
      toast.success('Item removed from cart');
    } catch (err: any) {
      console.error('Error removing from cart:', err);
      toast.error(err.message || 'Failed to remove item');
    }
  };

  const clearCart = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setCartItems([]);
      toast.success('Cart cleared');
    } catch (err: any) {
      console.error('Error clearing cart:', err);
      toast.error(err.message || 'Failed to clear cart');
    }
  };

  const cartItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const value: CartContextType = {
    cartItems,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartItemsCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
