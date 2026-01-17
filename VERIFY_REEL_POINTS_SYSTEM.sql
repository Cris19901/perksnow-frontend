-- ============================================================================
-- VERIFY REEL POINTS SYSTEM
-- Check if points for reel views are already installed
-- ============================================================================

-- Check if reel views trigger exists
SELECT
    trigger_name,
    event_object_table,
    action_statement,
    '✅ Active' as status
FROM information_schema.triggers
WHERE trigger_name LIKE '%reel%'
AND trigger_name LIKE '%view%'
ORDER BY trigger_name;

-- Check if award_points_for_reel_views function exists
SELECT
    routine_name,
    routine_type,
    '✅ Exists' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'award_points_for_reel_views';

-- Check how many reel view rewards have been given
SELECT
    COUNT(*) as total_reel_view_rewards,
    SUM(points) as total_points_awarded
FROM points_transactions
WHERE source = 'reel_views_milestone';

-- Show recent reel view rewards
SELECT
    pt.user_id,
    u.username,
    pt.points,
    pt.description,
    pt.created_at
FROM points_transactions pt
JOIN users u ON u.id = pt.user_id
WHERE pt.source = 'reel_views_milestone'
ORDER BY pt.created_at DESC
LIMIT 10;

-- Summary
DO $$
DECLARE
    trigger_exists BOOLEAN;
    function_exists BOOLEAN;
BEGIN
    -- Check trigger
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name LIKE '%reel%view%'
    ) INTO trigger_exists;

    -- Check function
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'award_points_for_reel_views'
    ) INTO function_exists;

    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 REEL VIEWS POINTS SYSTEM STATUS';
    RAISE NOTICE '========================================';

    IF trigger_exists AND function_exists THEN
        RAISE NOTICE '✅ Reel views points system is INSTALLED';
        RAISE NOTICE '✅ Users earn points at view milestones:';
        RAISE NOTICE '   • 100 views = 50 points';
        RAISE NOTICE '   • 500 views = 100 points';
        RAISE NOTICE '   • 1,000 views = 200 points';
        RAISE NOTICE '   • 5,000 views = 500 points';
        RAISE NOTICE '   • 10,000 views = 1,000 points';
    ELSE
        RAISE NOTICE '❌ Reel views points system NOT installed';
        RAISE NOTICE '💡 Run create-reels-system.sql to install';
    END IF;

    RAISE NOTICE '========================================';
END $$;
