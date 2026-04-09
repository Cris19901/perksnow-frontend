-- Find what triggers exist on posts table and drop any that touch notifications
-- with old "message" column reference

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'posts'
    ORDER BY trigger_name
  LOOP
    RAISE NOTICE 'TRIGGER on posts: % (%) => %', r.trigger_name, r.event_manipulation, LEFT(r.action_statement, 120);
  END LOOP;
END $$;

-- Also check what triggers exist on the notifications table itself
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'notifications'
    ORDER BY trigger_name
  LOOP
    RAISE NOTICE 'TRIGGER on notifications: % (%)', r.trigger_name, r.event_manipulation;
  END LOOP;
END $$;
