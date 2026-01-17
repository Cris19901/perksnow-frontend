-- Check current policies on users table

SELECT
    policyname,
    cmd,
    roles,
    CASE
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;
