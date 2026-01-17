-- Simple fix: Just enable RLS on posts table
-- The policies already exist, we just need to turn on RLS

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Verify it's enabled
SELECT
    tablename,
    CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'posts';

-- Show existing policies
SELECT
    policyname,
    cmd as operation
FROM pg_policies
WHERE tablename = 'posts';
