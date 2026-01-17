# IMMEDIATE FIX: Onboarding Functions & Balance Display

## Issues Identified

1. **404 Error**: `mark_onboarding_step_complete` function doesn't exist in database
2. **Balance not showing**: Frontend looks for `points_balance` but database has `points` column

## Quick Fix (5 minutes)

### Step 1: Run SQL to Create Missing Functions

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the entire contents of: **`FIX_ONBOARDING_FUNCTIONS.sql`**
3. Click **Run**

This will:
- ✅ Create `mark_onboarding_step_complete()` function
- ✅ Create `get_user_onboarding_progress()` function
- ✅ Create `user_onboarding_progress` table if missing
- ✅ Test that everything works

### Step 2: Fix Points Balance Column Mismatch

Your database has `points` column, but the frontend is looking for `points_balance`.

**Option A: Rename column in database (RECOMMENDED)**

```sql
-- Rename points to points_balance
ALTER TABLE users RENAME COLUMN points TO points_balance;

-- Update any existing database functions that reference 'points'
-- (Signup bonus trigger, etc.)
```

**Option B: Add points_balance as alias (Quick fix)**

```sql
-- Create a view or computed column
ALTER TABLE users ADD COLUMN points_balance INTEGER GENERATED ALWAYS AS (points) STORED;
```

**Option C: Fix frontend to use 'points' instead of 'points_balance'**

This requires code changes in:
- `src/components/MobileBottomNav.tsx` (line 30, 40-41)
- `src/components/pages/PointsPage.tsx` (line 79, 84)
- `src/components/pages/AdminDashboard.tsx` (line 61, 63)

I recommend **Option A** (rename column) as it's cleaner and matches what the frontend expects.

### Step 3: Full Fix SQL (Run Both Issues)

Run this complete fix in Supabase SQL Editor:

