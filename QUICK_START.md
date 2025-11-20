# Quick Start Guide - Supabase Integration

## 🎉 Setup Complete!

Your SocialHub app is now connected to Supabase with a fully functional database and authentication system.

## 🚀 Start Using Your App

### Step 1: Run the Development Server

```bash
cd Perksnowv2
npm run dev
```

Your app should now be running at `http://localhost:5173` (or the port Vite assigns).

### Step 2: Try Authentication

You can now use the authentication components anywhere in your app:

```typescript
import { LoginForm } from '@/components/auth/LoginForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { useAuth } from '@/contexts/AuthContext';

function AuthPage() {
  const { user } = useAuth();

  if (user) {
    return <div>Welcome, {user.email}!</div>;
  }

  return (
    <div>
      <h1>Sign In</h1>
      <LoginForm onSuccess={() => window.location.reload()} />

      <h1>Or Sign Up</h1>
      <SignUpForm onSuccess={() => window.location.reload()} />
    </div>
  );
}
```

### Step 3: Fetch Real Data

Use the custom hooks to fetch data from your database:

```typescript
import { usePosts, useProducts, useCart } from '@/hooks/useSupabase';

function MyComponent() {
  // Fetch posts
  const { posts, loading, error } = usePosts();

  // Fetch products
  const { products } = useProducts();

  // Fetch cart (only for logged-in users)
  const { cartItems } = useCart();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Posts ({posts.length})</h2>
      {posts.map(post => (
        <div key={post.id}>{post.content}</div>
      ))}
    </div>
  );
}
```

### Step 4: Update Your Existing Components

I've created an example component `PostWithSupabase.tsx` that shows how to update your existing `Post.tsx` component to work with real Supabase data.

**Compare:**
- Original: [src/components/Post.tsx](src/components/Post.tsx)
- Supabase Version: [src/components/PostWithSupabase.tsx](src/components/PostWithSupabase.tsx)

Key differences:
1. Props now use database field names (`user_id`, `likes_count`, etc.)
2. Real like functionality with database updates
3. Checks if user has already liked the post
4. Better timestamp formatting
5. Verified badge support

## 📋 Files Created

### Core Setup
- ✅ `.env` - Environment variables
- ✅ `src/lib/supabase.ts` - Supabase client
- ✅ `src/lib/auth.ts` - Auth functions
- ✅ `src/lib/api-examples.ts` - Database queries

### React Integration
- ✅ `src/contexts/AuthContext.tsx` - Auth state
- ✅ `src/hooks/useSupabase.ts` - Data fetching hooks
- ✅ `src/main.tsx` - Updated with AuthProvider

### UI Components
- ✅ `src/components/auth/LoginForm.tsx`
- ✅ `src/components/auth/SignUpForm.tsx`
- ✅ `src/components/PostWithSupabase.tsx` - Example component

### Documentation
- ✅ `SUPABASE_GUIDE.md` - Comprehensive guide
- ✅ `INTEGRATION_COMPLETE.md` - Implementation summary
- ✅ `QUICK_START.md` - This file

## 🎯 Common Tasks

### Create a New User

```typescript
import { useAuth } from '@/contexts/AuthContext';

function SignUpPage() {
  const { signUp } = useAuth();

  const handleSignUp = async () => {
    await signUp({
      email: 'user@example.com',
      password: 'securepassword',
      username: 'johndoe',
      full_name: 'John Doe',
    });
  };

  return <button onClick={handleSignUp}>Sign Up</button>;
}
```

### Create a Post

```typescript
import { createPost } from '@/lib/api-examples';
import { useAuth } from '@/contexts/AuthContext';

function NewPost() {
  const { user } = useAuth();

  const handlePost = async () => {
    if (!user) return;

    await createPost(user.id, 'Hello, SocialHub!');
  };

  return <button onClick={handlePost}>Post</button>;
}
```

### Add Product to Cart

```typescript
import { addToCart } from '@/lib/api-examples';
import { useAuth } from '@/contexts/AuthContext';

function ProductCard({ productId }) {
  const { user } = useAuth();

  const handleAddToCart = async () => {
    if (!user) return alert('Please sign in');

    await addToCart(user.id, productId, 1);
    alert('Added to cart!');
  };

  return <button onClick={handleAddToCart}>Add to Cart</button>;
}
```

### Like a Post

```typescript
import { likePost, unlikePost } from '@/lib/api-examples';

const handleLike = async (postId: string, userId: string) => {
  try {
    await likePost(userId, postId);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## 🔥 Pro Tips

1. **Always check if user is logged in** before performing actions:
   ```typescript
   const { user } = useAuth();
   if (!user) return alert('Please sign in');
   ```

2. **Use refetch to update data** after mutations:
   ```typescript
   const { posts, refetch } = usePosts();
   await createPost(userId, content);
   await refetch(); // Get fresh data
   ```

3. **Handle errors gracefully**:
   ```typescript
   try {
     await createPost(userId, content);
   } catch (error) {
     console.error('Failed to create post:', error);
     alert('Something went wrong');
   }
   ```

4. **Real-time updates are already included** in `usePosts()` hook!

## 📚 Need Help?

- **Comprehensive Guide**: Check [SUPABASE_GUIDE.md](./SUPABASE_GUIDE.md)
- **Implementation Details**: See [INTEGRATION_COMPLETE.md](./INTEGRATION_COMPLETE.md)
- **Database Schema**: Review [../supabase/README.md](../supabase/README.md)
- **Supabase Docs**: Visit [supabase.com/docs](https://supabase.com/docs)

## ✨ What's Next?

1. **Test the auth components** - Sign up and sign in
2. **Replace mock data** in your existing components
3. **Add file uploads** for avatars and post images
4. **Customize RLS policies** for your needs
5. **Add more features** - comments, messaging, orders, etc.

## 🐛 Troubleshooting

**Issue**: "Missing Supabase environment variables"
- **Fix**: Make sure `.env` file exists and restart dev server

**Issue**: TypeScript errors in components
- **Fix**: The database types are in `src/lib/supabase.ts`

**Issue**: "Auth session missing" errors
- **Fix**: User needs to be logged in. Use `useAuth()` to check

**Issue**: Can't see new data
- **Fix**: Call `refetch()` or reload the page

---

**You're all set! Start building your social commerce platform! 🚀**
