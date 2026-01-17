-- Add points column to users table

-- 1. Add points column if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;

-- 2. Add index for faster queries on points
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC);

-- 3. Add constraint to ensure points are never negative
ALTER TABLE users
ADD CONSTRAINT IF NOT EXISTS check_points_non_negative CHECK (points >= 0);

-- 4. Update existing users to have 0 points if NULL
UPDATE users
SET points = 0
WHERE points IS NULL;

-- 5. Verify the column was added
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name = 'points';

SELECT '✅ Points column added successfully!' as status;

-- Show sample of users with points
SELECT
    'Sample Users:' as info,
    id,
    username,
    email,
    points,
    created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;
