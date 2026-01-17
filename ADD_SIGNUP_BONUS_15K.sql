-- ============================================================================
-- ADD 15,000 POINT SIGNUP BONUS
-- Awards 15,000 withdrawable points to new users on signup
-- ============================================================================

-- Create function to award signup bonus
CREATE OR REPLACE FUNCTION award_signup_bonus()
RETURNS TRIGGER AS $$
BEGIN
  -- Add 15,000 points to user's balance
  UPDATE users
  SET balance = balance + 15000
  WHERE id = NEW.id;

  -- Record the bonus in points_transactions for tracking
  INSERT INTO points_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    status
  ) VALUES (
    NEW.id,
    15000,
    'signup_bonus',
    'Welcome bonus: 15,000 free withdrawable points',
    'completed'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to award signup bonus: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to award bonus on user signup
DROP TRIGGER IF EXISTS trigger_award_signup_bonus ON users;
CREATE TRIGGER trigger_award_signup_bonus
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION award_signup_bonus();

-- Grant permissions
GRANT EXECUTE ON FUNCTION award_signup_bonus TO authenticated, anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check trigger exists
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'trigger_award_signup_bonus';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Signup Bonus - CONFIGURED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'New users will receive:';
  RAISE NOTICE '  • 15,000 bonus points';
  RAISE NOTICE '  • Fully withdrawable';
  RAISE NOTICE '  • Added automatically on signup';
  RAISE NOTICE '  • Tracked in points_transactions';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Welcome email updated to highlight bonus!';
  RAISE NOTICE '========================================';
END $$;
