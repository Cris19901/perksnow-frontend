-- Fix activity trigger to bypass RLS
-- The trigger function needs to insert activities regardless of RLS policies
-- Date: 2026-01-24

-- Add a policy to allow the trigger function to insert activities
CREATE POLICY "Allow trigger to insert activities"
  ON activities
  FOR INSERT
  WITH CHECK (true);

-- Ensure the trigger function uses SECURITY DEFINER (already set, but re-create for clarity)
CREATE OR REPLACE FUNCTION log_profile_activity()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log profile photo change
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url AND NEW.avatar_url IS NOT NULL THEN
    INSERT INTO activities (user_id, activity_type, content, image_url, metadata)
    VALUES (
      NEW.id,
      'profile_update',
      'Updated profile picture',
      NEW.avatar_url,
      jsonb_build_object('old_avatar', OLD.avatar_url, 'new_avatar', NEW.avatar_url)
    );

    RAISE NOTICE '✅ Activity created: User % updated profile picture', NEW.id;
  END IF;

  -- Log cover photo change
  IF NEW.cover_image_url IS DISTINCT FROM OLD.cover_image_url AND NEW.cover_image_url IS NOT NULL THEN
    INSERT INTO activities (user_id, activity_type, content, image_url, metadata)
    VALUES (
      NEW.id,
      'cover_update',
      'Updated cover photo',
      NEW.cover_image_url,
      jsonb_build_object('old_cover', OLD.cover_image_url, 'new_cover', NEW.cover_image_url)
    );

    RAISE NOTICE '✅ Activity created: User % updated cover photo', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Activity trigger permissions fixed - trigger can now bypass RLS';
END $$;
