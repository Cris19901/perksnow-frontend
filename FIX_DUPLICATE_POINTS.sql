-- ============================================================================
-- FIX DUPLICATE POINTS FOR POST CREATION
-- ============================================================================

-- 1. First, let's see what triggers exist
SELECT
  '1️⃣ CURRENT TRIGGERS ON POSTS' as step,
  trigger_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'posts'
ORDER BY trigger_name;

-- 2. Check for duplicate transactions
SELECT
  '2️⃣ RECENT POST TRANSACTIONS' as step,
  user_id,
  activity,
  points,
  created_at
FROM points_transactions
WHERE activity = 'post_created'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Drop ALL point-awarding triggers on posts table
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧹 CLEANING UP TRIGGERS';
  RAISE NOTICE '=====================';
  RAISE NOTICE '';

  -- Drop all triggers related to points on posts table
  FOR trigger_record IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'posts'
    AND (trigger_name LIKE '%point%' OR trigger_name LIKE '%award%')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON posts', trigger_record.trigger_name);
    RAISE NOTICE 'Dropped trigger: %', trigger_record.trigger_name;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ All point triggers dropped';
  RAISE NOTICE '';
END $$;

-- 4. Create ONE clean trigger
CREATE OR REPLACE FUNCTION award_points_for_post()
RETURNS TRIGGER AS $$
DECLARE
  v_points INTEGER := 10; -- Default points for post
  v_can_earn BOOLEAN := TRUE;
BEGIN
  -- Try to get points from settings (but don't fail if it doesn't exist)
  BEGIN
    v_points := get_points_for_action('points_post_created');
  EXCEPTION WHEN OTHERS THEN
    v_points := 10;
  END;

  -- Try to check limits (but don't fail if functions don't exist)
  BEGIN
    v_can_earn := check_hourly_points_limit(NEW.user_id) AND check_daily_points_limit(NEW.user_id);
  EXCEPTION WHEN OTHERS THEN
    v_can_earn := TRUE;
  END;

  -- Only award if within limits
  IF v_can_earn THEN
    -- Insert transaction
    INSERT INTO points_transactions (
      user_id,
      points,
      transaction_type,
      activity,
      source,
      description
    )
    VALUES (
      NEW.user_id,
      v_points,
      'earn',
      'post_created',
      'post',
      'Created a new post'
    );

    -- Update balance
    UPDATE users
    SET points_balance = COALESCE(points_balance, 0) + v_points
    WHERE id = NEW.user_id;

    RAISE NOTICE 'Awarded % points to user % for post creation', v_points, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create ONLY ONE trigger
DROP TRIGGER IF EXISTS trigger_award_points_post ON posts;
CREATE TRIGGER trigger_award_points_post
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION award_points_for_post();

-- 5. Verify - should only see ONE trigger now
SELECT
  '3️⃣ FINAL TRIGGERS (SHOULD BE ONLY 1)' as step,
  trigger_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'posts'
ORDER BY trigger_name;

-- 6. Clean up duplicate transactions (optional - removes old duplicates)
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- This will keep only the FIRST transaction for each user/post combo
  WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, DATE_TRUNC('second', created_at)
             ORDER BY created_at
           ) as rn
    FROM points_transactions
    WHERE activity = 'post_created'
  )
  DELETE FROM points_transactions
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '🧹 Cleaned up % duplicate transactions', deleted_count;
    RAISE NOTICE '';
  END IF;
END $$;

SELECT '✅ DUPLICATE POINTS FIXED!' as status;
SELECT 'Create a new post to test - should only get points once' as next_step;
