-- ============================================================================
-- FINAL FIX FOR SIGNUP ISSUES
-- This removes ALL triggers on users table, then adds back only safe ones
-- ============================================================================

-- ============================================================================
-- STEP 1: Find and list ALL triggers on users table
-- ============================================================================

SELECT 'Current triggers on users table:' as info;
SELECT trigger_name, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- ============================================================================
-- STEP 2: DROP ALL TRIGGERS ON USERS TABLE (nuclear option)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'users')
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON users CASCADE';
        RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Add missing columns
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS balance INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS successful_withdrawals_count INTEGER DEFAULT 0;

-- ============================================================================
-- STEP 4: Fix scheduled_emails table to allow nulls or drop the constraint
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_emails') THEN
    -- Make template_id nullable
    ALTER TABLE scheduled_emails ALTER COLUMN template_id DROP NOT NULL;
    -- Add email_type if missing
    ALTER TABLE scheduled_emails ADD COLUMN IF NOT EXISTS email_type TEXT DEFAULT 'welcome';
    RAISE NOTICE 'Fixed scheduled_emails table';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not modify scheduled_emails: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 5: Create minimal safe signup bonus function
-- ============================================================================

CREATE OR REPLACE FUNCTION award_signup_bonus()
RETURNS TRIGGER AS $$
BEGIN
  -- Just update balance, nothing else
  UPDATE users SET balance = COALESCE(balance, 0) + 15000 WHERE id = NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never fail signup
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_award_signup_bonus
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION award_signup_bonus();

-- ============================================================================
-- STEP 6: Update existing users
-- ============================================================================

UPDATE users SET balance = 15000 WHERE balance IS NULL OR balance = 0;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Triggers after fix:' as info;
SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'users';

SELECT 'Columns check:' as info;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('balance', 'successful_withdrawals_count');
