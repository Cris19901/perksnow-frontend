import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPosts,
  getProducts,
  getCartItems,
  getUserProfile,
  subscribeToNewPosts,
} from '@/lib/api-examples';

/**
 * Hook to fetch posts with automatic updates
 */
export function usePosts() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const data = await getPosts();
        setPosts(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();

    // Subscribe to real-time updates
    const subscription = subscribeToNewPosts((newPost) => {
      setPosts((prev) => [newPost, ...prev]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      const data = await getPosts();
      setPosts(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { posts, loading, error, refetch };
}

/**
 * Hook to fetch products
 */
export function useProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await getProducts();
        setProducts(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { products, loading, error, refetch };
}

/**
 * Hook to fetch user's cart
 */
export function useCart() {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    const fetchCart = async () => {
      try {
        setLoading(true);
        const data = await getCartItems(user.id);
        setCartItems(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [user]);

  const refetch = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getCartItems(user.id);
      setCartItems(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { cartItems, loading, error, refetch };
}

/**
 * Hook to fetch user profile
 */
export function useUserProfile(userId: string | null) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await getUserProfile(userId);
        setProfile(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const refetch = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const data = await getUserProfile(userId);
      setProfile(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { profile, loading, error, refetch };
}
