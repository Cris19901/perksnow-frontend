-- ============================================
-- SNGINE TO PERKNOW MIGRATION SCRIPT
-- ============================================
-- This script migrates users and posts from Sngine to the current PerkSnow schema
--
-- PREREQUISITES:
-- 1. Import the Sngine database dump into a temporary database
-- 2. Connect both databases (or use postgres_fdw for cross-database queries)
-- 3. Ensure all target tables exist (users, posts)
--
-- USAGE:
-- Replace 'sngine_db' with your Sngine database name if using postgres_fdw
-- Or run this in the same database if you've imported Sngine tables with a prefix
-- ============================================

-- ============================================
-- STEP 1: Create ID Mapping Table
-- ============================================
-- This table maps old Sngine integer IDs to new UUID IDs

CREATE TABLE IF NOT EXISTS sngine_id_mappings (
  entity_type TEXT NOT NULL, -- 'user' or 'post'
  old_id INTEGER NOT NULL,
  new_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (entity_type, old_id)
);

CREATE INDEX IF NOT EXISTS idx_sngine_mappings_new_id ON sngine_id_mappings(entity_type, new_id);

-- ============================================
-- STEP 2: Create Helper Functions
-- ============================================

-- Function to sanitize and ensure unique usernames
CREATE OR REPLACE FUNCTION generate_unique_username(base_username TEXT, attempt INTEGER DEFAULT 0)
RETURNS TEXT AS $$
DECLARE
  new_username TEXT;
  username_exists BOOLEAN;
BEGIN
  IF attempt = 0 THEN
    new_username := base_username;
  ELSE
    new_username := base_username || attempt::TEXT;
  END IF;

  SELECT EXISTS(SELECT 1 FROM users WHERE username = new_username) INTO username_exists;

  IF username_exists THEN
    RETURN generate_unique_username(base_username, attempt + 1);
  ELSE
    RETURN new_username;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to sanitize and ensure unique emails
CREATE OR REPLACE FUNCTION generate_unique_email(base_email TEXT, attempt INTEGER DEFAULT 0)
RETURNS TEXT AS $$
DECLARE
  new_email TEXT;
  email_exists BOOLEAN;
  email_parts TEXT[];
BEGIN
  IF attempt = 0 THEN
    new_email := base_email;
  ELSE
    email_parts := string_to_array(base_email, '@');
    new_email := email_parts[1] || '+migrated' || attempt::TEXT || '@' || email_parts[2];
  END IF;

  SELECT EXISTS(SELECT 1 FROM users WHERE email = new_email) INTO email_exists;

  IF email_exists THEN
    RETURN generate_unique_email(base_email, attempt + 1);
  ELSE
    RETURN new_email;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 3: Migrate Users
-- ============================================

-- NOTE: This assumes Sngine tables are accessible in the same database
-- If using postgres_fdw, prefix table names with the foreign server name

DO $$
DECLARE
  sngine_user RECORD;
  new_user_id UUID;
  unique_username TEXT;
  unique_email TEXT;
  full_name_value TEXT;
  user_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🚀 Starting user migration...';

  FOR sngine_user IN
    SELECT
      user_id,
      user_name,
      user_email,
      user_firstname,
      user_lastname,
      user_biography,
      user_picture,
      user_cover,
      user_current_city,
      user_website,
      user_verified,
      user_registered,
      user_last_seen,
      user_banned,
      user_activated
    FROM users -- Sngine users table
    WHERE user_activated = '1' AND user_banned = '0' -- Only migrate active, non-banned users
    ORDER BY user_id
  LOOP
    -- Generate new UUID
    new_user_id := gen_random_uuid();

    -- Ensure unique username
    unique_username := generate_unique_username(LOWER(TRIM(sngine_user.user_name)));

    -- Ensure unique email
    unique_email := generate_unique_email(LOWER(TRIM(sngine_user.user_email)));

    -- Combine first and last name
    full_name_value := TRIM(
      COALESCE(sngine_user.user_firstname, '') || ' ' ||
      COALESCE(sngine_user.user_lastname, '')
    );

    IF full_name_value = '' THEN
      full_name_value := NULL;
    END IF;

    -- Insert user into new schema
    BEGIN
      INSERT INTO public.users (
        id,
        username,
        email,
        full_name,
        bio,
        avatar_url,
        cover_image_url,
        location,
        website,
        is_verified,
        created_at,
        updated_at,
        points_balance,
        followers_count,
        following_count,
        posts_count
      ) VALUES (
        new_user_id,
        unique_username,
        unique_email,
        full_name_value,
        NULLIF(TRIM(sngine_user.user_biography), ''),
        NULLIF(TRIM(sngine_user.user_picture), ''),
        NULLIF(TRIM(sngine_user.user_cover), ''),
        NULLIF(TRIM(sngine_user.user_current_city), ''),
        NULLIF(TRIM(sngine_user.user_website), ''),
        (sngine_user.user_verified = '1'),
        COALESCE(sngine_user.user_registered, NOW()),
        COALESCE(sngine_user.user_last_seen, NOW()),
        0, -- points_balance starts at 0
        0, -- Will be calculated later
        0, -- Will be calculated later
        0  -- Will be calculated later
      );

      -- Store ID mapping
      INSERT INTO sngine_id_mappings (entity_type, old_id, new_id)
      VALUES ('user', sngine_user.user_id, new_user_id);

      user_count := user_count + 1;

      IF user_count % 100 = 0 THEN
        RAISE NOTICE '✅ Migrated % users...', user_count;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ Failed to migrate user ID %: %', sngine_user.user_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '✅ User migration complete! Migrated % users total.', user_count;
