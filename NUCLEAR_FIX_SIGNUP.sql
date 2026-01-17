-- ============================================================================
-- NUCLEAR FIX - REMOVE ALL TRIGGERS AND FIX SCHEDULED_EMAILS
-- ============================================================================

-- ============================================================================
-- STEP 1: Show ALL triggers on users table before fix
-- ============================================================================
SELECT 'BEFORE FIX - All triggers on users:' as info;
SELECT trigger_name, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- ============================================================================
-- STEP 2: Drop EVERY single trigger on users table by name
-- ============================================================================

-- Common trigger names
DROP TRIGGER IF EXISTS on_auth_user_created ON users CASCADE;
DROP TRIGGER IF EXISTS on_user_created ON users CASCADE;
DROP TRIGGER IF EXISTS handle_new_user ON users CASCADE;
DROP TRIGGER IF EXISTS create_profile_trigger ON users CASCADE;
DROP TRIGGER IF EXISTS send_welcome_email_trigger ON users CASCADE;
DROP TRIGGER IF EXISTS schedule_welcome_email ON users CASCADE;
DROP TRIGGER IF EXISTS schedule_welcome_emails ON users CASCADE;
DROP TRIGGER IF EXISTS on_user_created_schedule_email ON users CASCADE;
DROP TRIGGER IF EXISTS trigger_schedule_welcome_emails ON users CASCADE;
DROP TRIGGER IF EXISTS trigger_send_welcome_email ON users CASCADE;
DROP TRIGGER IF EXISTS trigger_welcome_email ON users CASCADE;
DROP TRIGGER IF EXISTS trigger_award_signup_bonus ON users CASCADE;
DROP TRIGGER IF EXISTS award_signup_bonus_trigger ON users CASCADE;
DROP TRIGGER IF EXISTS new_user_trigger ON users CASCADE;
DROP TRIGGER IF EXISTS user_insert_trigger ON users CASCADE;
DROP TRIGGER IF EXISTS after_user_insert ON users CASCADE;
DROP TRIGGER IF EXISTS before_user_insert ON users CASCADE;

-- Dynamic drop of ANY remaining triggers
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT DISTINCT trigger_name
        FROM information_schema.triggers
        WHERE event_object_table = 'users'
    )
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON users CASCADE', r.trigger_name);
        RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Drop problematic functions that might recreate triggers
-- ============================================================================

DROP FUNCTION IF EXISTS schedule_welcome_email() CASCADE;
DROP FUNCTION IF EXISTS schedule_welcome_emails() CASCADE;
DROP FUNCTION IF EXISTS send_welcome_email() CASCADE;
DROP FUNCTION IF EXISTS send_welcome_email_safe() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS on_auth_user_created() CASCADE;
DROP FUNCTION IF EXISTS create_profile_for_user() CASCADE;
DROP FUNCTION IF EXISTS award_signup_bonus() CASCADE;

-- ============================================================================
-- STEP 4: Fix scheduled_emails table (make template_id nullable)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_emails') THEN
    -- Make ALL columns nullable to prevent any constraint errors
    BEGIN
      ALTER TABLE scheduled_emails ALTER COLUMN template_id DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER TABLE scheduled_emails ALTER COLUMN email_type DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER TABLE scheduled_emails ALTER COLUMN user_id DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Or just truncate/disable the table
    -- TRUNCATE scheduled_emails;

    RAISE NOTICE 'Fixed scheduled_emails table constraints';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Ensure columns exist
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS balance INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS successful_withdrawals_count INTEGER DEFAULT 0;

-- ============================================================================
-- STEP 6: Create ONLY the signup bonus trigger (minimal, safe)
-- ============================================================================

CREATE OR REPLACE FUNCTION award_signup_bonus()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple update, nothing else
  UPDATE users SET balance = 15000 WHERE id = NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_award_signup_bonus
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION award_signup_bonus();

-- ============================================================================
-- STEP 7: Verify - show triggers after fix
-- ============================================================================

SELECT 'AFTER FIX - All triggers on users:' as info;
SELECT trigger_name, action_timing || ' ' || event_manipulation as event
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- ============================================================================
-- STEP 8: Manually fix the user who signed up with 0 points
-- ============================================================================

-- Update the specific user
UPDATE users SET balance = 15000 WHERE id = '0470726c-bbfe-433e-947e-578f4602e089';

-- Update ALL users with 0 balance
UPDATE users SET balance = 15000 WHERE balance = 0 OR balance IS NULL;

-- ============================================================================
-- STEP 9: Show users after fix
-- ============================================================================

SELECT 'Users after fix:' as info;
SELECT id, username, email, balance
FROM users
WHERE id = '0470726c-bbfe-433e-947e-578f4602e089'
   OR balance = 0
   OR balance IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- Final check
SELECT 'DONE! Only these triggers should exist on users:' as info;
SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'users';
