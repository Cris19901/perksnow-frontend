-- Grant admin privileges to fadiscojay@gmail.com
UPDATE users
SET is_admin = true
WHERE email = 'fadiscojay@gmail.com';

-- Verify the update
SELECT id, email, username, is_admin, created_at
FROM users
WHERE email = 'fadiscojay@gmail.com';