END $$;

-- ============================================
-- STEP 4: Migrate Posts
-- ============================================

DO $$
DECLARE
  sngine_post RECORD;
  new_post_id UUID;
  mapped_user_id UUID;
  post_content TEXT;
  post_image_url TEXT;
  total_likes INTEGER;
  post_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🚀 Starting posts migration...';

  FOR sngine_post IN
    SELECT
      p.post_id,
      p.user_id,
      p.user_type,
      p.post_type,
      p.text,
      p.time,
      p.reaction_like_count,
      p.reaction_love_count,
      p.reaction_haha_count,
      p.reaction_yay_count,
      p.reaction_wow_count,
      p.reaction_sad_count,
      p.reaction_angry_count,
      p.comments,
      p.shares,
      -- Get first photo if it's a photo post
      (SELECT image FROM posts_photos WHERE post_id = p.post_id ORDER BY photo_id LIMIT 1) as photo_url
    FROM posts p
    WHERE p.user_type = 'user'
      AND p.post_type NOT IN ('profile_picture', 'profile_cover') -- Skip profile pics/covers
    ORDER BY p.post_id
  LOOP
    -- Get mapped user ID
    SELECT new_id INTO mapped_user_id
    FROM sngine_id_mappings
    WHERE entity_type = 'user' AND old_id = sngine_post.user_id;

    -- Skip if user wasn't migrated
    IF mapped_user_id IS NULL THEN
      skipped_count := skipped_count + 1;
      CONTINUE;
    END IF;

    -- Generate new UUID for post
    new_post_id := gen_random_uuid();

    -- Prepare content
    post_content := COALESCE(TRIM(sngine_post.text), '');
    IF post_content = '' THEN
      -- If no text content and no photo, skip the post
      IF sngine_post.photo_url IS NULL THEN
        skipped_count := skipped_count + 1;
        CONTINUE;
      END IF;
      post_content := NULL;
    END IF;

    -- Get image URL
    post_image_url := NULLIF(TRIM(sngine_post.photo_url), '');

    -- Calculate total likes (sum of all reactions)
    total_likes := COALESCE(sngine_post.reaction_like_count, 0) +
                   COALESCE(sngine_post.reaction_love_count, 0) +
                   COALESCE(sngine_post.reaction_haha_count, 0) +
                   COALESCE(sngine_post.reaction_yay_count, 0) +
                   COALESCE(sngine_post.reaction_wow_count, 0) +
                   COALESCE(sngine_post.reaction_sad_count, 0) +
                   COALESCE(sngine_post.reaction_angry_count, 0);

    -- Insert post
    BEGIN
      INSERT INTO public.posts (
        id,
        user_id,
        content,
        image_url,
        likes_count,
        comments_count,
        shares_count,
        is_pinned,
        created_at,
        updated_at
      ) VALUES (
        new_post_id,
        mapped_user_id,
        post_content,
        post_image_url,
        total_likes,
        COALESCE(sngine_post.comments, 0),
        COALESCE(sngine_post.shares, 0),
        false, -- No pinned posts initially
        COALESCE(sngine_post.time, NOW()),
        COALESCE(sngine_post.time, NOW())
      );

      -- Store ID mapping
      INSERT INTO sngine_id_mappings (entity_type, old_id, new_id)
      VALUES ('post', sngine_post.post_id, new_post_id);

      post_count := post_count + 1;

      IF post_count % 100 = 0 THEN
        RAISE NOTICE '✅ Migrated % posts...', post_count;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ Failed to migrate post ID %: %', sngine_post.post_id, SQLERRM;
      skipped_count := skipped_count + 1;
    END;
  END LOOP;

  RAISE NOTICE '✅ Posts migration complete! Migrated % posts, skipped %.', post_count, skipped_count;
END $$;

-- ============================================
-- STEP 5: Update User Post Counts
-- ============================================

UPDATE public.users u
SET posts_count = (
  SELECT COUNT(*)
  FROM public.posts p
  WHERE p.user_id = u.id
);

RAISE NOTICE '✅ Updated user post counts.';

-- ============================================
-- STEP 6: Migration Summary
-- ============================================

DO $$
DECLARE
  total_users INTEGER;
  total_posts INTEGER;
  total_mappings INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.users;
  SELECT COUNT(*) INTO total_posts FROM public.posts;
  SELECT COUNT(*) INTO total_mappings FROM sngine_id_mappings;

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '🎉 MIGRATION COMPLETE!';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total users in system: %', total_users;
  RAISE NOTICE 'Total posts in system: %', total_posts;
  RAISE NOTICE 'Total ID mappings created: %', total_mappings;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT NEXT STEPS:';
  RAISE NOTICE '1. Send password reset emails to all migrated users';
  RAISE NOTICE '2. Migrate media files to new storage if needed';
  RAISE NOTICE '3. Optionally migrate relationships (followers, likes, comments)';
  RAISE NOTICE '4. Test the application thoroughly';
  RAISE NOTICE '5. Drop the sngine tables when confirmed working';
  RAISE NOTICE '================================================';
END $$;

-- ============================================
-- OPTIONAL: Clean up helper functions
-- ============================================
-- Uncomment to remove helper functions after migration
-- DROP FUNCTION IF EXISTS generate_unique_username(TEXT, INTEGER);
-- DROP FUNCTION IF EXISTS generate_unique_email(TEXT, INTEGER);
