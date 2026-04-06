-- Create auth credentials for the lavlay_news bot so it can be logged into
-- Password: LavLayBot@2026! (change after first login via Supabase dashboard)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_bot_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  -- Only insert into auth.users if not already there
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_bot_id) THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud
    ) VALUES (
      v_bot_id,
      '00000000-0000-0000-0000-000000000000',
      'bot-news@lavlay.app',
      extensions.crypt('LavLayBot@2026!', extensions.gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"username":"lavlay_news"}',
      FALSE,
      'authenticated',
      'authenticated'
    );
    RAISE NOTICE 'Bot auth user created: bot-news@lavlay.app';
  ELSE
    RAISE NOTICE 'Bot auth user already exists, skipping';
  END IF;
END $$;
