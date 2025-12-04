-- ============================================
-- DATABASE SETUP WITH TEST DATA
-- ============================================
-- Run this in your Supabase SQL Editor to set up test data

-- 1. First, check if the users table exists and has the correct structure
-- If it doesn't exist, create it
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  cover_image_url TEXT,
  location TEXT,
  website TEXT,
  is_verified BOOLEAN DEFAULT false,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  points_balance INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for users
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Create posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  image_urls TEXT[],
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS on posts table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for posts
CREATE POLICY "Anyone can view posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- 7. Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  category TEXT,
  image_url TEXT,
  images JSONB,
  stock_quantity INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for products
CREATE POLICY "Anyone can view available products" ON products FOR SELECT USING (is_available = true OR auth.uid() = seller_id);
CREATE POLICY "Sellers can create products" ON products FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own products" ON products FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own products" ON products FOR DELETE USING (auth.uid() = seller_id);

-- 10. Create trigger to sync auth.users with public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- OPTIONAL: Add some test data (only if you want sample posts)
-- ============================================

-- Insert a test user (you'll need to create this user through auth first)
-- Then uncomment and run these:

-- INSERT INTO posts (user_id, content, image_url, likes_count, comments_count)
-- VALUES
--   ((SELECT id FROM users LIMIT 1), 'Welcome to PerkSnow! 🎉 This is your social media platform.', 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800', 42, 12),
--   ((SELECT id FROM users LIMIT 1), 'Just posted my first product! Check it out in the marketplace.', NULL, 28, 5);

-- INSERT INTO products (seller_id, title, description, price, category, image_url, stock_quantity, is_available)
-- VALUES
--   ((SELECT id FROM users LIMIT 1), 'Wireless Headphones', 'Premium noise-cancelling headphones', 199.99, 'Electronics', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600', 10, true),
--   ((SELECT id FROM users LIMIT 1), 'Designer T-Shirt', 'Comfortable cotton t-shirt', 29.99, 'Fashion', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600', 25, true);

-- ============================================
-- DONE!
-- ============================================
-- After running this:
-- 1. Go to Authentication in Supabase Dashboard
-- 2. Enable Email auth provider if not already enabled
-- 3. Sign up a new user through your app
-- 4. The trigger will automatically create a user profile
-- 5. That user can then create posts and products!
