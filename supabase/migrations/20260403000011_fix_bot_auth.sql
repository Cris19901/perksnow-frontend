-- Fix bot auth.users entry — previous insert was missing required NOT NULL columns
-- that newer Supabase GoTrue versions require (is_sso_user, confirmation_token, etc.)

DO $$
DECLARE
  v_bot_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  -- Remove the incomplete auth entry so we can re-insert correctly
  DELETE FROM auth.users WHERE id = v_bot_id;

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    is_sso_user,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    created_at,
    updated_at,
    deleted_at
  ) VALUES (
    v_bot_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'bot-news@lavlay.app',
    extensions.crypt('LavLayBot@2026!', extensions.gen_salt('bf')),
    now(),                            -- email_confirmed_at (pre-confirmed)
    NULL,                             -- invited_at
    '',                               -- confirmation_token
    NULL,                             -- confirmation_sent_at
    '',                               -- recovery_token
    NULL,                             -- recovery_sent_at
    '',                               -- email_change_token_new
    '',                               -- email_change
    NULL,                             -- email_change_sent_at
    '',                               -- email_change_token_current
    0,                                -- email_change_confirm_status
    NULL,                             -- last_sign_in_at
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"lavlay_news"}'::jsonb,
    FALSE,                            -- is_super_admin
    FALSE,                            -- is_sso_user (required NOT NULL in GoTrue v2)
    NULL,                             -- phone
    NULL,                             -- phone_confirmed_at
    '',                               -- phone_change
    '',                               -- phone_change_token
    NULL,                             -- phone_change_sent_at
    NULL,                             -- banned_until
    '',                               -- reauthentication_token
    NULL,                             -- reauthentication_sent_at
    now(),
    now(),
    NULL                              -- deleted_at
  );

  RAISE NOTICE 'Bot auth user re-created successfully: bot-news@lavlay.app';
END $$;
