-- Remove the daily/₦200-₦300 plan from subscription options.
-- Deactivating (not deleting) preserves historical records for users
-- who previously purchased this plan.

UPDATE subscription_plans
SET is_active = false
WHERE name = 'daily';

DO $$
BEGIN
  RAISE NOTICE 'Daily plan deactivated — existing subscribers unaffected, plan hidden from new purchases.';
END $$;