```sql
-- ============================================================================
-- COMPLETE FIX: Onboarding + Balance Column
-- ============================================================================

-- 1. Rename points to points_balance
DO $$
BEGIN
  -- Check if 'points' column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'points'
  ) THEN
    -- Rename to points_balance
    ALTER TABLE users RENAME COLUMN points TO points_balance;
    RAISE NOTICE '✅ Renamed points column to points_balance';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'points_balance'
  ) THEN
    -- Neither exists, create points_balance
    ALTER TABLE users ADD COLUMN points_balance INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Created points_balance column';
  ELSE
    RAISE NOTICE '✅ points_balance column already exists';
  END IF;
END $$;

-- 2. Update signup bonus trigger to use points_balance
DROP FUNCTION IF EXISTS award_signup_bonus() CASCADE;

CREATE OR REPLACE FUNCTION award_signup_bonus()
RETURNS TRIGGER AS $$
DECLARE
    v_bonus_amount INTEGER;
    v_is_enabled BOOLEAN;
BEGIN
    -- Get bonus settings
    SELECT bonus_amount, is_enabled INTO v_bonus_amount, v_is_enabled
    FROM signup_bonus_settings
    LIMIT 1;

    IF v_is_enabled AND v_bonus_amount > 0 THEN
        -- Award points to user (using points_balance now)
        UPDATE users
        SET points_balance = COALESCE(points_balance, 0) + v_bonus_amount
        WHERE id = NEW.id;

        -- Record in history
        INSERT INTO signup_bonus_history (user_id, bonus_amount, email_sent)
        VALUES (NEW.id, v_bonus_amount, false)
        ON CONFLICT (user_id) DO NOTHING;

        RAISE NOTICE '✅ Signup bonus of % points awarded to user %', v_bonus_amount, NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS award_signup_bonus_trigger ON users;

CREATE TRIGGER award_signup_bonus_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION award_signup_bonus();

-- 3. Create onboarding functions (if not exists)
-- Include full content from FIX_ONBOARDING_FUNCTIONS.sql here

DROP FUNCTION IF EXISTS mark_onboarding_step_complete(UUID, TEXT);
DROP FUNCTION IF EXISTS get_user_onboarding_progress(UUID);

CREATE TABLE IF NOT EXISTS user_onboarding_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  profile_picture_added BOOLEAN DEFAULT false,
  background_image_added BOOLEAN DEFAULT false,
  bio_added BOOLEAN DEFAULT false,
  location_added BOOLEAN DEFAULT false,
  interests_added BOOLEAN DEFAULT false,
  completion_percentage INTEGER DEFAULT 0,
  profile_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON user_onboarding_progress(user_id);

ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own onboarding progress" ON user_onboarding_progress;
DROP POLICY IF EXISTS "Users can update their own onboarding progress" ON user_onboarding_progress;

CREATE POLICY "Users can view their own onboarding progress"
ON user_onboarding_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding progress"
ON user_onboarding_progress FOR ALL
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION mark_onboarding_step_complete(
  p_user_id UUID,
  p_step_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  new_percentage INTEGER;
  all_completed BOOLEAN := false;
BEGIN
  INSERT INTO user_onboarding_progress (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  CASE p_step_name
    WHEN 'profile_picture' THEN
      UPDATE user_onboarding_progress SET profile_picture_added = true WHERE user_id = p_user_id;
    WHEN 'background_image' THEN
      UPDATE user_onboarding_progress SET background_image_added = true WHERE user_id = p_user_id;
    WHEN 'bio' THEN
      UPDATE user_onboarding_progress SET bio_added = true WHERE user_id = p_user_id;
    WHEN 'location' THEN
      UPDATE user_onboarding_progress SET location_added = true WHERE user_id = p_user_id;
    WHEN 'interests' THEN
      UPDATE user_onboarding_progress SET interests_added = true WHERE user_id = p_user_id;
  END CASE;

  SELECT
    (CASE WHEN profile_picture_added THEN 20 ELSE 0 END +
     CASE WHEN background_image_added THEN 20 ELSE 0 END +
     CASE WHEN bio_added THEN 20 ELSE 0 END +
     CASE WHEN location_added THEN 20 ELSE 0 END +
     CASE WHEN interests_added THEN 20 ELSE 0 END)
  INTO new_percentage
  FROM user_onboarding_progress
  WHERE user_id = p_user_id;

  UPDATE user_onboarding_progress
  SET completion_percentage = new_percentage
  WHERE user_id = p_user_id;

  SELECT profile_picture_added AND bio_added
  INTO all_completed
  FROM user_onboarding_progress
  WHERE user_id = p_user_id;

  IF all_completed THEN
    UPDATE user_onboarding_progress SET profile_completed = true WHERE user_id = p_user_id;
    UPDATE users SET onboarding_completed = true, onboarding_completed_at = NOW() WHERE id = p_user_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_onboarding_progress(p_user_id UUID)
RETURNS TABLE (
  profile_picture_added BOOLEAN,
  background_image_added BOOLEAN,
  bio_added BOOLEAN,
  location_added BOOLEAN,
  interests_added BOOLEAN,
  completion_percentage INTEGER,
  profile_completed BOOLEAN
) AS $$
BEGIN
  INSERT INTO user_onboarding_progress (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN QUERY
  SELECT
    p.profile_picture_added,
    p.background_image_added,
    p.bio_added,
    p.location_added,
    p.interests_added,
    p.completion_percentage,
    p.profile_completed
  FROM user_onboarding_progress p
  WHERE p.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_onboarding_step_complete TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_onboarding_progress TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '✅ COMPLETE FIX APPLIED SUCCESSFULLY' as status;

-- Verify column exists
SELECT
  column_name,
  data_type,
  '✅' as status
FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('points_balance', 'points')
ORDER BY column_name;

-- Verify functions exist
SELECT
  routine_name,
  '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_name IN ('mark_onboarding_step_complete', 'get_user_onboarding_progress', 'award_signup_bonus')
ORDER BY routine_name;
```

## Test After Fix

1. **Refresh your app** (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. **Check console** - The 404 errors should be gone
3. **View your profile** - Your balance should now show (100 points)
4. **Try onboarding** - Create a new test account and go through onboarding

## Expected Results

- ✅ No 404 errors in console
- ✅ Points balance shows in header/navbar
- ✅ Onboarding progress saves correctly
- ✅ Signup bonus still awards 100 points

## If Balance Still Doesn't Show

Check browser console for:
```
✅ MobileBottomNav: Points fetched: 100
```

If you see error instead, check:
1. RLS policies on users table
2. Your user session (try logout/login)

## Summary

**Root Causes**:
1. Missing database functions for onboarding system
2. Column name mismatch: database has `points`, frontend expects `points_balance`

**Solutions**:
1. Run the complete fix SQL above
2. Refresh app
3. Done!
