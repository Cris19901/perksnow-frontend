# Supabase Integration Guide

Your SocialHub app is now connected to Supabase! This guide will help you use the database in your React application.

## Setup Complete ✅

- Database schema deployed (15 tables)
- Environment variables configured
- Supabase client installed and configured
- Authentication helpers created
- API examples ready to use

## File Structure

```
src/
├── lib/
│   ├── supabase.ts        # Supabase client configuration
│   ├── auth.ts            # Authentication functions
│   └── api-examples.ts    # Database query examples
└── .env                   # Environment variables (DO NOT COMMIT!)
```

## Quick Start

### 1. Import the Supabase Client

```typescript
import { supabase } from '@/lib/supabase';
```

### 2. Authentication Example

```typescript
import { signUp, signIn, signOut, getCurrentUser } from '@/lib/auth';

// Sign up a new user
const handleSignUp = async () => {
  try {
    const { user } = await signUp({
      email: 'user@example.com',
      password: 'securepassword',
      username: 'johndoe',
      full_name: 'John Doe',
    });
    console.log('User signed up:', user);
  } catch (error) {
    console.error('Sign up error:', error);
  }
};

// Sign in
const handleSignIn = async () => {
  try {
    const { user } = await signIn({
      email: 'user@example.com',
      password: 'securepassword',
    });
    console.log('User signed in:', user);
  } catch (error) {
    console.error('Sign in error:', error);
  }
};

// Sign out
const handleSignOut = async () => {
  await signOut();
};

// Get current user
const user = await getCurrentUser();
```

### 3. Fetching Data Example

```typescript
import { getPosts, getProducts, getCartItems } from '@/lib/api-examples';

// Fetch all posts
const posts = await getPosts();

// Fetch all products
const products = await getProducts();

// Get user's cart
const cartItems = await getCartItems(userId);
```

### 4. Creating Data Example

```typescript
import { createPost, createProduct, addToCart } from '@/lib/api-examples';

// Create a new post
const newPost = await createPost(
  userId,
  'This is my first post!',
  'https://example.com/image.jpg'
);

// Create a new product
const newProduct = await createProduct({
  seller_id: userId,
  title: 'Awesome Product',
  description: 'This is an awesome product',
  price: 29.99,
  category: 'Electronics',
  stock_quantity: 10,
});

// Add item to cart
await addToCart(userId, productId, 2);
```

### 5. Real-time Subscriptions

```typescript
import { subscribeToNewPosts } from '@/lib/api-examples';

// Subscribe to new posts
const subscription = subscribeToNewPosts((newPost) => {
  console.log('New post created:', newPost);
  // Update your UI with the new post
});

// Unsubscribe when component unmounts
subscription.unsubscribe();
```

## Using in React Components

### Example: Posts Feed Component

```typescript
import { useEffect, useState } from 'react';
import { getPosts, likePost, unlikePost } from '@/lib/api-examples';
import { getCurrentUser } from '@/lib/auth';

function PostsFeed() {
  const [posts, setPosts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      const fetchedPosts = await getPosts();
      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    try {
      await likePost(user.id, postId);
      // Refresh posts to get updated likes count
      await loadData();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {posts.map((post) => (
        <div key={post.id}>
          <h3>{post.users.username}</h3>
          <p>{post.content}</p>
          <button onClick={() => handleLike(post.id)}>
            Like ({post.likes_count})
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Example: Authentication Context

```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChange } from '@/lib/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to auth state changes
    const { data: { subscription } } = onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

## Common Queries

### Fetch Posts with Comments

```typescript
const { data } = await supabase
  .from('posts')
  .select(`
    *,
    users (username, avatar_url),
    comments (
      id,
      content,
      users (username, avatar_url)
    )
  `)
  .order('created_at', { ascending: false });
```

### Search Products

```typescript
const { data } = await supabase
  .from('products')
  .select('*')
  .ilike('title', `%${searchTerm}%`)
  .eq('is_available', true);
```

### Get User's Orders

```typescript
const { data } = await supabase
  .from('orders')
  .select(`
    *,
    order_items (
      *,
      products (*)
    )
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

## File Upload Example

```typescript
// Upload an image to Supabase Storage
const uploadImage = async (file: File) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data } = supabase.storage
    .from('images')
    .getPublicUrl(filePath);

  return data.publicUrl;
};
```

## Environment Variables

Your `.env` file should contain:

```env
VITE_SUPABASE_URL=https://kswknblwjlkgxgvypkmo.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Important:** Never commit the `.env` file to git!

## Next Steps

1. **Replace Mock Data**: Update your existing components to use real Supabase queries instead of mock data
2. **Add Authentication**: Implement sign-up, sign-in, and sign-out flows
3. **Enable Real-time**: Add real-time subscriptions for live updates
4. **File Uploads**: Set up Supabase Storage for user avatars and post images
5. **Add Policies**: Fine-tune RLS policies based on your app requirements

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Real-time Subscriptions](https://supabase.com/docs/guides/realtime)

## Troubleshooting

### "Missing Supabase environment variables"
- Check that your `.env` file exists in the `Perksnowv2` directory
- Restart your dev server after updating `.env`

### "JWT expired" or "Invalid API key"
- Check that you're using the correct anon key (not service_role key)
- Verify the key in your Supabase dashboard

### "Row Level Security policy violation"
- Check the RLS policies in your Supabase dashboard
- Ensure users are authenticated before accessing protected data

Need help? Check the Supabase docs or ask me!
