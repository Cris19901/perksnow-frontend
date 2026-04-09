-- Fix RSS bot: ensure the public users table has a row for the bot account
-- that matches whatever UUID auth.users assigned to bot-news@lavlay.app.
-- This handles the case where the bot was re-registered through the UI signup,
-- which created a new UUID different from a0000000-0000-0000-0000-000000000001.

-- Step 1: Find the real auth UUID for the bot email
DO $$
DECLARE
  v_bot_id UUID;
  v_old_bot_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  -- Get the UUID from auth.users for bot-news@lavlay.app
  SELECT id INTO v_bot_id
  FROM auth.users
  WHERE email = 'bot-news@lavlay.app'
  ORDER BY created_at DESC  -- if multiple, take newest
  LIMIT 1;

  IF v_bot_id IS NULL THEN
    RAISE NOTICE 'Bot email not found in auth.users — nothing to do';
    RETURN;
  END IF;

  RAISE NOTICE 'Bot auth UUID: %', v_bot_id;

  -- Step 2: Ensure public users row exists for this UUID
  INSERT INTO public.users (
    id, email, username, full_name, role, subscription_tier,
    points_balance, wallet_balance, has_ever_subscribed, onboarding_completed
  )
  VALUES (
    v_bot_id,
    'bot-news@lavlay.app',
    'lavlay_news',
    'LavLay News',
    'user',
    'pro',
    0, 0, true, true
  )
  ON CONFLICT (id) DO UPDATE SET
    username = 'lavlay_news',
    full_name = 'LavLay News';

  -- Step 3: Also upsert by email in case there's a duplicate with old UUID
  -- Remove any old bot row with the hardcoded UUID if the real UUID differs
  IF v_bot_id <> v_old_bot_id THEN
    -- Reassign posts from old UUID to new UUID
    UPDATE posts SET user_id = v_bot_id WHERE user_id = v_old_bot_id;
    UPDATE reels SET user_id = v_bot_id WHERE user_id = v_old_bot_id;
    UPDATE rss_posted_articles SET user_id = v_bot_id WHERE user_id = v_old_bot_id;
    -- Delete old placeholder row
    DELETE FROM public.users WHERE id = v_old_bot_id;
    RAISE NOTICE 'Migrated posts from old bot UUID % to new UUID %', v_old_bot_id, v_bot_id;
  END IF;

  -- Step 4: Update the RSS_BOT_USER_ID app setting so edge function can read it
  -- (The edge function reads from env secret RSS_BOT_USER_ID; we'll update via CLI)
  RAISE NOTICE 'Action required: run supabase secrets set RSS_BOT_USER_ID=% --project-ref kswknblwjlkgxgvypkmo', v_bot_id;

END $$;
