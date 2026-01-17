-- Alternative approach: Disable Supabase's automatic user profile creation
-- Then your app code will handle it

-- This tells Supabase NOT to automatically create users in public.users
-- Your app's upsert will handle it instead

-- 1. Drop any existing trigger that might be failing
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop the function too
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. Verify triggers are gone
SELECT
    '✅ Auto user creation disabled' as status,
    COUNT(*) as remaining_triggers
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- 4. Make sure INSERT policy allows your app to insert
-- (We already added this, but let's verify)
SELECT
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'INSERT';

SELECT '🎉 Now your app will handle user creation via upsert. Try signup again!' as message;
