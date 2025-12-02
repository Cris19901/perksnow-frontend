import { supabase } from './supabase';

// ============================================================================
// POSTS API
// ============================================================================

/**
 * Fetch all posts with user information
 */
export const getPosts = async () => {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      users (
        id,
        username,
        avatar_url,
        is_verified
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * Fetch posts from followed users
 */
export const getFeedPosts = async (userId: string) => {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      users (
        id,
        username,
        avatar_url,
        is_verified
      )
    `)
    .in('user_id', supabase.from('follows').select('following_id').eq('follower_id', userId))
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * Create a new post
 */
export const createPost = async (userId: string, content: string, imageUrl?: string) => {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      content,
      image_url: imageUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Like a post
 */
export const likePost = async (userId: string, postId: string) => {
  const { error } = await supabase.from('likes').insert({
    user_id: userId,
    post_id: postId,
  });

  if (error) throw error;
};

/**
 * Unlike a post
 */
export const unlikePost = async (userId: string, postId: string) => {
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', userId)
    .eq('post_id', postId);

  if (error) throw error;
};

// ============================================================================
// PRODUCTS API
// ============================================================================

/**
 * Fetch all products
 */
export const getProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      users (
        id,
        username,
        avatar_url
      )
    `)
    .eq('is_available', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * Fetch products by category
 */
export const getProductsByCategory = async (category: string) => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      users (
        id,
        username,
        avatar_url
      )
    `)
    .eq('category', category)
    .eq('is_available', true)
    .order('created_at', { ascending: false});

  if (error) throw error;
  return data;
};

/**
 * Create a new product
 */
export const createProduct = async (productData: {
  seller_id: string;
  title: string;
  description: string;
  price: number;
  category?: string;
  image_url?: string;
  stock_quantity?: number;
}) => {
  const { data, error } = await supabase
    .from('products')
    .insert(productData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============================================================================
// CART API
// ============================================================================

/**
 * Get user's cart items with product details
 */
export const getCartItems = async (userId: string) => {
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      *,
      products (
        *,
        users (
          username,
          avatar_url
        )
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return data;
};

/**
 * Add item to cart
 */
export const addToCart = async (userId: string, productId: string, quantity: number = 1) => {
  const { data, error } = await supabase
    .from('cart_items')
    .upsert({
      user_id: userId,
      product_id: productId,
      quantity,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Remove item from cart
 */
export const removeFromCart = async (userId: string, productId: string) => {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);

  if (error) throw error;
};

// ============================================================================
// USERS API
// ============================================================================

/**
 * Get user profile
 */
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: {
    full_name?: string;
    bio?: string;
    avatar_url?: string;
    cover_image_url?: string;
    location?: string;
    website?: string;
  }
) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Follow a user
 */
export const followUser = async (followerId: string, followingId: string) => {
  const { error } = await supabase.from('follows').insert({
    follower_id: followerId,
    following_id: followingId,
  });

  if (error) throw error;
};

/**
 * Unfollow a user
 */
export const unfollowUser = async (followerId: string, followingId: string) => {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) throw error;
};

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to new posts (real-time)
 */
export const subscribeToNewPosts = (callback: (post: any) => void) => {
  return supabase
    .channel('posts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
      callback(payload.new);
    })
    .subscribe();
};

/**
 * Subscribe to post likes (real-time)
 */
export const subscribeToPostLikes = (postId: string, callback: (like: any) => void) => {
  return supabase
    .channel(`post-${postId}-likes`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'likes', filter: `post_id=eq.${postId}` },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
};
